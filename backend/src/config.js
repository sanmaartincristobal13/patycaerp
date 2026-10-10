// Lee la configuración desde variables de entorno (archivo .env).

function requerida(nombre) {
    const valor = process.env[nombre];
    if (!valor) {
        throw new Error(`Falta la variable de entorno ${nombre}. Revisa backend/.env (ver .env.example).`);
    }
    return valor;
}

module.exports = {
    // En Vercel, la integración con Neon crea POSTGRES_URL (y a veces DATABASE_URL).
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || requerida('DATABASE_URL'),
    jwtSecret: requerida('JWT_SECRET'),
    jwtExpira: process.env.JWT_EXPIRA || '12h',
    port: Number(process.env.PORT) || 3000,
};
