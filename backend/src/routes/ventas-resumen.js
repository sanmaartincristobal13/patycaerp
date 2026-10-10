// Ventas registradas solo como total del mes (sin detalle de prendas).
// Solo para lo que NO está ingresado venta por venta en el sistema.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { noEncontrado, solicitudInvalida } = require('../lib/errores');
const { registrarActividad } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

router.get('/', async (req, res) => {
    const { rows } = await query(
        `SELECT r.*, to_char(r.mes, 'YYYY-MM-DD') AS mes, e.nombre AS establecimiento, u.nombre AS usuario
         FROM ventas_resumen r
         LEFT JOIN establecimientos e ON e.id = r.establecimiento_id
         LEFT JOIN usuarios u ON u.id = r.usuario_id
         ORDER BY r.mes DESC, e.nombre NULLS LAST`
    );
    res.json(rows);
});

// POST /api/ventas-resumen  { mes: "2026-09" o "2026-09-01", establecimiento_id?, monto, observacion? }
router.post('/', async (req, res) => {
    const b = req.body;
    const mes = /^\d{4}-\d{2}$/.test(b.mes) ? `${b.mes}-01` : v.fecha(b.mes, 'mes');
    if (!mes) throw solicitudInvalida('El campo "mes" es obligatorio.');
    const registro = await transaccion(async client => {
        const { rows } = await client.query(
            `INSERT INTO ventas_resumen (mes, establecimiento_id, monto, observacion, usuario_id)
             VALUES (date_trunc('month', $1::date), $2, $3, $4, $5) RETURNING id, to_char(mes, 'YYYY-MM') AS mes, monto`,
            [
                mes,
                b.establecimiento_id ? v.id(b.establecimiento_id, 'establecimiento_id') : null,
                v.numero(b.monto, 'monto', { min: 1, entero: true }),
                v.texto(b.observacion, 'observacion', { requerido: false }),
                req.usuario.id,
            ]
        );
        await registrarActividad(client, req.usuario.id, 'Ventas', 'Total mensual',
            `Total sin detalle de ${rows[0].mes}: ${rows[0].monto}`);
        return rows[0];
    });
    res.status(201).json(registro);
});

router.delete('/:id', async (req, res) => {
    const { rowCount } = await query('DELETE FROM ventas_resumen WHERE id = $1', [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado('Registro');
    res.status(204).end();
});

module.exports = router;
