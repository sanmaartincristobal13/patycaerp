// Ventas, sus ítems y la cobranza (pagos de clientes).
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { noEncontrado, solicitudInvalida, HttpError } = require('../lib/errores');
const { moverStockPrenda, registrarActividad } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

const SELECT_VENTA = `
    SELECT v.*, u.nombre AS usuario, c.codigo AS cotizacion_codigo,
           coalesce((
               SELECT json_agg(json_build_object(
                   'id', i.id, 'producto_id', i.producto_id, 'producto', p.nombre,
                   'establecimiento', e.nombre, 'talla', i.talla, 'cantidad', i.cantidad,
                   'precio_unitario', i.precio_unitario, 'total', i.cantidad * i.precio_unitario,
                   'stock', coalesce(sp.stock, 0), 'reservada', i.cantidad_reservada,
                   -- Última orden de taller creada para esta prenda del encargo
                   'orden', (SELECT json_build_object('id', o.id, 'codigo', o.codigo, 'estado', o.estado, 'fecha_entrega', o.fecha_entrega)
                             FROM ordenes_produccion o
                             WHERE o.venta_id = v.id AND o.producto_id = i.producto_id AND o.talla = i.talla
                             ORDER BY o.id DESC LIMIT 1)
               ) ORDER BY i.id)
               FROM venta_items i
               JOIN productos p ON p.id = i.producto_id
               JOIN establecimientos e ON e.id = p.establecimiento_id
               LEFT JOIN stock_prendas sp ON sp.producto_id = i.producto_id AND sp.talla = i.talla
               WHERE i.venta_id = v.id
           ), '[]') AS items,
           -- Encargo listo para retirar: todas sus prendas ya están reservadas.
           (v.estado_entrega = 'Por entregar' AND NOT EXISTS (
               SELECT 1 FROM venta_items i WHERE i.venta_id = v.id AND i.cantidad_reservada < i.cantidad
           )) AS listo_para_entregar
    FROM v_ventas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN cotizaciones c ON c.id = v.cotizacion_id`;

async function obtenerVenta(client, id) {
    const { rows } = await client.query(`${SELECT_VENTA} WHERE v.id = $1`, [id]);
    if (!rows[0]) throw noEncontrado('Venta');
    return rows[0];
}

// GET /api/ventas?desde=&hasta=&estado_pago=&estado_entrega=
router.get('/', async (req, res) => {
    const filtros = [];
    const params = [];
    if (req.query.desde) { params.push(v.fecha(req.query.desde, 'desde')); filtros.push(`v.fecha >= $${params.length}`); }
    if (req.query.hasta) { params.push(v.fecha(req.query.hasta, 'hasta')); filtros.push(`v.fecha <= $${params.length}`); }
    if (req.query.estado_pago) { params.push(req.query.estado_pago); filtros.push(`v.estado_pago = $${params.length}`); }
    if (req.query.estado_entrega) { params.push(req.query.estado_entrega); filtros.push(`v.estado_entrega = $${params.length}`); }
    if (req.query.estado_entrega) { params.push(req.query.estado_entrega); filtros.push(`v.estado_entrega = $${params.length}`); }

    const { rows } = await query(
        `${SELECT_VENTA} ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''} ORDER BY v.fecha DESC, v.id DESC`,
        params
    );
    res.json(rows);
});

router.get('/:id', async (req, res) => {
    res.json(await obtenerVenta({ query }, v.id(req.params.id)));
});

// Descuenta del stock las prendas de una venta (al vender o al entregar un encargo).
async function descontarStock(client, usuarioId, venta, items) {
    for (const item of items) {
        await moverStockPrenda(client, {
            productoId: item.producto_id, talla: item.talla, delta: -item.cantidad,
            tipo: 'Salida por venta', referencia: venta.codigo, usuarioId,
        });
    }
}

