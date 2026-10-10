// ======================================================
// Crea la VERSIÓN PORTÁTIL de PATYCA ERP
// ======================================================
//   npm run portatil                    -> ../../PATYCA-portatil
//   npm run portatil -- <carpeta>       -> en la carpeta indicada
//
// Resultado: una carpeta que funciona en cualquier Windows sin instalar
// nada (trae Node.js y PostgreSQL embebido) y con datos de demostración.
// Para compartirla, comprimirla en .zip; quien la reciba debe "Extraer todo"
// y hacer doble clic en "Iniciar PATYCA".
// ======================================================

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
const PROYECTO = path.resolve(BACKEND, '..');
const DESTINO = path.resolve(process.argv[2] || path.join(PROYECTO, '..', 'PATYCA-portatil'));
const APP = path.join(DESTINO, 'app');
const paso = texto => console.log(`· ${texto}`);

if (fs.existsSync(DESTINO)) {
    console.error(`Ya existe ${DESTINO}. Bórrela o indique otra carpeta.`);
    process.exit(1);
}

// 1. Archivos del sistema (sin .env ni node_modules)
paso('Copiando el sistema...');
for (const item of ['index.html', 'login.html', 'css', 'js', 'assets']) {
    fs.cpSync(path.join(PROYECTO, item), path.join(APP, item), { recursive: true });
}
for (const item of ['src', 'db', 'scripts', 'package.json', 'package-lock.json', 'README.md']) {
    fs.cpSync(path.join(BACKEND, item), path.join(APP, 'backend', item), { recursive: true });
}

// 2. Componentes: los del servidor + PostgreSQL embebido
paso('Instalando componentes (incluye PostgreSQL, puede tardar)...');
const opcionesNpm = { cwd: path.join(APP, 'backend'), stdio: 'inherit' };
execSync('npm install --omit=dev --no-audit --no-fund', opcionesNpm);
execSync('npm install --no-save --no-audit --no-fund embedded-postgres@18.4.0-beta.17', opcionesNpm);

// 3. Node.js incluido
paso('Copiando Node.js...');
fs.mkdirSync(path.join(DESTINO, 'node'), { recursive: true });
fs.copyFileSync(process.execPath, path.join(DESTINO, 'node', 'node.exe'));

// 4. Lanzador y LEEME
paso('Creando el lanzador...');
const bat = [
    '@echo off',
    'rem PATYCA ERP - version portatil. Doble clic para iniciar.',
    'chcp 65001 >nul',
    'title PATYCA ERP',
    'cd /d "%~dp0"',
    '"%~dp0node\\node.exe" "%~dp0app\\backend\\scripts\\portatil.mjs"',
    'if errorlevel 1 pause',
    '',
].join('\r\n');
fs.writeFileSync(path.join(DESTINO, 'Iniciar PATYCA.bat'), bat);

fs.writeFileSync(path.join(DESTINO, 'LEEME.txt'), [
    'PATYCA ERP - Versión portátil (demostración)',
    '============================================',
    '',
    'CÓMO USARLO',
    '1. Si recibió un archivo .zip: clic derecho > "Extraer todo..." (no lo abra directo desde el .zip).',
    '   Extráigalo en una ubicación corta, como el Escritorio o Documentos.',
    '2. En la carpeta extraída, doble clic en "Iniciar PATYCA".',
    '   La primera vez Windows puede preguntar si permite el acceso: elija "Permitir".',
    '3. Se abrirá el navegador. Ingrese con:',
    '      Correo: patricia@patyca.cl',
    '      Clave:  1234',
    '4. Deje abierta la ventana negra mientras usa el sistema.',
    '   Para apagarlo, cierre esa ventana.',
    '',
    'No necesita instalar nada. Los datos quedan guardados en la carpeta "datos".',
    '',
    'IMPORTANTE',
    '- Es una versión de DEMOSTRACIÓN: las ventas, encargos y clientes son de prueba.',
    '  Los precios de 4 colegios y los pesos de las prendas son datos reales de PATYCA.',
    '- Para volver a los datos iniciales: con el sistema apagado, borre la carpeta "datos"',
    '  (se vuelve a crear sola, sin los datos de demostración).',
    '- Si aparece "Ya hay un sistema funcionando", el sistema ya estaba abierto en otra ventana.',
    '',
].join('\r\n'), 'utf8');

// 5. Base de datos con datos de demostración
paso('Creando la base de datos con datos de demostración...');
execFileSync(path.join(DESTINO, 'node', 'node.exe'), [path.join(APP, 'backend', 'scripts', 'portatil.mjs'), '--preparar'],
    { stdio: 'inherit', env: { ...process.env, PORT: '3998' } });

paso(`Listo: ${DESTINO}`);
