// Resumen para la pantalla de Inicio.
// Cada bloque se incluye solo si el rol tiene acceso al módulo correspondiente.
const { Router } = require('express');
const { query } = require('../db');

const router = Router();

// Montos vendidos por mes: ventas del sistema + historia importada + totales sin detalle.
const VENTAS_POR_MES = `
    SELECT mes, sum(monto) AS monto FROM (
        SELECT date_trunc('month', fecha)::date AS mes, total AS monto FROM v_ventas
        UNION ALL SELECT mes, monto FROM ventas_historicas
        UNION ALL SELECT mes, monto FROM ventas_resumen
    ) t GROUP BY mes`;

// GET /api/inicio
router.get('/', async (req, res) => {
    const puede = modulo => req.usuario.modulos.includes(modulo);
    const resumen = {};

    // Últimos 12 meses + el actual, como base de la serie mensual.
    const { rows: meses } = await query(
        `SELECT to_char(m, 'YYYY-MM-DD') AS mes
         FROM generate_series(date_trunc('month', current_date) - interval '12 months',
                              date_trunc('month', current_date), interval '1 month') m`
    );
    const serie = meses.map(m => ({ mes: m.mes }));
    const enSerie = (filas, campo) => filas.forEach(f => {
        const punto = serie.find(s => s.mes === f.mes);
        if (punto) punto[campo] = f.monto;
    });

    if (puede('ventas')) {
        const { rows } = await query(
            `SELECT
                coalesce((SELECT monto FROM (${VENTAS_POR_MES}) v WHERE mes = date_trunc('month', current_date)), 0) AS ventas_mes,
                coalesce(sum(saldo_pendiente), 0) AS por_cobrar,
                count(*) FILTER (WHERE estado_entrega = 'Por entregar') AS encargos_por_entregar,
                count(*) FILTER (WHERE estado_entrega = 'Por entregar' AND fecha_compromiso < current_date) AS encargos_atrasados
             FROM v_ventas`
        );
        Object.assign(resumen, rows[0]);
        serie.forEach(s => (s.ventas = 0));
        enSerie((await query(`SELECT to_char(mes, 'YYYY-MM-DD') AS mes, monto FROM (${VENTAS_POR_MES}) v`)).rows, 'ventas');
    }

    if (puede('compras')) {
        const { rows } = await query('SELECT coalesce(sum(saldo_pendiente), 0) AS por_pagar FROM v_compras');
        Object.assign(resumen, rows[0]);
        serie.forEach(s => (s.compras = 0));
        enSerie((await query(
            `SELECT to_char(date_trunc('month', fecha), 'YYYY-MM-DD') AS mes, sum(total) AS monto FROM v_compras GROUP BY 1`
        )).rows, 'compras');
    }

    if (puede('finanzas')) {
        serie.forEach(s => (s.gastos = 0));
        enSerie((await query(
            `SELECT to_char(date_trunc('month', fecha), 'YYYY-MM-DD') AS mes, sum(monto) AS monto FROM gastos GROUP BY 1`
        )).rows, 'gastos');
        resumen.gastos_mes = serie[serie.length - 1].gastos;
    }
    resumen.serie = serie;

    // Calendario: retiros de encargos y entregas de producción (desde 1 semana atrás hasta 2 meses).
    const agenda = [];
    if (puede('ventas')) {
        const { rows } = await query(
            `SELECT 'Encargo' AS tipo, v.id, v.fecha_compromiso AS fecha, v.codigo,
                    v.cliente_nombre AS titulo, v.saldo_pendiente,
                    CASE WHEN v.fecha_compromiso < current_date THEN 'Atrasada'
                         WHEN v.fecha_compromiso - current_date <= cfg.dias_aviso_vencimiento THEN 'Por vencer'
                         ELSE 'A tiempo' END AS alerta
             FROM v_ventas v CROSS JOIN configuracion cfg
             WHERE v.estado_entrega = 'Por entregar' AND v.fecha_compromiso IS NOT NULL
               AND v.fecha_compromiso BETWEEN date_trunc('month', current_date) - interval '7 days'
                                          AND current_date + interval '62 days'`
        );
        agenda.push(...rows);
    }
    if (puede('produccion')) {
        const { rows } = await query(
            `SELECT 'Orden' AS tipo, o.id, o.fecha_entrega AS fecha, o.codigo,
                    o.cantidad || '× ' || p.nombre || ' T' || o.talla AS titulo, o.estado,
                    CASE WHEN o.fecha_entrega < current_date THEN 'Atrasada'
                         WHEN o.fecha_entrega - current_date <= cfg.dias_aviso_vencimiento THEN 'Por vencer'
                         ELSE 'A tiempo' END AS alerta,
                    o.fecha_entrega - current_date AS dias_restantes, ve.cliente_nombre
             FROM ordenes_produccion o
             CROSS JOIN configuracion cfg
             JOIN productos p ON p.id = o.producto_id
             LEFT JOIN ventas ve ON ve.id = o.venta_id
             WHERE o.estado <> 'Terminada' AND o.fecha_entrega IS NOT NULL
               AND o.fecha_entrega <= current_date + interval '62 days'`
        );
        agenda.push(...rows);
    }
    resumen.agenda = agenda.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Encargos con todas sus prendas reservadas: avisar al cliente que puede retirar.
    if (puede('ventas')) {
        const { rows } = await query(
            `SELECT v.id, v.codigo, v.cliente_nombre, v.cliente_telefono, v.fecha_compromiso, v.saldo_pendiente
             FROM v_ventas v
             WHERE v.estado_entrega = 'Por entregar' AND NOT EXISTS (
                 SELECT 1 FROM venta_items i WHERE i.venta_id = v.id AND i.cantidad_reservada < i.cantidad)
             ORDER BY v.fecha_compromiso NULLS LAST`
        );
        resumen.listos_para_retirar = rows;
    }

    // Stock bajo: prendas y materiales con conteo en o bajo su mínimo.
    const stockBajo = await query(
        `SELECT 'Prenda' AS tipo, p.nombre || ' · Talla ' || sp.talla AS item,
                sp.stock, sp.stock_minimo, 'unidades' AS unidad
         FROM stock_prendas sp JOIN productos p ON p.id = sp.producto_id
         WHERE sp.stock_minimo IS NOT NULL AND sp.stock <= sp.stock_minimo
         UNION ALL
         SELECT 'Material', m.detalle, m.stock, m.stock_minimo, u.codigo
         FROM materiales m JOIN unidades_medida u ON u.id = m.unidad_id
         WHERE m.activo AND m.stock_minimo IS NOT NULL AND m.stock <= m.stock_minimo
         ORDER BY 1, 2
         LIMIT 20`
    );
    resumen.stock_bajo = stockBajo.rows;

    res.json(resumen);
});

module.exports = router;