// Reserva para un ítem de encargo hasta "maximo" prendas del stock disponible:
// las descuenta del stock (kárdex "Reserva de encargo") y las aparta para el cliente.
// Devuelve cuántas reservó. La usa también Producción al terminar una orden del encargo.
async function reservarEnEncargo(client, usuarioId, { itemId, maximo }) {
    const { rows: [it] } = await client.query(
        `SELECT i.id, i.producto_id, i.talla, i.cantidad, i.cantidad_reservada, v.codigo, coalesce(sp.stock, 0) AS stock
         FROM venta_items i
         JOIN ventas v ON v.id = i.venta_id
         LEFT JOIN stock_prendas sp ON sp.producto_id = i.producto_id AND sp.talla = i.talla
         WHERE i.id = $1 FOR UPDATE OF i`,
        [itemId]
    );
    const reservar = Math.min(maximo, it.cantidad - it.cantidad_reservada, Math.max(0, it.stock));
    if (reservar <= 0) return 0;
    await moverStockPrenda(client, {
        productoId: it.producto_id, talla: it.talla, delta: -reservar,
        tipo: 'Reserva de encargo', referencia: it.codigo, usuarioId,
    });
    await client.query('UPDATE venta_items SET cantidad_reservada = cantidad_reservada + $2 WHERE id = $1', [itemId, reservar]);
    return reservar;
}

