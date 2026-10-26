// Reportes de ventas por mes.
// Un mes suma tres fuentes:
//   · ventas registradas en el sistema (con detalle de prendas)
//   · historia importada (ventas_historicas, por producto y talla)
//   · totales sin detalle (ventas_resumen, solo dinero)
const { Router } = require('express');
const { query } = require('../db');
const { solicitudInvalida } = require('../lib/errores');

const router = Router();

// Ítems vendidos en el sistema con su monto neto: el descuento de cada venta
// se reparte proporcionalmente entre sus prendas, así los desgloses suman el total.
const ITEMS_NETOS = `
    SELECT date_trunc('month', vv.fecha)::date AS mes, i.producto_id, i.talla, i.cantidad,
           i.cantidad * i.precio_unitario * vv.total / nullif(vv.subtotal, 0) AS monto
    FROM venta_items i JOIN v_ventas vv ON vv.id = i.venta_id`;

// GET /api/reportes/ventas-mes  -> últimos 24 meses + el actual
router.get('/ventas-mes', async (req, res) => {
    const { rows } = await query(
        `WITH meses AS (
             SELECT m::date AS mes FROM generate_series(
                 date_trunc('month', current_date) - interval '24 months',
                 date_trunc('month', current_date), interval '1 month') m
         ), sistema AS (
             SELECT date_trunc('month', fecha)::date AS mes, count(*) AS ventas, sum(total) AS monto
             FROM v_ventas GROUP BY 1
         ), prendas AS (
             SELECT mes, sum(cantidad) AS unidades FROM (${ITEMS_NETOS}) x GROUP BY 1
         ), historia AS (
             SELECT mes, sum(unidades) AS unidades, sum(monto) AS monto FROM ventas_historicas GROUP BY 1
         ), resumen AS (
             SELECT mes, sum(monto) AS monto FROM ventas_resumen GROUP BY 1
         )
         SELECT to_char(m.mes, 'YYYY-MM-DD') AS mes,
                coalesce(s.ventas, 0) AS cantidad_ventas,
                coalesce(s.monto, 0) AS sistema,
                coalesce(h.monto, 0) AS historia,
                coalesce(r.monto, 0) AS sin_detalle,
                coalesce(s.monto, 0) + coalesce(h.monto, 0) + coalesce(r.monto, 0) AS total,
                coalesce(p.unidades, 0) + coalesce(h.unidades, 0) AS prendas
         FROM meses m
         LEFT JOIN sistema s ON s.mes = m.mes
         LEFT JOIN prendas p ON p.mes = m.mes
         LEFT JOIN historia h ON h.mes = m.mes
         LEFT JOIN resumen r ON r.mes = m.mes
         ORDER BY m.mes DESC`
    );
    res.json(rows);
});

