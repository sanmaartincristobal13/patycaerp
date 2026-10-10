// ======================================================
// PATYCA ERP - CLIENTE DE LA API
// ======================================================
//
// Todas las llamadas al backend pasan por aquí:
//   const productos = await api.get('/productos');
//   await api.post('/ventas', { ... });
//
// Si la sesión expiró, vuelve al login.
// Si la API responde un error, lanza un Error con el mensaje del backend.
// ======================================================

const api = (() => {

    async function solicitar(metodo, ruta, cuerpo) {
        const token = sessionStorage.getItem('tokenPatyca');

        const respuesta = await fetch('/api' + ruta, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: 'Bearer ' + token }),
            },
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });

        if (respuesta.status === 401) {
            cerrarSesion();
            throw new Error('La sesión expiró.');
        }

        const datos = respuesta.status === 204 ? null : await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos?.error || 'Error inesperado del servidor.');
        }
        return datos;
    }

    return {
        get: ruta => solicitar('GET', ruta),
        post: (ruta, cuerpo = {}) => solicitar('POST', ruta, cuerpo),
        put: (ruta, cuerpo = {}) => solicitar('PUT', ruta, cuerpo),
        patch: (ruta, cuerpo = {}) => solicitar('PATCH', ruta, cuerpo),
        delete: ruta => solicitar('DELETE', ruta),
    };

})();


function cerrarSesion() {
    sessionStorage.removeItem('tokenPatyca');
    sessionStorage.removeItem('usuarioPatyca');
    window.location.href = 'login.html';
}
