// Proyección de ventas a partir de la historia (2 años aprox.).
//
// Método (simple y explicable):
//   1. Historia mensual por producto y talla = ventas_historicas + ventas del sistema.
//   2. Crecimiento anual g = unidades últimos 12 meses / 12 meses anteriores - 1.
//   3. Nivel estacional de cada mes del año: promedio de los dos años, el más
//      reciente pesa el doble y el anterior se lleva a su nivel con (1 + g).
//   4. Proyección de un mes futuro = nivel estacional × (1 + g).
//   5. Montos valorizados con el precio de lista actual.
// El simulador (front) ajusta g, precios y demanda sobre esta base.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const v = require('../lib/validar');

const router = Router();

const HORIZONTE = 12;   // meses proyectados (el front muestra 6 o 12)

// "2026-10-01" + n meses
function sumarMeses(mesIso, n) {
    const [a, m] = mesIso.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    return d.toISOString().slice(0, 10);
}

// GET /api/proyeccion?establecimiento_id=
router.get('/', async (req, res) => {
    const establecimientoId = req.query.establecimiento_id ? v.id(req.query.establecimiento_id, 'establecimiento_id') : null;
    const { rows: [{ mes_actual }] } = await query(`SELECT to_char(date_trunc('month', current_date), 'YYYY-MM-DD') AS mes_actual`);
    const desde = sumarMeses(mes_actual, -24);

    // Historia mensual por producto/talla (24 meses completos + mes en curso).
    const { rows: historia } = await query(
        `WITH reales AS (
             SELECT date_trunc('month', v.fecha)::date AS mes, i.producto_id, i.talla,
                    sum(i.cantidad) AS unidades, sum(i.cantidad * i.precio_unitario) AS monto
             FROM venta_items i JOIN ventas v ON v.id = i.venta_id
             WHERE v.fecha >= $1
             GROUP BY 1, 2, 3
         ), todas AS (
             SELECT mes, producto_id, talla, unidades, monto FROM ventas_historicas WHERE mes >= $1
             UNION ALL
             SELECT mes, producto_id, talla, unidades, monto FROM reales
         )
         SELECT to_char(t.mes, 'YYYY-MM-DD') AS mes, t.producto_id, t.talla,
                sum(t.unidades)::int AS unidades, sum(t.monto) AS monto
         FROM todas t JOIN productos p ON p.id = t.producto_id
         WHERE p.activo AND ($2::int IS NULL OR p.establecimiento_id = $2)
         GROUP BY 1, 2, 3`,
        [desde, establecimientoId]
    );

    // Totales mensuales para el gráfico.
    const meses = Array.from({ length: 25 }, (_, i) => sumarMeses(desde, i));   // -24 .. mes actual
    const totalMes = Object.fromEntries(meses.map(m => [m, { mes: m, unidades: 0, monto: 0 }]));
    for (const h of historia) {
        if (!totalMes[h.mes]) continue;
        totalMes[h.mes].unidades += h.unidades;
        totalMes[h.mes].monto += h.monto;
    }

    // Totales sin detalle (solo dinero): suman al monto del mes, no a las unidades.
    const { rows: resumenes } = await query(
        `SELECT to_char(mes, 'YYYY-MM-DD') AS mes, sum(monto) AS monto FROM ventas_resumen
         WHERE mes >= $1 AND ($2::int IS NULL OR establecimiento_id = $2) GROUP BY 1`,
        [desde, establecimientoId]
    );
    for (const r of resumenes) if (totalMes[r.mes]) totalMes[r.mes].monto += r.monto;

    // Crecimiento: últimos 12 meses completos vs los 12 anteriores.
    const suma = (inicio, fin) => meses.slice(inicio, fin).reduce((s, m) => s + totalMes[m].unidades, 0);
    const ultimos12 = suma(12, 24);
    const anteriores12 = suma(0, 12);
    const crecimiento = anteriores12 > 0
        ? Math.min(1, Math.max(-0.5, ultimos12 / anteriores12 - 1))   // acotado: -50% .. +100%
        : 0;

    // Unidades por producto/talla en cada mes de la historia.
    const porItem = new Map();
    for (const h of historia) {
        const clave = `${h.producto_id}|${h.talla}`;
        if (!porItem.has(clave)) porItem.set(clave, { producto_id: h.producto_id, talla: h.talla, mensual: {} });
        porItem.get(clave).mensual[h.mes] = h.unidades;
    }

    // Datos actuales del producto/talla: precio de lista, stock y órdenes abiertas.
    const { rows: actuales } = await query(
        `SELECT pt.producto_id, pt.talla, pt.precio, p.nombre AS producto, e.nombre AS establecimiento,
                coalesce(sp.stock, 0) AS stock, rt.consumo_g, rt.tipo_tela, rt.peso_rollo_kg,
                coalesce((SELECT sum(o.cantidad) FROM ordenes_produccion o
                          WHERE o.producto_id = pt.producto_id AND o.talla = pt.talla AND o.estado <> 'Terminada'), 0)::int AS en_produccion
         FROM producto_tallas pt
         JOIN productos p ON p.id = pt.producto_id
         JOIN establecimientos e ON e.id = p.establecimiento_id
         LEFT JOIN stock_prendas sp ON sp.producto_id = pt.producto_id AND sp.talla = pt.talla
         LEFT JOIN v_rendimiento_tela rt ON rt.producto_id = pt.producto_id AND rt.talla = pt.talla
         WHERE p.activo AND ($1::int IS NULL OR p.establecimiento_id = $1)`,
        [establecimientoId]
    );
    const actual = new Map(actuales.map(a => [`${a.producto_id}|${a.talla}`, a]));

    // Proyección por producto/talla.
    const mesesProyeccion = Array.from({ length: HORIZONTE }, (_, i) => sumarMeses(mes_actual, i));
    const items = [];
    for (const [clave, item] of porItem) {
        const datos = actual.get(clave);
        if (!datos) continue;
        const unidades = mesesProyeccion.map(mesFuturo => {
            const reciente = item.mensual[sumarMeses(mesFuturo, -12)] || 0;
            const anterior = item.mensual[sumarMeses(mesFuturo, -24)] || 0;
            const nivel = (2 * reciente + anterior * (1 + crecimiento)) / 3;
            return Math.round(nivel * (1 + crecimiento) * 10) / 10;
        });
        if (unidades.every(u => u === 0)) continue;
        items.push({ ...datos, unidades });
    }
    items.sort((a, b) => b.unidades.reduce((s, u) => s + u, 0) - a.unidades.reduce((s, u) => s + u, 0));

    res.json({
        mes_actual,
        crecimiento_base: Math.round(crecimiento * 1000) / 10,   // en %
        historia: meses.map(m => totalMes[m]),
        meses_proyeccion: mesesProyeccion,
        items,
    });
});

