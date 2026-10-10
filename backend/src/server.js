const config = require('./config');
const app = require('./app');
const { pool } = require('./db');

const URL = `http://localhost:${config.port}`;

// Antes de abrir el puerto, confirma que la base de datos responde.
pool.query('SELECT 1')
    .then(() => {
        // En Express 5 esta función recibe el error si no se pudo abrir el puerto.
        app.listen(config.port, error => {
            if (!error) return console.log(`PATYCA ERP escuchando en ${URL}`);
            if (error.code === 'EADDRINUSE') {
                console.log(`PATYCA ERP ya está encendido en ${URL}`);
                process.exit(0);
            }
            console.error(error);
            process.exit(1);
        });
    })
    .catch(error => {
        console.error('No se pudo conectar a la base de datos (PostgreSQL).');
        console.error('Verifique que PostgreSQL esté instalado y encendido, y los datos de DATABASE_URL en backend/.env.');
        console.error(`Detalle: ${error.message}`);
        process.exit(1);
    });
