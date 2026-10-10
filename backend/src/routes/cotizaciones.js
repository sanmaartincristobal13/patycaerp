// Cotizaciones y su conversión a venta.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { noEncontrado, solicitudInvalida, HttpError } = require('../lib/errores');
const { registrarActividad } = require('../lib/registro');
const { crearVenta } = require('./ventas');
const v = require('../lib/validar');

const router = Router();

const ESTADOS = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'];

const SELECT_COTIZACION = `
    SELECT c.*, u.nombre AS usuario,
           coalesce((SELECT json_agg(codigo ORDER BY id) FROM ventas WHERE cotizacion_id = c.id), '[]') AS ventas_generadas,
           coalesce((
               SELECT json_agg(json_build_object(
                   'id', i.id, 'producto_id', i.producto_id, 'producto', p.nombre,
                   'establecimiento', e.nombre, 'talla', i.talla, 'cantidad', i.cantidad,
                   'precio_unitario', i.precio_unitario, 'total', i.cantidad * i.precio_unitario
               ) ORDER BY i.id)
               FROM cotizacion_items i
               JOIN productos p ON p.id = i.producto_id
               JOIN establecimientos e ON e.id = p.establecimiento_id
               WHERE i.cotizacion_id = c.id
           ), '[]') AS items
    FROM v_cotizaciones c
    LEFT JOIN usuarios u ON u.id = c.usuario_id`;

async function obtenerCotizacion(client, id) {
    const { rows } = await client.query(`${SELECT_COTIZACION} WHERE c.id = $1`, [id]);
    if (!rows[0]) throw noEncontrado('Cotización');
    return rows[0];
}

// Una cotización que ya generó venta queda bloqueada.
function exigirEditable(cotizacion) {
    if (cotizacion.ventas_generadas.length) {
        throw new HttpError(409, `La cotización ${cotizacion.codigo} ya generó una venta y no se puede modificar.`);
    }
}

router.get('/', async (req, res) => {
    const filtros = [];
    const params = [];
    if (req.query.estado) { params.push(req.query.estado); filtros.push(`c.estado = $${params.length}`); }
    const { rows } = await query(
        `${SELECT_COTIZACION} ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''} ORDER BY c.fecha DESC, c.id DESC`,
        params
    );
    res.json(rows);
});

router.get('/:id', async (req, res) => {
    res.json(await obtenerCotizacion({ query }, v.id(req.params.id)));
});

function leerCotizacion(b) {
    return {
        fecha: v.fecha(b.fecha),
        referencia: v.texto(b.referencia, 'referencia'),
        descuento: v.numero(b.descuento, 'descuento', { requerido: false, min: 0, entero: true }) ?? 0,
        observacion: v.texto(b.observacion, 'observacion', { requerido: false }),
        items: v.lista(b.items, 'items').map(i => ({
            producto_id: v.id(i.producto_id, 'producto_id'),
            talla: v.texto(String(i.talla ?? ''), 'talla'),
            cantidad: v.numero(i.cantidad, 'cantidad', { min: 1, entero: true }),
            precio_unitario: v.numero(i.precio_unitario, 'precio_unitario', { requerido: false, min: 0, entero: true }),
        })),
    };
}

async function guardarItems(client, cotizacionId, items) {
    await client.query('DELETE FROM cotizacion_items WHERE cotizacion_id = $1', [cotizacionId]);
    for (const i of items) {
        // Sin precio indicado se usa el de la lista de precios.
        const { rowCount } = await client.query(
            `INSERT INTO cotizacion_items (cotizacion_id, producto_id, talla, cantidad, precio_unitario)
             SELECT $1, producto_id, talla, $4, coalesce($5, precio)
             FROM producto_tallas WHERE producto_id = $2 AND talla = $3`,
            [cotizacionId, i.producto_id, i.talla, i.cantidad, i.precio_unitario]
        );
        if (!rowCount) throw solicitudInvalida(`El producto ${i.producto_id} no tiene la talla ${i.talla}.`);
    }
}

