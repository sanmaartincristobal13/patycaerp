// Prepara la base de datos.
//
//   npm run db:init    Crea las tablas, carga los datos iniciales y el
//                      primer usuario administrador (ADMIN_* del .env).
//                      Solo funciona sobre una base vacía.
//
//   npm run db:reset -- --confirmar
//                      BORRA TODO y vuelve a ejecutar db:init.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const leer = archivo => fs.readFileSync(path.join(__dirname, '..', 'db', archivo), 'utf8');

async function baseVacia(client) {
    const { rows } = await client.query(
        "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'"
    );
    return rows[0].n === 0;
}

async function crearAdmin(client) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const nombre = (process.env.ADMIN_NOMBRE || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || !nombre || !password) {
        throw new Error('Define ADMIN_EMAIL, ADMIN_NOMBRE y ADMIN_PASSWORD en .env');
    }
    if (password.length < 8) {
        console.warn('AVISO: la clave del administrador es corta. Cámbiela antes de usar el sistema en producción.');
    }
    await client.query(
        `INSERT INTO usuarios (email, nombre, password_hash, rol_id)
         SELECT $1, $2, $3, id FROM roles WHERE nombre = 'Administradora'`,
        [email, nombre, await bcrypt.hash(password, 10)]
    );
    console.log(`Usuario administrador creado: ${email}`);
}

async function init(client) {
    if (!(await baseVacia(client))) {
        throw new Error('La base ya tiene tablas. Usa "npm run db:reset -- --confirmar" para recrearla (borra todo).');
    }
    await client.query(leer('schema.sql'));
    console.log('Tablas creadas.');
    await client.query(leer('seed.sql'));
    console.log('Datos iniciales cargados.');
    await crearAdmin(client);
}

async function reset(client) {
    if (!process.argv.includes('--confirmar')) {
        throw new Error('db:reset BORRA TODOS LOS DATOS. Para continuar: npm run db:reset -- --confirmar');
    }
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Base vaciada.');
    await init(client);
}

async function main() {
    const comando = process.argv[2];
    const acciones = { init, reset };
    if (!acciones[comando]) throw new Error('Uso: node scripts/db.js <init|reset>');

    const client = await pool.connect();
    try {
        await acciones[comando](client);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
});
