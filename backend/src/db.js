const { Pool, types } = require('pg');
const config = require('./config');

// Por defecto pg entrega numeric y bigint como texto.
// Los montos de PATYCA caben sin problema en un Number de JS.
types.setTypeParser(types.builtins.NUMERIC, v => (v === null ? null : Number(v)));
types.setTypeParser(types.builtins.INT8, v => (v === null ? null : Number(v)));
// Las fechas (date) se mantienen como "YYYY-MM-DD" para evitar corrimientos por zona horaria.
types.setTypeParser(types.builtins.DATE, v => v);

// En Vercel cada función abre sus propias conexiones: se usan pocas para no
// agotar el límite de la base (Neon). Localmente, el valor por defecto.
const pool = new Pool({ connectionString: config.databaseUrl, max: process.env.VERCEL ? 3 : 10 });

// Una conexión inactiva puede cortarse (base reiniciada o apagada): se registra y el
// servidor sigue funcionando; la próxima consulta abre una conexión nueva.
pool.on('error', error => console.error('Conexión con la base de datos interrumpida:', error.message));

function query(texto, parametros) {
    return pool.query(texto, parametros);
}

// Ejecuta "fn" dentro de una transacción: si algo falla, no se guarda nada.
async function transaccion(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await fn(client);
        await client.query('COMMIT');
        return resultado;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { pool, query, transaccion };