// POST /api/cotizaciones
// { fecha?, referencia, descuento?, observacion?, items: [{producto_id, talla, cantidad, precio_unitario?}] }
router.post('/', async (req, res) => {
    const d = leerCotizacion(req.body);
    const cotizacion = await transaccion(async client => {
        const { rows } = await client.query(
            `INSERT INTO cotizaciones (fecha, referencia, descuento, observacion, usuario_id)
             VALUES (coalesce($1::date, current_date), $2, $3, $4, $5) RETURNING id, codigo`,
            [d.fecha, d.referencia, d.descuento, d.observacion, req.usuario.id]
        );
        await guardarItems(client, rows[0].id, d.items);
        await registrarActividad(client, req.usuario.id, 'Cotizaciones', 'Crear',
            `Cotización ${rows[0].codigo} creada para ${d.referencia}`, rows[0].codigo);
        return obtenerCotizacion(client, rows[0].id);
    });
    res.status(201).json(cotizacion);
});

router.put('/:id', async (req, res) => {
    const id = v.id(req.params.id);
    const d = leerCotizacion(req.body);
    const cotizacion = await transaccion(async client => {
        exigirEditable(await obtenerCotizacion(client, id));
        await client.query(
            `UPDATE cotizaciones SET fecha = coalesce($2::date, fecha), referencia = $3, descuento = $4, observacion = $5
             WHERE id = $1`,
            [id, d.fecha, d.referencia, d.descuento, d.observacion]
        );
        await guardarItems(client, id, d.items);
        return obtenerCotizacion(client, id);
    });
    res.json(cotizacion);
});

// PATCH /api/cotizaciones/:id/estado  { estado }
router.patch('/:id/estado', async (req, res) => {
    const id = v.id(req.params.id);
    const estado = req.body.estado;
    if (!ESTADOS.includes(estado)) throw solicitudInvalida(`Estado inválido. Use: ${ESTADOS.join(', ')}.`);

    const cotizacion = await transaccion(async client => {
        const actual = await obtenerCotizacion(client, id);
        exigirEditable(actual);
        await client.query(
            `UPDATE cotizaciones SET estado = $2,
                    fecha_aceptacion = CASE WHEN $2 = 'Aceptada' THEN current_date ELSE NULL END
             WHERE id = $1`,
            [id, estado]
        );
        await registrarActividad(client, req.usuario.id, 'Cotizaciones', 'Estado',
            `Cotización ${actual.codigo}: ${actual.estado} → ${estado}`, actual.codigo);
        return obtenerCotizacion(client, id);
    });
    res.json(cotizacion);
});

// POST /api/cotizaciones/:id/venta  { pago_inicial?: {monto, medio_pago_id} }
// Convierte una cotización aceptada en UNA venta con todos sus ítems.
router.post('/:id/venta', async (req, res) => {
    const id = v.id(req.params.id);
    const venta = await transaccion(async client => {
        await client.query('SELECT id FROM cotizaciones WHERE id = $1 FOR UPDATE', [id]);
        const cot = await obtenerCotizacion(client, id);
        exigirEditable(cot);
        if (cot.estado !== 'Aceptada') {
            throw new HttpError(409, 'Solo una cotización Aceptada puede convertirse en venta.');
        }
        const pago = req.body?.pago_inicial;
        const ventaId = await crearVenta(client, req.usuario.id, {
            fecha: null,
            descuento: cot.descuento,
            observacion: `Generada desde ${cot.codigo}`,
            items: cot.items,
            cotizacionId: id,
            pagoInicial: pago?.monto
                ? { monto: v.numero(pago.monto, 'monto', { min: 1, entero: true }), medio_pago_id: v.id(pago.medio_pago_id, 'medio_pago_id') }
                : null,
        });
        const { rows } = await client.query('SELECT * FROM v_ventas WHERE id = $1', [ventaId]);
        return rows[0];
    });
    res.status(201).json(venta);
});

router.delete('/:id', async (req, res) => {
    const id = v.id(req.params.id);
    await transaccion(async client => {
        const cot = await obtenerCotizacion(client, id);
        exigirEditable(cot);
        await client.query('DELETE FROM cotizaciones WHERE id = $1', [id]);
        await registrarActividad(client, req.usuario.id, 'Cotizaciones', 'Eliminar', `Cotización ${cot.codigo} eliminada`, cot.codigo);
    });
    res.status(204).end();
});

module.exports = router;