// GET /api/reportes/ventas-mes/2026-09  -> desglose del mes
router.get('/ventas-mes/:mes', async (req, res) => {
    if (!/^\d{4}-\d{2}$/.test(req.params.mes)) throw solicitudInvalida('El mes debe tener formato AAAA-MM.');
    const mes = `${req.params.mes}-01`;

    // Prendas del mes (sistema + historia) con colegio y tipo.
    const DETALLE = `
        SELECT d.producto_id, d.talla, d.cantidad, d.monto,
               p.nombre AS producto, e.nombre AS colegio, coalesce(tp.nombre, 'Otros') AS tipo
        FROM (
            SELECT producto_id, talla, cantidad, monto FROM (${ITEMS_NETOS}) x WHERE mes = $1
            UNION ALL
            SELECT producto_id, talla, unidades, monto FROM ventas_historicas WHERE mes = $1
        ) d
        JOIN productos p ON p.id = d.producto_id
        JOIN establecimientos e ON e.id = p.establecimiento_id
        LEFT JOIN tipos_prenda tp ON tp.id = p.tipo_prenda_id`;

    const [colegios, tipos, productos, sinDetalle, totales] = await Promise.all([
        query(`SELECT colegio AS nombre, sum(cantidad)::int AS prendas, round(sum(monto)) AS monto
               FROM (${DETALLE}) d GROUP BY 1`, [mes]),
        query(`SELECT tipo AS nombre, sum(cantidad)::int AS prendas, round(sum(monto)) AS monto
               FROM (${DETALLE}) d GROUP BY 1 ORDER BY monto DESC`, [mes]),
        query(`SELECT producto || ' · ' || colegio AS nombre, sum(cantidad)::int AS prendas, round(sum(monto)) AS monto
               FROM (${DETALLE}) d GROUP BY 1 ORDER BY prendas DESC, monto DESC LIMIT 10`, [mes]),
        query(`SELECT coalesce(e.nombre, 'Varios / sin separar') AS nombre, sum(r.monto) AS monto
               FROM ventas_resumen r LEFT JOIN establecimientos e ON e.id = r.establecimiento_id
               WHERE r.mes = $1 GROUP BY 1`, [mes]),
        query(`SELECT (SELECT count(*) FROM v_ventas WHERE date_trunc('month', fecha) = $1) AS cantidad_ventas`, [mes]),
    ]);

    // Por colegio: suma lo con detalle y los totales sin detalle del mismo colegio.
    const porColegio = new Map(colegios.rows.map(c => [c.nombre, { ...c, sin_detalle: 0 }]));
    for (const s of sinDetalle.rows) {
        const fila = porColegio.get(s.nombre) || { nombre: s.nombre, prendas: 0, monto: 0, sin_detalle: 0 };
        fila.sin_detalle += s.monto;
        porColegio.set(s.nombre, fila);
    }
    const colegiosFinal = [...porColegio.values()]
        .map(c => ({ ...c, total: c.monto + c.sin_detalle }))
        .sort((a, b) => b.total - a.total);

    const conDetalle = colegios.rows.reduce((s, c) => s + c.monto, 0);
    const totalSinDetalle = sinDetalle.rows.reduce((s, r) => s + r.monto, 0);
    res.json({
        mes,
        total: conDetalle + totalSinDetalle,
        con_detalle: conDetalle,
        sin_detalle: totalSinDetalle,
        prendas: colegios.rows.reduce((s, c) => s + c.prendas, 0),
        cantidad_ventas: totales.rows[0].cantidad_ventas,
        colegios: colegiosFinal,
        tipos: totalSinDetalle ? [...tipos.rows, { nombre: 'Sin detalle', prendas: null, monto: totalSinDetalle }] : tipos.rows,
        productos: productos.rows,
    });
});

// ======================================================
// RESUMEN DE GESTIÓN: DÍA Y MES
// ======================================================
// "Recaudado" es dinero que entró (pagos de clientes, incluidos abonos y
// saldos de ventas de otros días). "Vendido" es lo que se vendió, se haya
// cobrado o no. Los montos de venta incluyen IVA; el neto es total / 1,19.

const IVA = 0.19;

// Recaudado por cada medio de pago (todos los medios, aunque sumen $0).
const POR_MEDIO = desde_hasta => `
    SELECT m.nombre, coalesce(sum(p.monto), 0) AS monto, count(p.id)::int AS pagos
    FROM medios_pago m
    LEFT JOIN pagos_venta p ON p.medio_pago_id = m.id AND ${desde_hasta}
    GROUP BY m.id, m.nombre ORDER BY m.id`;

// GET /api/reportes/dia/2026-10-26
router.get('/dia/:fecha', async (req, res) => {
    const fecha = req.params.fecha;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw solicitudInvalida('La fecha debe tener formato AAAA-MM-DD.');

    const [porMedio, pagos, ventas] = await Promise.all([
        query(POR_MEDIO('p.fecha = $1'), [fecha]),
        query(
            `SELECT p.codigo, p.monto, m.nombre AS medio, p.observacion,
                    v.codigo AS venta, v.cliente_nombre, to_char(v.fecha, 'YYYY-MM-DD') AS fecha_venta,
                    v.estado_entrega
             FROM pagos_venta p
             JOIN ventas v ON v.id = p.venta_id
             JOIN medios_pago m ON m.id = p.medio_pago_id
             WHERE p.fecha = $1 ORDER BY p.id`,
            [fecha]
        ),
        query(
            `SELECT count(*)::int AS cantidad,
                    count(*) FILTER (WHERE estado_entrega = 'Por entregar' OR fecha_compromiso IS NOT NULL)::int AS encargos,
                    coalesce(sum(total), 0) AS vendido,
                    coalesce(sum(saldo_pendiente), 0) AS por_cobrar,
                    coalesce((SELECT sum(i.cantidad) FROM venta_items i JOIN ventas x ON x.id = i.venta_id WHERE x.fecha = $1), 0)::int AS prendas
             FROM v_ventas WHERE fecha = $1`,
            [fecha]
        ),
    ]);
    const recaudado = porMedio.rows.reduce((s, m) => s + m.monto, 0);
    res.json({
        fecha,
        recaudado,
        cantidad_pagos: pagos.rows.length,
        ...ventas.rows[0],
        por_medio: porMedio.rows,
        pagos: pagos.rows,
    });
});