// POST /api/proyeccion/historicas
// { filas: [{ mes: "2025-03-01", producto_id, talla, unidades, monto }] }
// Importa (o reemplaza) ventas anteriores al sistema, ya resumidas por mes.
router.post('/historicas', async (req, res) => {
    const filas = v.lista(req.body.filas, 'filas').map(f => ({
        mes: v.fecha(f.mes, 'mes'),
        producto_id: v.id(f.producto_id, 'producto_id'),
        talla: v.texto(String(f.talla ?? ''), 'talla'),
        unidades: v.numero(f.unidades, 'unidades', { min: 0, entero: true }),
        monto: v.numero(f.monto, 'monto', { min: 0 }),
    }));
    await transaccion(async client => {
        for (const f of filas) {
            await client.query(
                `INSERT INTO ventas_historicas (mes, producto_id, talla, unidades, monto)
                 VALUES (date_trunc('month', $1::date), $2, $3, $4, $5)
                 ON CONFLICT (mes, producto_id, talla) DO UPDATE
                 SET unidades = EXCLUDED.unidades, monto = EXCLUDED.monto`,
                [f.mes, f.producto_id, f.talla, f.unidades, Math.round(f.monto)]
            );
        }
    });
    res.status(201).json({ importadas: filas.length });
});

module.exports = router;
