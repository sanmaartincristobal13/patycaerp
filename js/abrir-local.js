// ======================================================
// PATYCA ERP - APERTURA DESDE ARCHIVO
// ======================================================
// Si se abre index.html o login.html con doble clic (file:///...),
// la página no puede hablar con el servidor. Este script:
//   · si el servidor está encendido, redirige a http://localhost:3000
//   · si no, muestra cómo encenderlo ("Iniciar PATYCA").
// Desde el servidor (http://...) no hace nada.
// ======================================================

// Marca que los archivos del sistema se cargaron (ver el aviso en index.html y login.html).
window.PATYCA_ARCHIVOS = true;

(function () {
    if (location.protocol !== 'file:') return;

    const SERVIDOR = 'http://localhost:3000';
    const pagina = location.pathname.split('/').pop() || 'login.html';

    // Oculta la página mientras se verifica, para que no intente cargar datos.
    document.documentElement.style.visibility = 'hidden';

    // "no-cors": solo interesa saber si el servidor responde.
    fetch(`${SERVIDOR}/api/salud`, { mode: 'no-cors', cache: 'no-store' })
        .then(() => location.replace(`${SERVIDOR}/${pagina}`))
        .catch(() => {
            document.documentElement.style.visibility = 'visible';
            document.body.innerHTML = `
                <div style="max-width:520px;margin:12vh auto;padding:28px;font-family:Inter,Arial,sans-serif;
                            border:1px solid #e3e7ec;border-radius:14px;background:#fff;color:#172033;
                            box-shadow:0 16px 40px rgba(16,24,40,.10)">
                    <div style="width:42px;height:42px;border-radius:10px;background:#c69b47;color:#162033;
                                display:grid;place-items:center;font-weight:700;font-size:24px">P</div>
                    <h1 style="font-size:22px;margin:16px 0 8px">PATYCA ERP no está encendido</h1>
                    <p style="color:#52514e;line-height:1.5;margin:0 0 14px">
                        Para usar el sistema, haga doble clic en <strong>«Iniciar PATYCA»</strong>
                        (en la carpeta del sistema). Se abrirá solo en el navegador.
                    </p>
                    <p style="color:#667085;font-size:12px;margin:0">
                        Si ya lo inició, espere unos segundos y
                        <a href="" style="color:#2a78d6">vuelva a intentar</a>.
                    </p>
                </div>`;
            document.body.style.background = '#f4f6f8';
        });
})();
