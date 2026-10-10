// Validaciones simples de entrada. Lanzan 400 con un mensaje claro.
const { solicitudInvalida } = require('./errores');

function texto(valor, campo, { requerido = true } = {}) {
    const limpio = typeof valor === 'string' ? valor.trim() : '';
    if (requerido && !limpio) throw solicitudInvalida(`El campo "${campo}" es obligatorio.`);
    return limpio;
}

function numero(valor, campo, { requerido = true, min = null, entero = false } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        if (requerido) throw solicitudInvalida(`El campo "${campo}" es obligatorio.`);
        return null;
    }
    const n = Number(valor);
    if (!Number.isFinite(n)) throw solicitudInvalida(`El campo "${campo}" debe ser un número.`);
    if (entero && !Number.isInteger(n)) throw solicitudInvalida(`El campo "${campo}" debe ser un número entero.`);
    if (min !== null && n < min) throw solicitudInvalida(`El campo "${campo}" debe ser mayor o igual a ${min}.`);
    return n;
}

function id(valor, campo = 'id') {
    return numero(valor, campo, { min: 1, entero: true });
}

// Fecha "YYYY-MM-DD"; si no viene, null (la base usa la fecha de hoy).
function fecha(valor, campo = 'fecha') {
    if (valor === undefined || valor === null || valor === '') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw solicitudInvalida(`El campo "${campo}" debe tener formato AAAA-MM-DD.`);
    return valor;
}

function lista(valor, campo) {
    if (!Array.isArray(valor) || valor.length === 0) {
        throw solicitudInvalida(`Debe indicar al menos un elemento en "${campo}".`);
    }
    return valor;
}

module.exports = { texto, numero, id, fecha, lista };
