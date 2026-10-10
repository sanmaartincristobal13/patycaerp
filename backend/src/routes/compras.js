// Compras de materiales y pagos a proveedores.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { noEncontrado, solicitudInvalida } = require('../lib/errores');
const { moverStockMaterial, registrarActividad } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

const SELECT_COMPRA = `
    SELECT c.*, u.nombre AS usuario,
           coalesce((
               SELECT json_agg(json_build_object(
                   'id', i.id, 'material_id', i.material_id, 'material_codigo', m.codigo,
                   'material', m.detalle, 'unidad', um.codigo, 'cantidad', i.cantidad,
                   'precio_unitario', i.precio_unitario, 'total', round(i.cantidad * i.precio_unitario)
               ) ORDER BY i.id)
               FROM compra_items i
               JOIN materiales m ON m.id = i.material_id
               JOIN unidades_medida um ON um.id = m.unidad_id
               WHERE i.compra_id = c.id
           ), '[]') AS items
    FROM v_compras c
    LEFT JOIN usuarios u ON u.id = c.usuario_id`;

async function obtenerCompra(client, id) {
    const { rows } = await client.query(`${SELECT_COMPRA} WHERE c.id = $1`, [id]);
    if (!rows[0]) throw noEncontrado('Compra');
    return rows[0];
}

// GET /api/compras?desde=&hasta=&estado_pago=&proveedor_id=
router.get('/', async (req, res) => {
    const filtros = [];
    const params = [];
    if (req.query.desde) { params.push(v.fecha(req.query.desde, 'desde')); filtros.push(`c.fecha >= $${params.length}`); }
    if (req.query.hasta) { params.push(v.fecha(req.query.hasta, 'hasta')); filtros.push(`c.fecha <= $${params.length}`); }
    if (req.query.estado_pago) { params.push(req.query.estado_pago); filtros.push(`c.estado_pago = $${params.length}`); }
    if (req.query.proveedor_id) { params.push(v.id(req.query.proveedor_id, 'proveedor_id')); filtros.push(`c.proveedor_id = $${params.length}`); }

    const { rows } = await query(
        `${SELECT_COMPRA} ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''} ORDER BY c.fecha DESC, c.id DESC`,
        params
    );
    res.json(rows);
});

// Precios históricos previos al sistema (referencia para cotizar con proveedores).
router.get('/referencia', async (req, res) => {
    const { rows } = await query(
        `SELECT r.*, p.nombre AS proveedor, m.detalle AS material, u.codigo AS unidad,
                round(r.cantidad * r.precio_unitario) AS total
         FROM compras_referencia r
         JOIN proveedores p ON p.id = r.proveedor_id
         JOIN materiales m ON m.id = r.material_id
         JOIN unidades_medida u ON u.id = m.unidad_id
         ORDER BY p.nombre, m.detalle`
    );
    res.json(rows);
});

router.get('/:id', async (req, res) => {
    res.json(await obtenerCompra({ query }, v.id(req.params.id)));
});

function leerPago(b) {
    return {
        fecha: v.fecha(b.fecha),
        monto: v.numero(b.monto, 'monto', { min: 1, entero: true }),
        medio_pago_id: v.id(b.medio_pago_id, 'medio_pago_id'),
        observacion: v.texto(b.observacion, 'observacion', { requerido: false }),
    };
}

async function registrarPago(client, usuarioId, compraId, pago) {
    await client.query('SELECT id FROM compras WHERE id = $1 FOR UPDATE', [compraId]);
    const { rows } = await client.query('SELECT codigo, saldo_pendiente FROM v_compras WHERE id = $1', [compraId]);
    if (!rows[0]) throw noEncontrado('Compra');
    if (pago.monto > rows[0].saldo_pendiente) {
        throw solicitudInvalida(`El pago supera el saldo pendiente (${rows[0].saldo_pendiente}).`);
    }
    const { rows: creado } = await client.query(
        `INSERT INTO pagos_compra (compra_id, fecha, monto, medio_pago_id, observacion, usuario_id)
         VALUES ($1, coalesce($2::date, current_date), $3, $4, $5, $6) RETURNING codigo`,
        [compraId, pago.fecha, pago.monto, pago.medio_pago_id, pago.observacion, usuarioId]
    );
    await registrarActividad(client, usuarioId, 'Compras', 'Pago',
        `Pago ${creado[0].codigo} de ${pago.monto} a compra ${rows[0].codigo}`, rows[0].codigo);
}

// POST /api/compras
// { fecha?, proveedor_id, documento?, vencimiento?,
//   items: [{material_id, cantidad, precio_unitario}],
//   pago_inicial?: {monto, medio_pago_id} }
// Suma el stock de cada material y actualiza su último precio y proveedor.
router.post('/', async (req, res) => {
    const b = req.body;
    const fecha = v.fecha(b.fecha);
    const proveedorId = v.id(b.proveedor_id, 'proveedor_id');
    const items = v.lista(b.items, 'items').map(i => ({
        material_id: v.id(i.material_id, 'material_id'),
        cantidad: v.numero(i.cantidad, 'cantidad', { min: 0.001 }),
        precio_unitario: v.numero(i.precio_unitario, 'precio_unitario', { min: 0 }),
    }));
    const pagoInicial = b.pago_inicial?.monto ? leerPago({ ...b.pago_inicial, fecha: b.fecha }) : null;

    const compra = await transaccion(async client => {
        const { rows } = await client.query(
            `INSERT INTO compras (fecha, proveedor_id, documento, vencimiento, usuario_id)
             VALUES (coalesce($1::date, current_date), $2, $3, $4, $5) RETURNING id, codigo`,
            [fecha, proveedorId, v.texto(b.documento, 'documento', { requerido: false }),
             v.fecha(b.vencimiento, 'vencimiento'), req.usuario.id]
        );
        const { id, codigo } = rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO compra_items (compra_id, material_id, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [id, item.material_id, item.cantidad, item.precio_unitario]
            );
            await moverStockMaterial(client, {
                materialId: item.material_id, delta: item.cantidad,
                tipo: 'Entrada por compra', referencia: codigo, usuarioId: req.usuario.id,
            });
            await client.query(
                'UPDATE materiales SET ultimo_precio = $2, proveedor_id = $3 WHERE id = $1',
                [item.material_id, item.precio_unitario, proveedorId]
            );
        }

        if (pagoInicial) {
            await registrarPago(client, req.usuario.id, id, { ...pagoInicial, observacion: 'Pago inicial' });
        }
        await registrarActividad(client, req.usuario.id, 'Compras', 'Crear', `Compra ${codigo} registrada`, codigo);
        return obtenerCompra(client, id);
    });
    res.status(201).json(compra);
});

router.get('/:id/pagos', async (req, res) => {
    const { rows } = await query(
        `SELECT p.*, m.nombre AS medio_pago, u.nombre AS usuario
         FROM pagos_compra p
         JOIN medios_pago m ON m.id = p.medio_pago_id
         LEFT JOIN usuarios u ON u.id = p.usuario_id
         WHERE p.compra_id = $1 ORDER BY p.fecha, p.id`,
        [v.id(req.params.id)]
    );
    res.json(rows);
});

// POST /api/compras/:id/pagos  { fecha?, monto, medio_pago_id, observacion? }
router.post('/:id/pagos', async (req, res) => {
    const id = v.id(req.params.id);
    const pago = leerPago(req.body);
    const compra = await transaccion(async client => {
        await registrarPago(client, req.usuario.id, id, pago);
        return obtenerCompra(client, id);
    });
    res.status(201).json(compra);
});

module.exports = router;