// Crea la venta y registra el pago inicial si viene.
// Venta normal: descuenta stock de inmediato.
// Encargo (encargo = true): queda "Por entregar"; el stock disponible se descuenta
// y reserva altiro; lo que falta se reserva cuando el taller termina su orden.
// La usan también las cotizaciones al convertirse en venta.
async function crearVenta(client, usuarioId, {
    fecha, descuento, observacion, items, pagoInicial, cotizacionId = null,
    clienteNombre = '', clienteTelefono = '', encargo = false, fechaCompromiso = null,
}) {
    const { rows } = await client.query(
        `INSERT INTO ventas (fecha, descuento, observacion, cotizacion_id, usuario_id,
                             cliente_nombre, cliente_telefono, estado_entrega, fecha_compromiso, fecha_entrega)
         VALUES (coalesce($1::date, current_date), $2, $3, $4, $5, $6, $7, $8, $9,
                 CASE WHEN $8 = 'Entregada' THEN coalesce($1::date, current_date) END)
         RETURNING id, codigo`,
        [fecha, descuento, observacion, cotizacionId, usuarioId,
         clienteNombre, clienteTelefono, encargo ? 'Por entregar' : 'Entregada', fechaCompromiso]
    );
    const venta = rows[0];

    for (const item of items) {
        // Si no se indica precio, se usa el de la lista de precios.
        const { rows: precio } = await client.query(
            'SELECT precio FROM producto_tallas WHERE producto_id = $1 AND talla = $2',
            [item.producto_id, item.talla]
        );
        if (!precio[0]) throw solicitudInvalida(`El producto ${item.producto_id} no tiene la talla ${item.talla}.`);

        const { rows: [nuevo] } = await client.query(
            `INSERT INTO venta_items (venta_id, producto_id, talla, cantidad, precio_unitario)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [venta.id, item.producto_id, item.talla, item.cantidad, item.precio_unitario ?? precio[0].precio]
        );
        if (encargo) await reservarEnEncargo(client, usuarioId, { itemId: nuevo.id, maximo: item.cantidad });
    }
    if (!encargo) {
        await descontarStock(client, usuarioId, venta, items);
    }

    if (pagoInicial) {
        await registrarPago(client, usuarioId, venta.id, { ...pagoInicial, observacion: encargo ? 'Abono' : 'Pago inicial' });
    }
    await registrarActividad(client, usuarioId, 'Ventas', 'Crear',
        `${encargo ? 'Encargo' : 'Venta'} ${venta.codigo} registrado${encargo ? '' : 'a'}`, venta.codigo);
    return venta.id;
}

function leerItems(lista) {
    return v.lista(lista, 'items').map(i => ({
        producto_id: v.id(i.producto_id, 'producto_id'),
        talla: v.texto(String(i.talla ?? ''), 'talla'),
        cantidad: v.numero(i.cantidad, 'cantidad', { min: 1, entero: true }),
        precio_unitario: v.numero(i.precio_unitario, 'precio_unitario', { requerido: false, min: 0, entero: true }),
    }));
}

function leerPago(b) {
    return {
        fecha: v.fecha(b.fecha),
        monto: v.numero(b.monto, 'monto', { min: 1, entero: true }),
        medio_pago_id: v.id(b.medio_pago_id, 'medio_pago_id'),
        observacion: v.texto(b.observacion, 'observacion', { requerido: false }),
    };
}

// No se puede pagar más que el saldo pendiente.
async function registrarPago(client, usuarioId, ventaId, pago) {
    // Bloquea la venta para evitar que dos pagos simultáneos superen el saldo.
    await client.query('SELECT id FROM ventas WHERE id = $1 FOR UPDATE', [ventaId]);
    const { rows } = await client.query('SELECT codigo, saldo_pendiente FROM v_ventas WHERE id = $1', [ventaId]);
    if (!rows[0]) throw noEncontrado('Venta');
    if (pago.monto > rows[0].saldo_pendiente) {
        throw solicitudInvalida(`El pago supera el saldo pendiente (${rows[0].saldo_pendiente}).`);
    }
    const { rows: creado } = await client.query(
        `INSERT INTO pagos_venta (venta_id, fecha, monto, medio_pago_id, observacion, usuario_id)
         VALUES ($1, coalesce($2::date, current_date), $3, $4, $5, $6) RETURNING codigo`,
        [ventaId, pago.fecha, pago.monto, pago.medio_pago_id, pago.observacion, usuarioId]
    );
    await registrarActividad(client, usuarioId, 'Cobranza', 'Pago',
        `Pago ${creado[0].codigo} de ${pago.monto} a venta ${rows[0].codigo}`, rows[0].codigo);
}

// POST /api/ventas
// { fecha?, descuento?, observacion?, cliente_nombre?, cliente_telefono?,
//   encargo?: bool, fecha_compromiso?, enviar_taller?: bool,
//   items: [{producto_id, talla, cantidad, precio_unitario?}],
//   pago_inicial?: {monto, medio_pago_id} }
router.post('/', async (req, res) => {
    const b = req.body;
    const encargo = b.encargo === true;
    const datos = {
        fecha: v.fecha(b.fecha),
        descuento: v.numero(b.descuento, 'descuento', { requerido: false, min: 0, entero: true }) ?? 0,
        observacion: v.texto(b.observacion, 'observacion', { requerido: false }),
        clienteNombre: v.texto(b.cliente_nombre, 'cliente_nombre', { requerido: encargo }),
        clienteTelefono: v.texto(b.cliente_telefono, 'cliente_telefono', { requerido: false }),
        encargo,
        fechaCompromiso: encargo ? v.fecha(b.fecha_compromiso, 'fecha_compromiso') : null,
        items: leerItems(b.items),
        pagoInicial: b.pago_inicial?.monto ? leerPago({ ...b.pago_inicial, fecha: b.fecha }) : null,
    };
    const venta = await transaccion(async client => {
        const id = await crearVenta(client, req.usuario.id, datos);
        if (encargo && b.enviar_taller === true) {
            await enviarAlTaller(client, req.usuario.id, id);
        }
        return obtenerVenta(client, id);
    });
    res.status(201).json(venta);
});

// Crea órdenes de producción por lo que falta reservar de cada prenda del encargo.
// Fecha de entrega = fecha de retiro.
async function enviarAlTaller(client, usuarioId, ventaId) {
    const venta = await obtenerVenta(client, ventaId);
    for (const item of venta.items) {
        const falta = item.cantidad - item.reservada;
        if (falta <= 0) continue;
        const { rows } = await client.query(
            `INSERT INTO ordenes_produccion (producto_id, talla, cantidad, observacion, venta_id, fecha_entrega, usuario_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING codigo`,
            [item.producto_id, item.talla, falta, `Encargo de ${venta.cliente_nombre}`, ventaId, venta.fecha_compromiso, usuarioId]
        );
        await registrarActividad(client, usuarioId, 'Producción', 'Crear',
            `Orden ${rows[0].codigo} creada para el encargo ${venta.codigo}`, rows[0].codigo);
    }
}

// GET /api/ventas/:id/pagos
router.get('/:id/pagos', async (req, res) => {
    const { rows } = await query(
        `SELECT p.*, m.nombre AS medio_pago, u.nombre AS usuario
         FROM pagos_venta p
         JOIN medios_pago m ON m.id = p.medio_pago_id
         LEFT JOIN usuarios u ON u.id = p.usuario_id
         WHERE p.venta_id = $1 ORDER BY p.fecha, p.id`,
        [v.id(req.params.id)]
    );
    res.json(rows);
});

// POST /api/ventas/:id/pagos  { fecha?, monto, medio_pago_id, observacion? }
router.post('/:id/pagos', async (req, res) => {
    const id = v.id(req.params.id);
    const pago = leerPago(req.body);
    const venta = await transaccion(async client => {
        await registrarPago(client, req.usuario.id, id, pago);
        return obtenerVenta(client, id);
    });
    res.status(201).json(venta);
});

// PATCH /api/ventas/:id/entregar -> el cliente retira su encargo: descuenta stock
router.patch('/:id/entregar', async (req, res) => {
    const id = v.id(req.params.id);
    const venta = await transaccion(async client => {
        await client.query('SELECT id FROM ventas WHERE id = $1 FOR UPDATE', [id]);
        const actual = await obtenerVenta(client, id);
        if (actual.estado_entrega === 'Entregada') {
            throw new HttpError(409, `La venta ${actual.codigo} ya fue entregada.`);
        }
        // Lo reservado ya salió del stock; solo se descuenta lo que faltaba (si hay).
        const pendientes = actual.items
            .map(i => ({ ...i, cantidad: i.cantidad - i.reservada }))
            .filter(i => i.cantidad > 0);
        await descontarStock(client, req.usuario.id, actual, pendientes);
        await client.query('UPDATE venta_items SET cantidad_reservada = cantidad WHERE venta_id = $1', [id]);
        await client.query(
            `UPDATE ventas SET estado_entrega = 'Entregada', fecha_entrega = current_date WHERE id = $1`,
            [id]
        );
        await registrarActividad(client, req.usuario.id, 'Ventas', 'Entregar',
            `Encargo ${actual.codigo} entregado a ${actual.cliente_nombre}`, actual.codigo);
        return obtenerVenta(client, id);
    });
    res.json(venta);
});

// DELETE /api/ventas/:id -> anula la venta y devuelve al stock lo entregado o reservado
router.delete('/:id', async (req, res) => {
    const id = v.id(req.params.id);
    await transaccion(async client => {
        const venta = await obtenerVenta(client, id);
        const entregada = venta.estado_entrega === 'Entregada';
        for (const item of venta.items) {
            const devolver = entregada ? item.cantidad : item.reservada;
            if (devolver <= 0) continue;
            await moverStockPrenda(client, {
                productoId: item.producto_id, talla: item.talla, delta: devolver,
                tipo: entregada ? 'Reverso de venta' : 'Liberación de reserva',
                referencia: venta.codigo, usuarioId: req.usuario.id,
            });
        }
        await client.query('DELETE FROM ventas WHERE id = $1', [id]);
        await registrarActividad(client, req.usuario.id, 'Ventas', 'Eliminar',
            `Venta ${venta.codigo} anulada`, venta.codigo);
    });
    res.status(204).end();
});

module.exports = router;
module.exports.crearVenta = crearVenta;
module.exports.reservarEnEncargo = reservarEnEncargo;
