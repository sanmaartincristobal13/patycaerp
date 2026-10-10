// Punto de entrada de la API en Vercel.
// Vercel ejecuta la app Express como función serverless; todas las rutas
// /api/* llegan aquí (ver vercel.json). Localmente se sigue usando
// backend/src/server.js.
module.exports = require('../backend/src/app');
