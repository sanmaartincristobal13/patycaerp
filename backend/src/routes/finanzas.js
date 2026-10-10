// Gastos y resumen financiero.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { noEncontrado, solicitudInvalida } = require('../lib/errores');
const { registrarActividad } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

// ------------------------------------------------------
// GASTOS
// ------------------------------------------------------

router.get('/gastos', async (req, res) => {
    const filtros = [];
    const params = [];
    if (req.query.desde) { params.push(v.fecha(req.query.desde, 'desde')); filtros.push(`g.fecha >= $${params.length}`); }
    if (req.query.hasta) { params.push(v.fecha(req.query.hasta, 'hasta')); filtros.push(`g.fecha <= $${params.length}`); }
    const { rows } = await query(
        `SELECT g.*, c.nombre AS categoria, u.nombre AS usuario
         FROM gastos g
         JOIN categorias_gasto c ON c.id = g.categoria_gasto_id
         LEFT JOIN usuarios u ON u.id = g.usuario_id
         ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
         ORDER BY g.fecha DESC, g.id DESC`,
        params
    );
    res.json(rows);
});

// POST /api/finanzas/gastos  { fecha?, categoria_gasto_id, concepto, monto }
router.post('/gastos', async (req, res) => {
    const b = req.body;
    const gasto = await transaccion(async client => {
        const { rows } = await client.query(
            `INSERT INTO gastos (fecha, categoria_gasto_id, concepto, monto, usuario_id, sin_detalle)
             VALUES (coalesce($1::date, current_date), $2, $3, $4, $5, $6) RETURNING *`,
            [
                v.fecha(b.fecha),
                v.id(b.categoria_gasto_id, 'categoria_gasto_id'),
                v.texto(b.concepto, 'concepto'),
                v.numero(b.monto, 'monto', { min: 1, entero: true }),
                req.usuario.id,
                b.sin_detalle === true,   // total del mes anotado como un solo monto
            ]
        );
        await registrarActividad(client, req.usuario.id, 'Finanzas', 'Crear',
            `Gasto ${rows[0].codigo}: ${rows[0].concepto}`, rows[0].codigo);
        return rows[0];
    });
    res.status(201).json(gasto);
});

router.delete('/gastos/:id', async (req, res) => {
    await transaccion(async client => {
        const { rows } = await client.query('DELETE FROM gastos WHERE id = $1 RETURNING codigo', [v.id(req.params.id)]);
        if (!rows[0]) throw noEncontrado('Gasto');
        await registrarActividad(client, req.usuario.id, 'Finanzas', 'Eliminar', `Gasto ${rows[0].codigo} eliminado`, rows[0].codigo);
    });
    res.status(204).end();
});

// ------------------------------------------------------
// RESUMEN: GET /api/finanzas/resumen?desde=&hasta=
// ------------------------------------------------------
//
// Ventas/compras/gastos del período (por fecha del documento),
// caja real (pagos efectivamente recibidos/hechos en el período)
// y saldos pendientes a la fecha (sin filtro de período).

router.get('/resumen', async (req, res) => {
    const desde = v.fecha(req.query.desde, 'desde') || '1900-01-01';
    const hasta = v.fecha(req.query.hasta, 'hasta') || '2999-12-31';

    const { rows } = await query(
        `SELECT
            (SELECT coalesce(sum(total), 0) FROM v_ventas  WHERE fecha BETWEEN $1 AND $2)
              + (SELECT coalesce(sum(monto), 0) FROM ventas_resumen WHERE mes BETWEEN date_trunc('month', $1::date) AND $2) AS ventas,   -- incluye totales sin detalle
            (SELECT coalesce(sum(total), 0) FROM v_compras WHERE fecha BETWEEN $1 AND $2) AS compras,
            (SELECT coalesce(sum(monto), 0) FROM gastos    WHERE fecha BETWEEN $1 AND $2) AS gastos,
            (SELECT coalesce(sum(monto), 0) FROM pagos_venta  WHERE fecha BETWEEN $1 AND $2) AS cobrado,
            (SELECT coalesce(sum(monto), 0) FROM pagos_compra WHERE fecha BETWEEN $1 AND $2) AS pagado_proveedores,
            (SELECT coalesce(sum(saldo_pendiente), 0) FROM v_ventas)  AS por_cobrar,
            (SELECT coalesce(sum(saldo_pendiente), 0) FROM v_compras) AS por_pagar`,
        [desde, hasta]
    );
    const r = rows[0];
    res.json({
        ...r,
        // Utilidad simple: ventas - compras - gastos del período.
        resultado: r.ventas - r.compras - r.gastos,
        // Flujo de caja del período: lo cobrado - lo pagado - gastos.
        flujo_caja: r.cobrado - r.pagado_proveedores - r.gastos,
    });
});

