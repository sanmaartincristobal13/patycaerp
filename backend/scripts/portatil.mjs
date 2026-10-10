// ======================================================
// PATYCA ERP - LANZADOR DE LA VERSIÓN PORTÁTIL
// ======================================================
// Lo ejecuta "Iniciar PATYCA.bat" con el Node incluido en la carpeta.
// No requiere instalar nada: usa un PostgreSQL embebido cuyos datos
// quedan en la carpeta "datos" junto al .bat.
//
//   1. Enciende la base de datos (puerto 5433, para no chocar con un
//      PostgreSQL instalado). Si no existe, la crea con los datos iniciales.
//   2. Enciende el servidor del sistema y abre el navegador.
//   3. Al cerrar la ventana (o Ctrl+C) apaga la base de datos.
//
// Con --preparar (lo usa crear-portatil.js) carga además los datos de
// demostración y los pesos reales, y termina.
// ======================================================

import EmbeddedPostgres from 'embedded-postgres';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { exec, execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';

const require = createRequire(import.meta.url);
const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(BACKEND, '..', '..');          // carpeta PATYCA-portatil
const DATOS = path.join(RAIZ, 'datos');
const PG_DIR = path.join(DATOS, 'postgres');
const PUERTO_PG = 5433;
const PUERTO = Number(process.env.PORT) || 3000;
const PREPARAR = process.argv.includes('--preparar');

const log = texto => console.log(`  ${texto}`);

// PATYCA_SIN_NAVEGADOR=1 solo se usa para probar el lanzador sin abrir ventanas.
const abrirNavegador = () => process.env.PATYCA_SIN_NAVEGADOR || exec(`start "" http://localhost:${PUERTO}`);

// ---------- Claves propias de esta copia (se crean la primera vez) ----------
fs.mkdirSync(DATOS, { recursive: true });
const archivoConfig = path.join(DATOS, 'configuracion.json');
if (!fs.existsSync(archivoConfig)) {
    fs.writeFileSync(archivoConfig, JSON.stringify({
        clave_base_datos: crypto.randomBytes(16).toString('hex'),
        clave_sesiones: crypto.randomBytes(48).toString('hex'),
    }, null, 2));
}
const config = JSON.parse(fs.readFileSync(archivoConfig, 'utf8'));

// ¿Hay algo escuchando en este puerto?
function puertoAbierto(puerto) {
    return new Promise(resolve => {
        const s = net.connect(puerto, '127.0.0.1');
        s.once('connect', () => { s.destroy(); resolve(true); });
        s.once('error', () => resolve(false));
    });
}

// ¿La base de esta carpeta responde de verdad? (un puerto ocupado no basta)
async function baseResponde() {
    const { Client } = require('pg');
    const cliente = new Client({
        host: 'localhost', port: PUERTO_PG, user: 'postgres', password: config.clave_base_datos,
        database: 'postgres', connectionTimeoutMillis: 3000,
    });
    try {
        await cliente.connect();
        await cliente.query('SELECT 1');
        return true;
    } catch {
        return false;
    } finally {
        cliente.end().catch(() => {});
    }
}

// Cierra procesos de PostgreSQL de ESTA carpeta que hayan quedado huérfanos.
function cerrarHuerfanos() {
    const carpeta = RAIZ.split(path.sep).join('/');
    const comando = `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | ` +
        `Where-Object { $_.CommandLine -like '*${carpeta}*' } | ` +
        `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    return new Promise(resolve => execFile('powershell', ['-NoProfile', '-Command', comando], () => setTimeout(resolve, 1000)));
}

const pg = new EmbeddedPostgres({
    databaseDir: PG_DIR,
    user: 'postgres',
    password: config.clave_base_datos,
    port: PUERTO_PG,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: mensaje => fs.appendFileSync(path.join(DATOS, 'errores-base-datos.log'), `${new Date().toISOString()} ${mensaje}\n`),
});

let baseEncendidaAqui = false;
let apagando = false;

async function apagar(codigo = 0) {
    if (apagando) return;
    apagando = true;
    if (baseEncendidaAqui) {
        log('Apagando la base de datos...');
        // Cierra primero las conexiones del servidor (si alcanzó a cargarse).
        const db = require.cache[require.resolve('../src/db')];
        if (db) await db.exports.pool.end().catch(() => {});
        // Apagado limpio con pg_ctl (embedded-postgres en Windows mata el proceso a la fuerza,
        // lo que deja el archivo de bloqueo y obliga a una recuperación al encender).
        const pgCtl = path.join(path.dirname(require.resolve('@embedded-postgres/windows-x64/package.json')), 'native', 'bin', 'pg_ctl.exe');
        const limpio = await new Promise(resolve =>
            execFile(pgCtl, ['stop', '-D', PG_DIR, '-m', 'fast', '-w', '-t', '20'], error => resolve(!error)));
        if (!limpio) {
            try { await pg.stop(); } catch { /* ya estaba apagada */ }
        }
    }
    process.exit(codigo);
}
// Ctrl+C, cerrar la ventana y cierre de sesión de Windows
for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(senal, () => apagar(0));

// La base de datos no puede abrir archivos cuya ruta completa supere los 260
// caracteres de Windows. Los archivos internos más profundos ocupan ~120.
const LARGO_MAXIMO_CARPETA = 135;

async function main() {
    console.log('');
    console.log('  PATYCA ERP · versión portátil');
    console.log('  -----------------------------');

    if (RAIZ.length > LARGO_MAXIMO_CARPETA) {
        console.log('');
        log('La carpeta del sistema está en una ubicación con un nombre demasiado largo:');
        log(RAIZ);
        log('Mueva la carpeta "PATYCA-portatil" al Escritorio o a Documentos y vuelva a intentar.');
        await apagar(1);   // código 1: el .bat hace una pausa para que se lea el mensaje
        return;
    }

    // ---------- 1. Base de datos ----------
    const nueva = !fs.existsSync(path.join(PG_DIR, 'PG_VERSION'));
    if (nueva) {
        log('Creando la base de datos por primera vez (puede tardar un minuto)...');
        await pg.initialise();
    }
    if (await puertoAbierto(PUERTO_PG) && await baseResponde()) {
        log('La base de datos ya estaba encendida.');
    } else {
        // Un cierre brusco (ventana cerrada de golpe, corte de luz) puede dejar procesos
        // huérfanos ocupando el puerto y el archivo de bloqueo: se limpian antes de encender.
        await cerrarHuerfanos();
        fs.rmSync(path.join(PG_DIR, 'postmaster.pid'), { force: true });
        log('Encendiendo la base de datos...');
        await pg.start();
        baseEncendidaAqui = true;
    }
    if (nueva) await pg.createDatabase('patyca');

    // ---------- 2. Configuración del servidor ----------
    Object.assign(process.env, {
        DATABASE_URL: `postgres://postgres:${config.clave_base_datos}@localhost:${PUERTO_PG}/patyca`,
        JWT_SECRET: config.clave_sesiones,
        JWT_EXPIRA: '12h',
        PORT: String(PUERTO),
        ADMIN_EMAIL: 'patricia@patyca.cl',
        ADMIN_NOMBRE: 'Patricia Norambuena',
        ADMIN_PASSWORD: '1234',
    });

    if (nueva) {
        // Tablas, datos maestros reales y usuario administrador.
        const { pool } = require('../src/db');
        const bcrypt = require('bcryptjs');
        const leer = archivo => fs.readFileSync(path.join(BACKEND, 'db', archivo), 'utf8');
        await pool.query(leer('schema.sql'));
        await pool.query(leer('seed.sql'));
        await pool.query(
            `INSERT INTO usuarios (email, nombre, password_hash, rol_id)
             SELECT $1, $2, $3, id FROM roles WHERE nombre = 'Administradora'`,
            [process.env.ADMIN_EMAIL, process.env.ADMIN_NOMBRE, await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)]
        );
        log('Base de datos creada con los datos de PATYCA.');
    }

    // ---------- 3. Servidor ----------
    if (await puertoAbierto(PUERTO)) {
        log(`Ya hay un sistema funcionando en http://localhost:${PUERTO}`);
        if (!PREPARAR) abrirNavegador();
        return;
    }
    require('../src/server');
    for (let i = 0; i < 40 && !(await puertoAbierto(PUERTO)); i++) await new Promise(r => setTimeout(r, 250));

    if (PREPARAR) {
        // Datos de demostración + pesos reales (usan la API como un usuario).
        const ejecutar = script => new Promise((resolve, reject) =>
            execFile(process.execPath, [path.join(BACKEND, 'scripts', script)], { env: process.env }, (error, salida) => {
                process.stdout.write(salida);
                error ? reject(error) : resolve();
            }));
        await ejecutar('demo.js');
        await ejecutar('importar-pesos.js');
        log('Datos de demostración cargados.');
        await apagar(0);
        return;
    }

    console.log('');
    log(`Sistema listo: http://localhost:${PUERTO}`);
    log('Usuario: patricia@patyca.cl   Clave: 1234');
    console.log('');
    log('>>> NO CIERRE ESTA VENTANA mientras use el sistema. <<<');
    log('    Para apagarlo, cierre esta ventana.');
    console.log('');
    abrirNavegador();
}

main().catch(async error => {
    console.error('');
    console.error('  No se pudo iniciar PATYCA ERP.');
    // Si la base se cierra al arrancar, embedded-postgres no entrega un error con detalle.
    console.error(`  Detalle: ${error?.message || 'la base de datos no logró encender.'}`);
    console.error('  Pruebe moviendo la carpeta al Escritorio. Si sigue, reinicie el computador e intente de nuevo.');
    await apagar(1);
});
