// Paso de "build" en Vercel: copia SOLO el front a public/.
// Así Vercel publica como archivos estáticos únicamente las páginas, estilos
// e imágenes; el código del backend, la base de datos y el .env nunca quedan
// accesibles desde internet. La API se publica aparte como función (api/index.js).
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const PUBLICO = path.join(RAIZ, 'public');

fs.rmSync(PUBLICO, { recursive: true, force: true });
for (const item of ['index.html', 'login.html', 'css', 'js', 'assets']) {
    fs.cpSync(path.join(RAIZ, item), path.join(PUBLICO, item), { recursive: true });
}
console.log('Front copiado a public/');