// ------------------------------------------------------
// RESUMEN DE UN MES: GET /api/finanzas/resumen-mes/2026-09
// ------------------------------------------------------
//   Generado (ventas)  = registradas + historia importada + totales sin detalle
//   Egresos            = compras del mes + gastos del mes (incluye totales sin detalle)
//   Resultado          = generado - egresos
//   Flujo de caja      = cobrado en el mes - pagado a proveedores en el mes - gastos
// Incluye los mismos totales del mes anterior para comparar.

async function totalesMes(mes) {
    const { rows } = await query(
        `SELECT
            (SELECT coalesce(sum(total), 0) FROM v_ventas WHERE date_trunc('month', fecha) = $1) AS ventas_registradas,
            (SELECT count(*) FROM v_ventas WHERE date_trunc('month', fecha) = $1) AS cantidad_ventas,
            (SELECT coalesce(sum(monto), 0) FROM ventas_historicas WHERE mes = $1) AS ventas_historia,
            (SELECT coalesce(sum(monto), 0) FROM ventas_resumen WHERE mes = $1) AS ventas_sin_detalle,
            (SELECT coalesce(sum(monto), 0) FROM pagos_venta WHERE date_trunc('month', fecha) = $1) AS cobrado,
            (SELECT coalesce(sum(total), 0) FROM v_compras WHERE date_trunc('month', fecha) = $1) AS compras,
            (SELECT coalesce(sum(monto), 0) FROM pagos_compra WHERE date_trunc('month', fecha) = $1) AS pagado_proveedores,
            (SELECT coalesce(sum(monto), 0) FROM gastos WHERE date_trunc('month', fecha) = $1) AS gastos,
            (SELECT coalesce(sum(monto), 0) FROM gastos WHERE date_trunc('month', fecha) = $1 AND sin_detalle) AS gastos_sin_detalle`,
        [mes]
    );
    const t = rows[0];
    t.ventas = t.ventas_registradas + t.ventas_historia + t.ventas_sin_detalle;
    t.egresos = t.compras + t.gastos;
    t.resultado = t.ventas - t.egresos;
    t.flujo_caja = t.cobrado - t.pagado_proveedores - t.gastos;
    return t;
}

router.get('/resumen-mes/:mes', async (req, res) => {
    if (!/^\d{4}-\d{2}$/.test(req.params.mes)) throw solicitudInvalida('El mes debe tener formato AAAA-MM.');
    const mes = `${req.params.mes}-01`;
    const { rows: [{ anterior }] } = await query(
        `SELECT to_char($1::date - interval '1 month', 'YYYY-MM-DD') AS anterior`, [mes]);

    const [actual, previo, categorias, proveedores, colegios] = await Promise.all([
        totalesMes(mes),
        totalesMes(anterior),
        query(
            `SELECT c.nombre, sum(g.monto) AS monto, count(*) AS cantidad,
                    bool_or(g.sin_detalle) AS incluye_sin_detalle
             FROM gastos g JOIN categorias_gasto c ON c.id = g.categoria_gasto_id
             WHERE date_trunc('month', g.fecha) = $1
             GROUP BY c.nombre ORDER BY monto DESC`, [mes]),
        query(
            `SELECT proveedor AS nombre, sum(total) AS monto, sum(saldo_pendiente) AS pendiente, count(*) AS cantidad
             FROM v_compras WHERE date_trunc('month', fecha) = $1
             GROUP BY proveedor ORDER BY monto DESC`, [mes]),
        // Ventas por colegio (registradas con descuento repartido + historia + sin detalle)
        query(
            `SELECT nombre, round(sum(monto)) AS monto FROM (
                 SELECT e.nombre, i.cantidad * i.precio_unitario * vv.total / nullif(vv.subtotal, 0) AS monto
                 FROM venta_items i JOIN v_ventas vv ON vv.id = i.venta_id
                 JOIN productos p ON p.id = i.producto_id JOIN establecimientos e ON e.id = p.establecimiento_id
                 WHERE date_trunc('month', vv.fecha) = $1
                 UNION ALL
                 SELECT e.nombre, h.monto FROM ventas_historicas h
                 JOIN productos p ON p.id = h.producto_id JOIN establecimientos e ON e.id = p.establecimiento_id
                 WHERE h.mes = $1
                 UNION ALL
                 SELECT coalesce(e.nombre, 'Varios / sin separar'), r.monto FROM ventas_resumen r
                 LEFT JOIN establecimientos e ON e.id = r.establecimiento_id WHERE r.mes = $1
             ) x GROUP BY nombre ORDER BY monto DESC`, [mes]),
    ]);

    res.json({
        mes, anterior: { mes: anterior, ...previo }, ...actual,
        gastos_por_categoria: categorias.rows,
        compras_por_proveedor: proveedores.rows,
        ventas_por_colegio: colegios.rows,
    });
});

module.exports = router;
