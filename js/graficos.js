// ======================================================
// COMPONENTES VISUALES REUTILIZABLES
// ======================================================
// graficoLineas()  → gráfico mensual de líneas en SVG con tooltip.
// calendarioMes()  → calendario mensual con eventos por día.
// Sin librerías externas.
// ======================================================

// Colores de series (paleta de referencia validada: azul, naranjo, violeta, aqua).
const COLOR_SERIE = {
    ventas: '#2a78d6',
    proyeccion: '#eb6834',
    egresos: '#4a3aa7',
    escenario: '#1baf7a',
};

// ------------------------------------------------------
// GRÁFICO DE LÍNEAS
// ------------------------------------------------------
// opciones:
//   etiquetas: ['2026-01-01', ...]           meses del eje X
//   series:    [{ nombre, color, punteada, puntos: [[indice, valor], ...] }]
//   divisor:   índice del último mes real (dibuja la línea "Proyección →"), opcional
//   alto:      alto en px (300 por defecto)
//   leyenda:   elemento donde dibujar la leyenda, opcional
//   extra:     i => html adicional para el tooltip del mes i, opcional
//   alClick:   i => acción al hacer clic en el mes i, opcional
function graficoLineas(contenedor, { etiquetas, series, divisor = null, alto = 300, leyenda = null, extra = null, alClick = null }) {
    if (leyenda) {
        leyenda.innerHTML = series.map(s =>
            `<span><i class="${s.punteada ? 'punteada' : ''}" style="color:${s.color}"></i>${esc(s.nombre)}</span>`).join('');
    }

    const ancho = Math.max(320, contenedor.clientWidth);
    const m = { izq: 52, der: 70, sup: 14, inf: 28 };
    const maxY = Math.max(1, ...series.flatMap(s => s.puntos.map(p => p[1]))) * 1.08;
    const x = i => m.izq + (i / Math.max(1, etiquetas.length - 1)) * (ancho - m.izq - m.der);
    const y = v => alto - m.inf - (v / maxY) * (alto - m.sup - m.inf);

    // Grilla con divisiones "redondas".
    const paso = Math.pow(10, Math.floor(Math.log10(maxY / 4)));
    const intervalo = [1, 2, 2.5, 5, 10].map(f => f * paso).find(v => maxY / v <= 5);
    const lineasY = Array.from({ length: Math.floor(maxY / intervalo) + 1 }, (_, i) => i * intervalo);
    const cadaN = Math.max(1, Math.ceil(etiquetas.length / (ancho < 640 ? 6 : 12)));
    const camino = puntos => puntos.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

    contenedor.innerHTML = `
        <svg viewBox="0 0 ${ancho} ${alto}" height="${alto}" role="img" aria-label="${esc(series.map(s => s.nombre).join(', '))} por mes">
            ${lineasY.map(v => `
                <line x1="${m.izq}" x2="${ancho - m.der}" y1="${y(v)}" y2="${y(v)}" stroke="#e9ecf0" stroke-width="1"/>
                <text x="${m.izq - 8}" y="${y(v) + 3}" text-anchor="end">${v ? fmtCorto(v) : '$0'}</text>`).join('')}
            ${divisor !== null && divisor < etiquetas.length - 1 ? `
                <line x1="${x(divisor + 0.5)}" x2="${x(divisor + 0.5)}" y1="${m.sup}" y2="${alto - m.inf}" stroke="#d4dbe3" stroke-width="1"/>
                <text x="${x(divisor + 0.5) + 6}" y="${m.sup + 10}">Proyección →</text>` : ''}
            ${etiquetas.map((mes, i) => i % cadaN === 0
                ? `<text x="${x(i)}" y="${alto - 8}" text-anchor="middle">${fmtMes(mes)}</text>` : '').join('')}
            ${series.map(s => `
                <path d="${camino(s.puntos)}" fill="none" stroke="${s.color}" stroke-width="2"
                    stroke-linejoin="round" stroke-linecap="round" ${s.punteada ? 'stroke-dasharray="6 4"' : ''}/>`).join('')}
            ${series.filter(s => s.etiquetaFinal !== false && s.puntos.length).map(s => {
                const [i, v] = s.puntos[s.puntos.length - 1];
                return `<text class="etiqueta-final" x="${x(i) + 6}" y="${y(v) + 4}">${fmtCorto(v)}</text>`;
            }).join('')}
            <line class="cursor" x1="0" x2="0" y1="${m.sup}" y2="${alto - m.inf}" stroke="#667085" stroke-width="1" visibility="hidden"/>
            <g class="marcas"></g>
            <rect x="${m.izq}" y="${m.sup}" width="${ancho - m.izq - m.der}" height="${alto - m.sup - m.inf}" fill="transparent"/>
        </svg>
        <div class="tooltip-grafico" hidden></div>`;

    // Hover: línea vertical + tooltip con los valores del mes más cercano.
    const svg = contenedor.querySelector('svg');
    const cursor = svg.querySelector('.cursor');
    const marcas = svg.querySelector('.marcas');
    const tooltip = contenedor.querySelector('.tooltip-grafico');
    const area = svg.querySelector('rect');

    const mostrar = event => {
        const caja = svg.getBoundingClientRect();
        const px = (event.clientX - caja.left) * (ancho / caja.width);
        const i = Math.max(0, Math.min(etiquetas.length - 1,
            Math.round((px - m.izq) / (ancho - m.izq - m.der) * (etiquetas.length - 1))));
        // En el mes de empalme, la proyección repite el valor real: no se muestra dos veces.
        const valores = series
            .map(s => ({ s, punto: s.puntos.find(p => p[0] === i) }))
            .filter(({ s, punto }) => punto && !(s.desdeDivisor && i === divisor));

        cursor.setAttribute('x1', x(i));
        cursor.setAttribute('x2', x(i));
        cursor.setAttribute('visibility', 'visible');
        marcas.innerHTML = valores.map(({ s, punto }) =>
            `<circle cx="${x(i)}" cy="${y(punto[1])}" r="4" fill="${s.color}" stroke="#ffffff" stroke-width="2"/>`).join('');
        tooltip.innerHTML = `<strong>${fmtMes(etiquetas[i], { month: 'long', year: 'numeric' })}</strong>` +
            valores.map(({ s, punto }) => `<div><span><i style="background:${s.color}"></i>${esc(s.nombre)}</span><b>${fmtCLP(punto[1])}</b></div>`).join('') +
            (extra ? extra(i) : '');
        tooltip.hidden = false;
        const izquierda = (x(i) / ancho) * caja.width;
        tooltip.style.left = `${Math.max(4, Math.min(izquierda + 12, caja.width - tooltip.offsetWidth - 4))}px`;
        tooltip.style.top = '20px';
    };
    area.addEventListener('mousemove', mostrar);
    area.addEventListener('click', event => {
        mostrar(event);   // en pantallas táctiles el clic muestra el tooltip
        if (!alClick) return;
        const caja = svg.getBoundingClientRect();
        const px = (event.clientX - caja.left) * (ancho / caja.width);
        alClick(Math.round((px - m.izq) / (ancho - m.izq - m.der) * (etiquetas.length - 1)));
    });
    if (alClick) area.style.cursor = 'pointer';
    area.addEventListener('mouseleave', () => {
        cursor.setAttribute('visibility', 'hidden');
        marcas.innerHTML = '';
        tooltip.hidden = true;
    });
}

