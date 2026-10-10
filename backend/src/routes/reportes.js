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

module.exports = router;
