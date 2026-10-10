const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('./errores');

function firmarToken(usuario) {
    return jwt.sign(
        { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, modulos: usuario.modulos },
        config.jwtSecret,
        { expiresIn: config.jwtExpira }
    );
}

// Exige "Authorization: Bearer <token>" y deja el usuario en req.usuario.
function requiereSesion(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
        throw new HttpError(401, 'Debe iniciar sesión.');
    }
    try {
        req.usuario = jwt.verify(token, config.jwtSecret);
    } catch {
        throw new HttpError(401, 'La sesión expiró o no es válida. Inicie sesión nuevamente.');
    }
    next();
}

// Exige que el rol del usuario tenga acceso al módulo (tabla rol_permisos).
function requiereModulo(modulo) {
    return (req, res, next) => {
        if (!req.usuario?.modulos?.includes(modulo)) {
            throw new HttpError(403, 'No tiene permiso para acceder a este módulo.');
        }
        next();
    };
}

module.exports = { firmarToken, requiereSesion, requiereModulo };
