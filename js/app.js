// ======================================================
// PATYCA ERP - APP PRINCIPAL
// ======================================================
// Sesión, menú según permisos y navegación entre vistas.
// La URL guarda la vista actual (#ventas), así recargar la página
// mantiene al usuario donde estaba.
// ======================================================

const usuario = JSON.parse(sessionStorage.getItem('usuarioPatyca') || 'null');

// Abierto como archivo: abrir-local.js redirige al servidor; aquí no se hace nada.
const desdeArchivo = location.protocol === 'file:';

if (!desdeArchivo && (!usuario || !sessionStorage.getItem('tokenPatyca'))) {
    cerrarSesion();
}

const puede = modulo => usuario?.modulos?.includes(modulo);


// ---------- Usuario en la barra superior ----------

document.getElementById('userName').textContent = usuario?.nombre || '';
document.getElementById('userRole').textContent = usuario?.rol || '';
document.getElementById('userAvatar').textContent = (usuario?.nombre || '?')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
document.getElementById('menuBtn').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open'));


// ---------- Menú según permisos ----------

const botonesMenu = [...document.querySelectorAll('#nav [data-view]')];

botonesMenu.forEach(boton => {
    boton.hidden = !puede(boton.dataset.modulo);
    boton.addEventListener('click', () => (location.hash = boton.dataset.view));
});

const vistasPermitidas = botonesMenu.filter(b => !b.hidden).map(b => b.dataset.view);


// ---------- Navegación ----------

const iniciadas = new Set();

async function mostrarVista() {
    const pedida = location.hash.slice(1);
    const nombre = vistasPermitidas.includes(pedida) ? pedida : vistasPermitidas[0];
    if (!nombre) return;

    document.querySelectorAll('.view').forEach(v => (v.hidden = v.id !== `view-${nombre}`));
    botonesMenu.forEach(b => b.classList.toggle('active', b.dataset.view === nombre));
    document.getElementById('breadcrumb').textContent =
        botonesMenu.find(b => b.dataset.view === nombre).querySelector('span:last-child').textContent;
    document.getElementById('sidebar').classList.remove('open');

    const vista = vistas[nombre];
    if (!vista) return;
    try {
        if (!iniciadas.has(nombre)) {
            iniciadas.add(nombre);
            await vista.iniciar?.();
        }
        await vista.cargar();
    } catch (e) {
        aviso(e.message, true);
    }
}

window.addEventListener('hashchange', mostrarVista);
if (!desdeArchivo) mostrarVista();
