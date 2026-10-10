// Error con código HTTP, para responder mensajes claros al front.
class HttpError extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

const noEncontrado = (que = 'Registro') => new HttpError(404, `${que} no encontrado.`);
const solicitudInvalida = mensaje => new HttpError(400, mensaje);

// Traduce errores de PostgreSQL a respuestas entendibles.
const ERRORES_PG = {
    23505: [409, 'Ya existe un registro con ese valor.'],
    23503: [409, 'El registro está relacionado con otros datos o hace referencia a uno que no existe.'],
    23514: [400, 'Algún valor no cumple las reglas permitidas.'],
    23502: [400, 'Falta un dato obligatorio.'],
    '22P02': [400, 'Formato de dato inválido.'],
    22007: [400, 'Fecha inválida.'],
    22008: [400, 'Fecha inválida.'],
};

function manejadorErrores(error, req, res, next) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
    }
    const pg = ERRORES_PG[error.code];
    if (pg) {
        return res.status(pg[0]).json({ error: pg[1], detalle: error.detail || error.constraint });
    }
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { HttpError, noEncontrado, solicitudInvalida, manejadorErrores };
