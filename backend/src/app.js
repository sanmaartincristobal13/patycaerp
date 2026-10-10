const path = require('path');
const express = require('express');
const { requiereSesion, requiereModulo } = require('./lib/auth');
const { manejadorErrores } = require('./lib/errores');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ------------------------------------------------------
// API
// ------------------------------------------------------

const api = express.Router();

api.get('/salud', (req, res) => res.json({ ok: true }));
api.use('/auth', require('./routes/auth'));

// Todo lo que sigue exige sesión iniciada.
api.use(requiereSesion);

// Lectura de maestros y catálogos: cualquier usuario con sesión.
// Las escrituras validan el módulo dentro de cada router.
api.use(require('./routes/configuracion'));
api.use(require('./routes/maestros'));
api.use('/inventario', require('./routes/inventario'));

api.use('/inicio', require('./routes/inicio'));
api.use('/ventas', requiereModulo('ventas'), require('./routes/ventas'));
api.use('/ventas-resumen', requiereModulo('ventas'), require('./routes/ventas-resumen'));
api.use('/reportes', requiereModulo('ventas'), require('./routes/reportes'));
api.use('/cotizaciones', requiereModulo('cotizaciones'), require('./routes/cotizaciones'));
api.use('/compras', requiereModulo('compras'), require('./routes/compras'));
api.use('/finanzas', requiereModulo('finanzas'), require('./routes/finanzas'));
api.use('/produccion', requiereModulo('produccion'), require('./routes/produccion'));
api.use('/proyeccion', requiereModulo('reportes'), require('./routes/proyeccion'));
api.use(require('./routes/actividad'));

api.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use('/api', api);

// ------------------------------------------------------
// FRONT (archivos estáticos de la carpeta Patyca/)
// Solo se publican estas carpetas y páginas, nunca backend/.
// ------------------------------------------------------

const front = path.join(__dirname, '..', '..');

for (const carpeta of ['css', 'js', 'assets']) {
    app.use(`/${carpeta}`, express.static(path.join(front, carpeta)));
}
app.get('/', (req, res) => res.redirect('/login'));
// Se aceptan con y sin extensión: /login y /login.html
for (const pagina of ['login', 'index']) {
    app.get([`/${pagina}`, `/${pagina}.html`], (req, res) => res.sendFile(path.join(front, `${pagina}.html`)));
}

app.use(manejadorErrores);

module.exports = app;