// ------------------------------------------------------
// CALENDARIO MENSUAL
// ------------------------------------------------------
// opciones:
//   mes:      Date con el primer día del mes a mostrar
//   eventos:  [{ fecha: 'YYYY-MM-DD', texto, titulo, clase, alClick }]
//             clase: 'atrasada' | 'por-vencer' | 'terminada' | ''
//   compacto: true = celdas bajas (para Inicio)
//   alCambiarMes(nuevoMes): se llama al navegar entre meses
function calendarioMes(contenedor, { mes, eventos, compacto = false, alCambiarMes }) {
    const anio = mes.getFullYear();
    const numMes = mes.getMonth();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // La grilla parte el lunes de la semana del día 1 y cubre las semanas necesarias.
    const inicio = new Date(anio, numMes, 1);
    inicio.setDate(1 - ((inicio.getDay() + 6) % 7));
    const diasMes = new Date(anio, numMes + 1, 0).getDate();
    const semanas = Math.ceil((diasMes + ((new Date(anio, numMes, 1).getDay() + 6) % 7)) / 7);
    const dias = Array.from({ length: semanas * 7 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));

    const porDia = {};
    eventos.forEach((e, k) => (porDia[e.fecha] ??= []).push({ ...e, k }));

    contenedor.innerHTML = `
        <div class="cal-cabecera">
            <button class="btn btn-small" data-mes="-1" aria-label="Mes anterior">‹</button>
            <h3>${mes.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h3>
            <span>
                <button class="btn btn-small" data-mes="0">Hoy</button>
                <button class="btn btn-small" data-mes="1" aria-label="Mes siguiente">›</button>
            </span>
        </div>
        <div class="cal ${compacto ? 'compacto' : ''}">
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="cal-nombre">${d}</div>`).join('')}
            ${dias.map(d => {
                const clave = iso(d);
                const clases = ['cal-dia', d.getMonth() !== numMes ? 'fuera' : '', clave === hoy() ? 'hoy' : ''].join(' ');
                return `<div class="${clases}">
                    <div class="cal-num">${d.getDate()}</div>
                    ${(porDia[clave] || []).map(e => `
                        <button class="cal-orden ${e.clase || ''}" data-evento="${e.k}" title="${esc(e.titulo || e.texto)}">${esc(e.texto)}</button>`).join('')}
                </div>`;
            }).join('')}
        </div>
        <div class="leyenda">
            <span><span class="pill pill-red">Atrasada</span></span>
            <span><span class="pill pill-yellow">Por vencer</span></span>
            <span><span class="pill pill-gray">A tiempo</span></span>
        </div>`;

    contenedor.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
        const paso = num(b.dataset.mes);
        const [a, mm] = hoy().split('-').map(Number);
        alCambiarMes(paso === 0 ? new Date(a, mm - 1, 1) : new Date(anio, numMes + paso, 1));
    }));
    contenedor.querySelectorAll('[data-evento]').forEach(b => b.addEventListener('click', () =>
        eventos[num(b.dataset.evento)].alClick?.()));
}

const CLASE_ALERTA = { 'Atrasada': 'atrasada', 'Por vencer': 'por-vencer', 'Terminada': 'terminada' };