// GET /api/reportes/gestion-mes/2026-10
router.get('/gestion-mes/:mes', async (req, res) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.params.mes)) throw solicitudInvalida('El mes debe tener formato AAAA-MM.');
    const mes = `${req.params.mes}-01`;
    const enMes = campo => `date_trunc('month', ${campo}) = $1::date`;

    // Prendas vendidas por producto: sistema (neto de descuentos) + historia importada.
    const VENDIDAS = `
        SELECT producto_id, sum(cantidad)::int AS vendidas, sum(monto) AS monto FROM (
            SELECT producto_id, cantidad, monto FROM (${ITEMS_NETOS}) x WHERE mes = $1::date
            UNION ALL
            SELECT producto_id, unidades, monto FROM ventas_historicas WHERE mes = $1::date
        ) d GROUP BY producto_id`;
    const CONFECCIONADAS = `
        SELECT producto_id, sum(cantidad)::int AS confeccionadas, count(*)::int AS ordenes
        FROM ordenes_produccion
        WHERE estado = 'Terminada' AND ${enMes('fecha_finalizacion')}
        GROUP BY producto_id`;

    const [montos, porMedio, productos, totalesProduccion, porDia] = await Promise.all([
        query(
            `SELECT
                coalesce((SELECT sum(total) FROM v_ventas WHERE ${enMes('fecha')}), 0) AS ventas_registradas,
                (SELECT count(*)::int FROM ventas WHERE ${enMes('fecha')}) AS cantidad_ventas,
                coalesce((SELECT sum(monto) FROM ventas_historicas WHERE mes = $1::date), 0) AS ventas_historia,
                coalesce((SELECT sum(monto) FROM ventas_resumen WHERE mes = $1::date), 0) AS ventas_sin_detalle,
                coalesce((SELECT sum(vendidas) FROM (${VENDIDAS}) v), 0)::int AS prendas_vendidas`,
            [mes]
        ),
        query(POR_MEDIO(enMes('p.fecha')), [mes]),
        query(
            `SELECT p.nombre || ' · ' || e.nombre AS nombre,
                    coalesce(v.vendidas, 0) AS vendidas, round(coalesce(v.monto, 0)) AS monto,
                    coalesce(c.confeccionadas, 0) AS confeccionadas
             FROM (SELECT producto_id FROM (${VENDIDAS}) a UNION SELECT producto_id FROM (${CONFECCIONADAS}) b) ids
             JOIN productos p ON p.id = ids.producto_id
             JOIN establecimientos e ON e.id = p.establecimiento_id
             LEFT JOIN (${VENDIDAS}) v ON v.producto_id = ids.producto_id
             LEFT JOIN (${CONFECCIONADAS}) c ON c.producto_id = ids.producto_id
             ORDER BY vendidas DESC, monto DESC, confeccionadas DESC
             LIMIT 15`,
            [mes]
        ),
        query(`SELECT coalesce(sum(confeccionadas), 0)::int AS confeccionadas, coalesce(sum(ordenes), 0)::int AS ordenes
               FROM (${CONFECCIONADAS}) c`, [mes]),
        query(
            `SELECT to_char(d, 'YYYY-MM-DD') AS fecha,
                    (SELECT count(*)::int FROM ventas WHERE fecha = d) AS ventas,
                    coalesce((SELECT sum(total) FROM v_ventas WHERE fecha = d), 0) AS vendido,
                    coalesce((SELECT sum(monto) FROM pagos_venta WHERE fecha = d), 0) AS recaudado
             FROM generate_series($1::date, least($1::date + interval '1 month' - interval '1 day', current_date), interval '1 day') d
             ORDER BY d`,
            [mes]
        ),
    ]);

    const m = montos.rows[0];
    const bruto = m.ventas_registradas + m.ventas_historia + m.ventas_sin_detalle;
    const neto = Math.round(bruto / (1 + IVA));
    res.json({
        mes,
        ...m,
        bruto,
        neto,
        iva: bruto - neto,
        ticket_promedio: m.cantidad_ventas ? Math.round(m.ventas_registradas / m.cantidad_ventas) : 0,
        recaudado: porMedio.rows.reduce((s, x) => s + x.monto, 0),
        por_medio: porMedio.rows,
        prendas_confeccionadas: totalesProduccion.rows[0].confeccionadas,
        ordenes_terminadas: totalesProduccion.rows[0].ordenes,
        mas_vendido: productos.rows.find(p => p.vendidas > 0) || null,
        productos: productos.rows,
        por_dia: porDia.rows.filter(d => d.ventas || d.recaudado),
    });
});

module.exports = router;
