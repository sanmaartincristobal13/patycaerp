// ======================================================
// PATYCA ERP - UTILIDADES DE INTERFAZ
// ======================================================

// ---------- Formato ----------

// Negativos como "-$1.004.000" (Intl en es-CL los deja "$-1.004.000").
function fmtCLP(numero) {
    const valor = Math.round(Number(numero || 0));
    const texto = new Intl.NumberFormat('es-CL', {
        style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(Math.abs(valor));
    return valor < 0 ? `-${texto}` : texto;
}

function fmtNumero(numero) {
    if (numero === null || numero === undefined) return '—';
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(numero);
}

// "2026-10-01" -> "oct 26" (o el formato que se indique)
const fmtMes = (mesIso, opciones = { month: 'short', year: '2-digit' }) => {
    const [a, m] = mesIso.split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('es-CL', opciones).replace('.', '');
};

// $1.250.000 -> "$1,3M"; $850.000 -> "$850k"
const fmtCorto = valor => valor >= 1e6
    ? `$${(valor / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`
    : `$${Math.round(valor / 1e3)}k`;

// "2026-10-09" -> "09-10-2026"
function fmtFecha(fecha) {
    if (!fecha) return '—';
    const [a, m, d] = String(fecha).slice(0, 10).split('-');
    return `${d}-${m}-${a}`;
}

function fmtFechaHora(iso) {
    return iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

// "Atrasada 2 días", "Vence hoy", "Faltan 3 días"
function textoPlazo(dias) {
    if (dias === null || dias === undefined) return 'Sin fecha';
    if (dias < 0) return `Atrasada ${-dias} día${dias === -1 ? '' : 's'}`;
    if (dias === 0) return 'Vence hoy';
    return dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`;
}

function hoy() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Escapa texto antes de insertarlo como HTML (evita inyección de código).
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// ---------- Componentes ----------

// Insignia de estado. Reutiliza las clases de color de dashboard.css.
function badge(texto) {
    const clase = {
        'Pagada': 'pill-green', 'Entregada': 'pill-green', 'Terminada': 'pill-green',
        'Parcial': 'pill-yellow', 'En proceso': 'pill-yellow', 'Por entregar': 'pill-yellow',
        'Pendiente': 'pill-red',
        // Reposición y alertas de producción
        'Crítico': 'pill-red', 'Atrasada': 'pill-red',
        'Comprar': 'pill-yellow', 'Por vencer': 'pill-yellow',
        'Cubierto': 'pill-green', 'OK': 'pill-green', 'A tiempo': 'pill-green',
    }[texto] || 'pill-gray';
    return `<span class="pill ${clase}">${esc(texto)}</span>`;
}

// Tabla a partir de columnas [{titulo, valor: fila => html, clase}] y filas.
// Con más de "porPagina" filas se pagina (10 por defecto; 0 = sin paginar).
// Todas las filas se dibujan y la paginación solo las muestra/oculta, así los
// botones de cada fila quedan conectados aunque estén en otra página.
function tabla(columnas, filas, vacio = 'No hay registros.', { porPagina = 10 } = {}) {
    if (!filas.length) return `<div class="empty">${esc(vacio)}</div>`;
    const paginar = porPagina > 0 && filas.length > porPagina;
    const html = `
        <table>
            <thead><tr>${columnas.map(c => `<th class="${c.clase || ''}">${esc(c.titulo)}</th>`).join('')}</tr></thead>
            <tbody>
                ${filas.map((f, i) => `<tr ${paginar && i >= porPagina ? 'hidden' : ''}>${columnas.map(c => `<td class="${c.clase || ''}">${c.valor(f)}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>`;
    if (!paginar) return html;
    return `
        <div class="tabla-paginada" data-pagina="0" data-por-pagina="${porPagina}">
            ${html}
            <div class="paginacion">
                <label>Mostrar
                    <select data-tamano-pagina>${[...new Set([porPagina, 10, 20, 50, 100])].sort((a, b) => a - b).map(n => `<option ${n === porPagina ? 'selected' : ''}>${n}</option>`).join('')}</select>
                </label>
                <span data-info>1–${porPagina} de ${filas.length}</span>
                <button type="button" class="btn btn-small" data-pag="-1" aria-label="Página anterior" disabled>‹</button>
                <button type="button" class="btn btn-small" data-pag="1" aria-label="Página siguiente">›</button>
            </div>
        </div>`;
}

function actualizarPaginacion(caja) {
    const filas = [...caja.querySelectorAll(':scope > table > tbody > tr')];
    const porPagina = Number(caja.dataset.porPagina);
    const paginas = Math.ceil(filas.length / porPagina);
    const pagina = Math.min(Math.max(0, Number(caja.dataset.pagina)), paginas - 1);
    caja.dataset.pagina = pagina;
    filas.forEach((fila, i) => (fila.hidden = i < pagina * porPagina || i >= (pagina + 1) * porPagina));
    const desde = pagina * porPagina + 1;
    caja.querySelector('[data-info]').textContent = `${desde}–${Math.min(filas.length, desde + porPagina - 1)} de ${filas.length}`;
    caja.querySelector('[data-pag="-1"]').disabled = pagina === 0;
    caja.querySelector('[data-pag="1"]').disabled = pagina >= paginas - 1;
}

document.addEventListener('click', event => {
    const boton = event.target.closest('.tabla-paginada [data-pag]');
    if (!boton) return;
    const caja = boton.closest('.tabla-paginada');
    caja.dataset.pagina = Number(caja.dataset.pagina) + Number(boton.dataset.pag);
    actualizarPaginacion(caja);
});

document.addEventListener('change', event => {
    if (!event.target.matches('.tabla-paginada [data-tamano-pagina]')) return;
    const caja = event.target.closest('.tabla-paginada');
    caja.dataset.porPagina = event.target.value;
    caja.dataset.pagina = 0;
    actualizarPaginacion(caja);
});

function opciones(lista, { valor = 'id', texto = 'nombre', seleccionado = null, vacio = null } = {}) {
    return (vacio !== null ? `<option value="">${esc(vacio)}</option>` : '') +
        lista.map(item => {
            const v = typeof valor === 'function' ? valor(item) : item[valor];
            const t = typeof texto === 'function' ? texto(item) : item[texto];
            return `<option value="${esc(v)}" ${String(v) === String(seleccionado) ? 'selected' : ''}>${esc(t)}</option>`;
        }).join('');
}

function campo(etiqueta, control, clase = '') {
    return `<div class="field ${clase}"><label>${esc(etiqueta)}</label>${control}</div>`;
}

// ---------- Modal ----------

const modal = {
    abrir(titulo, contenido, { ancho = false } = {}) {
        const caja = document.getElementById('modalCaja');
        caja.className = 'modal' + (ancho ? ' modal-xl' : '');
        caja.innerHTML = `
            <div class="modal-top">
                <h2>${esc(titulo)}</h2>
                <button class="icon-close" type="button" data-cerrar>×</button>
            </div>
            ${contenido}`;
        document.getElementById('modal').classList.add('open');
        document.body.classList.add('modal-open');
        caja.querySelector('input, select, textarea')?.focus();
        return caja;
    },

    cerrar() {
        document.getElementById('modal').classList.remove('open');
        document.body.classList.remove('modal-open');
        document.getElementById('modalCaja').innerHTML = '';
        // Aviso para que la vista visible se actualice (ej. Inicio tras entregar un encargo).
        document.dispatchEvent(new Event('modal-cerrado'));
    },
};

document.addEventListener('click', event => {
    if (event.target.matches('[data-cerrar]') || event.target.id === 'modal') modal.cerrar();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') modal.cerrar();
});

// Conecta un <form> del modal: al enviar ejecuta "accion(datos)".
// Si falla, muestra el mensaje del backend sin cerrar el modal.
function alEnviar(form, accion) {
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const boton = form.querySelector('[type=submit]');
        const error = form.querySelector('.error-form');
        boton.disabled = true;
        if (error) error.textContent = '';
        try {
            await accion(Object.fromEntries(new FormData(form)));
        } catch (e) {
            if (error) error.textContent = e.message;
            else aviso(e.message, true);
        } finally {
            boton.disabled = false;
        }
    });
}

const PIE_FORM = (texto = 'Guardar') => `
    <p class="error-form"></p>
    <div class="modal-actions">
        <button type="button" class="btn" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-primary">${esc(texto)}</button>
    </div>`;

// ---------- Avisos ----------

let temporizadorAviso;

function aviso(texto, esError = false) {
    const el = document.getElementById('toast');
    el.textContent = texto;
    el.className = 'toast visible' + (esError ? ' error' : '');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => (el.className = 'toast'), 3500);
}

// Ejecuta una acción de un botón mostrando el error si falla.
async function intentar(accion, mensajeOk) {
    try {
        await accion();
        if (mensajeOk) aviso(mensajeOk);
    } catch (e) {
        aviso(e.message, true);
    }
}

// Convierte "" en null y textos numéricos en número (para enviar a la API).
function num(valor) {
    return valor === '' || valor === undefined || valor === null ? null : Number(valor);
}

// ---------- Vistas y datos compartidos ----------

const vistaVisible = nombre => !document.getElementById(`view-${nombre}`).hidden;

// Cada módulo se registra aquí: vistas.ventas = { iniciar(), cargar() }.
// iniciar() se llama una vez; cargar() cada vez que se abre la vista.
const vistas = {};

// Listas que usan varios módulos. Se piden una vez y se reutilizan;
// refrescar('productos') las vuelve a pedir después de un cambio.
const compartido = (() => {
    const rutas = {
        catalogos: '/catalogos',
        productos: '/productos',
        establecimientos: '/establecimientos',
        materiales: '/materiales',
        proveedores: '/proveedores',
    };
    const cache = {};
    return {
        obtener(nombre) {
            cache[nombre] ??= api.get(rutas[nombre]).catch(e => { delete cache[nombre]; throw e; });
            return cache[nombre];
        },
        refrescar(nombre) {
            delete cache[nombre];
        },
    };
})();

// Etiqueta de un producto para listas: "Escuela Numpay · Polera Polo M/C"
function nombreProducto(p) {
    return `${p.establecimiento} · ${p.nombre}`;
}

// Todas las tallas de un producto con su precio: [{talla, precio}]
function tallasProducto(p) {
    return (p?.precios || []).flatMap(g => g.tallas.map(talla => ({ talla, precio: g.precio })));
}
