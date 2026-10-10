const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { firmarToken, requiereSesion } = require('../lib/auth');
const { HttpError } = require('../lib/errores');
const v = require('../lib/validar');

const router = Router();

async function buscarUsuario(condicion, valor) {
    const { rows } = await query(
        `SELECT u.id, u.email, u.nombre, u.password_hash, u.activo, r.nombre AS rol,
                coalesce(array_agg(rp.modulo) FILTER (WHERE rp.modulo IS NOT NULL), '{}') AS modulos
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
         WHERE ${condicion} = $1
         GROUP BY u.id, r.nombre`,
        [valor]
    );
    return rows[0];
}

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
    const email = v.texto(req.body.email, 'email').toLowerCase();
    const password = v.texto(req.body.password, 'password');

    const usuario = await buscarUsuario('u.email', email);
    const valido = usuario && usuario.activo && (await bcrypt.compare(password, usuario.password_hash));
    if (!valido) {
        throw new HttpError(401, 'Correo o contraseña incorrectos.');
    }

    const { password_hash, activo, ...datos } = usuario;
    res.json({ token: firmarToken(datos), usuario: datos });
});

// GET /api/auth/me  -> datos del usuario de la sesión actual
router.get('/me', requiereSesion, async (req, res) => {
    const usuario = await buscarUsuario('u.id', req.usuario.id);
    if (!usuario || !usuario.activo) throw new HttpError(401, 'Usuario no disponible.');
    const { password_hash, activo, ...datos } = usuario;
    res.json(datos);
});

module.exports = router;
