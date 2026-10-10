// Registro de actividad y notificaciones leídas por usuario.
const { Router } = require('express');
const { query } = require('../db');
const { requiereModulo } = require('../lib/auth');
const v = require('../lib/validar');

const router = Router();

// GET /api/actividad?modulo=&limite=
router.get('/actividad', requiereModulo('reportes'), async (req, res) => {
    const params = [Math.min(v.numero(req.query.limite, 'limite', { requerido: false, min: 1, entero: true }) ?? 200, 1000)];
    let filtro = '';
    if (req.query.modulo) {
        params.push(req.query.modulo);
        filtro = 'WHERE a.modulo = $2';
    }
    const { rows } = await query(
        `SELECT a.*, u.nombre AS usuario, r.nombre AS rol
         FROM actividad a
         LEFT JOIN usuarios u ON u.id = a.usuario_id
         LEFT JOIN roles r ON r.id = u.rol_id
         ${filtro}
         ORDER BY a.fecha_hora DESC, a.id DESC
         LIMIT $1`,
        params
    );
    res.json(rows);
});

// GET /api/notificaciones/leidas -> ["MAT-CRITICO-MAT-0001", ...]
router.get('/notificaciones/leidas', async (req, res) => {
    const { rows } = await query(
        'SELECT clave FROM notificaciones_leidas WHERE usuario_id = $1',
        [req.usuario.id]
    );
    res.json(rows.map(r => r.clave));
});

// POST /api/notificaciones/leidas  { claves: [...] }
router.post('/notificaciones/leidas', async (req, res) => {
    const claves = v.lista(req.body.claves, 'claves').map(c => v.texto(String(c), 'clave'));
    await query(
        `INSERT INTO notificaciones_leidas (usuario_id, clave)
         SELECT $1, unnest($2::text[])
         ON CONFLICT DO NOTHING`,
        [req.usuario.id, claves]
    );
    res.status(204).end();
});

// DELETE /api/notificaciones/leidas -> marca todas como no leídas
router.delete('/notificaciones/leidas', async (req, res) => {
    await query('DELETE FROM notificaciones_leidas WHERE usuario_id = $1', [req.usuario.id]);
    res.status(204).end();
});

module.exports = router;
