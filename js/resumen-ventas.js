// ======================================================
// VENTAS → RESUMEN DÍA / MES (métricas de gestión)
// ======================================================
// Día: cuánto entró a caja, cuántas ventas y por qué medio de pago.
// Mes: ingresos brutos y netos, recaudado, producto más vendido,
//      prendas confeccionadas vs vendidas, desglose por colegio y tipo,
//      y la lista de meses (para comparar, abrir o eliminar sus ventas).
// Ambos se exportan a Excel (CSV) o PDF para respaldo contable.
//   Recaudado = pagos recibidos (incluye abonos y saldos de días anteriores).
//   Vendido   = ventas registradas, cobradas o no. Montos con IVA.
// ======================================================

const resumenVentas = {

    modo: 'dia',
    fecha: null,     // "YYYY-MM-DD"
    mes: null,       // "YYYY-MM"
    datos: null,     // último resumen cargado (para exportar)
    iniciado: false,

    iniciar() {
        this.iniciado = true;
        const inputDia = document.getElementById('resVentasFecha');
        const inputMes = document.getElementById('resVentasMes');
        inputDia.max = hoy();
        inputMes.max = hoy().slice(0, 7);
        inputDia.addEventListener('change', () => { if (inputDia.value) { this.fecha = inputDia.value; this.cargar(); } });
        inputMes.addEventListener('change', () => { if (inputMes.value) { this.mes = inputMes.value; this.cargar(); } });

        document.querySelectorAll('#resVentasModo [data-modo]').forEach(b => b.addEventListener('click', () => {
            this.modo = b.dataset.modo;
            document.querySelectorAll('#resVentasModo [data-modo]').forEach(x => x.classList.toggle('active', x === b));
            this.cargar();
        }));
        document.querySelectorAll('#ventasResumen [data-res-paso]').forEach(b => b.addEventListener('click', () => {
            this.mover(Number(b.dataset.resPaso));
        }));
        document.getElementById('resVentasCsv').addEventListener('click', () => this.exportarCsv());
        document.getElementById('resVentasPdf').addEventListener('click', () => intentar(() => this.exportarPdf()));
    },

    // Día o mes anterior/siguiente (sin pasar de hoy).
    mover(paso) {
        if (this.modo === 'dia') {
            const [a, m, d] = this.fecha.split('-').map(Number);
            const nueva = new Date(a, m - 1, d + paso);
            const iso = `${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}-${String(nueva.getDate()).padStart(2, '0')}`;
            if (iso > hoy()) return;
            this.fecha = iso;
        } else {
            const [a, m] = this.mes.split('-').map(Number);
            const nueva = new Date(a, m - 1 + paso, 1);
            const iso = `${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}`;
            if (iso > hoy().slice(0, 7)) return;
            this.mes = iso;
        }
        this.cargar();
    },

    async cargar() {
        if (!this.iniciado) this.iniciar();
        this.fecha ??= hoy();
        this.mes ??= hoy().slice(0, 7);
        const esDia = this.modo === 'dia';
        const inputDia = document.getElementById('resVentasFecha');
        const inputMes = document.getElementById('resVentasMes');
        inputDia.hidden = !esDia;
        inputMes.hidden = esDia;
        inputDia.value = this.fecha;
        inputMes.value = this.mes;
        document.querySelectorAll('#resVentasModo [data-modo]').forEach(b => b.classList.toggle('active', b.dataset.modo === this.modo));
        document.querySelector('#ventasResumen [data-res-paso="1"]').disabled =
            esDia ? this.fecha >= hoy() : this.mes >= hoy().slice(0, 7);

        if (esDia) {
            this.datos = await api.get(`/reportes/dia/${this.fecha}`);
            this.dibujarDia(this.datos);
        } else {
            const [gestion, detalle, meses] = await Promise.all([
                api.get(`/reportes/gestion-mes/${this.mes}`),
                api.get(`/reportes/ventas-mes/${this.mes}`),
                api.get('/reportes/ventas-mes'),
            ]);
            this.datos = { ...gestion, colegios: detalle.colegios, tipos: detalle.tipos };
            this.dibujarMes(this.datos, meses);
        }
    },

    // Tabla de medios de pago con barra de proporción.
    tablaMedios(medios, total) {
        return tabla([
            { titulo: 'Medio de pago', valor: m => `${esc(m.nombre)}<div class="avance"><i style="width:${total ? Math.round(m.monto / total * 100) : 0}%"></i></div>` },
            { titulo: 'Pagos', clase: 'num', valor: m => m.pagos || '—' },
            { titulo: 'Monto', clase: 'num', valor: m => `<strong>${fmtCLP(m.monto)}</strong>` },
            { titulo: '%', clase: 'num', valor: m => total ? `${Math.round(m.monto / total * 100)}%` : '—' },
        ], medios, 'Sin medios de pago.', { porPagina: 0 });
    },

    dibujarDia(d) {
        const esHoy = d.fecha === hoy();
        document.getElementById('resVentasContenido').innerHTML = `
            <div class="franja">
                <div class="franja-item">
                    <span class="lbl">Total recaudado ${esHoy ? 'hoy' : 'el ' + fmtFecha(d.fecha)}</span>
                    <strong>${fmtCLP(d.recaudado)}</strong>
                    <span class="sub">${d.cantidad_pagos} pago${d.cantidad_pagos === 1 ? '' : 's'} recibido${d.cantidad_pagos === 1 ? '' : 's'}</span>
                </div>
                <div class="franja-item">
                    <span class="lbl">Ventas realizadas</span>
                    <strong>${d.cantidad}</strong>
                    <span class="sub">${fmtNumero(d.prendas)} prendas${d.encargos ? ` · ${d.encargos} encargo${d.encargos === 1 ? '' : 's'}` : ''}</span>
                </div>
                <div class="franja-item">
                    <span class="lbl">Total vendido</span>
                    <strong>${fmtCLP(d.vendido)}</strong>
                    <span class="sub">${d.por_cobrar ? `Queda por cobrar ${fmtCLP(d.por_cobrar)}` : 'Todo cobrado'}</span>
                </div>
            </div>
            <div class="two-col">
                <div class="panel">
                    <div class="panel-title-row"><h3>Por medio de pago</h3></div>
                    ${this.tablaMedios(d.por_medio, d.recaudado)}
                </div>
                <div class="panel">
                    <div class="panel-title-row"><h3>Pagos recibidos</h3></div>
                    ${tabla([
                        { titulo: 'Venta', valor: p => `<strong>${esc(p.venta)}</strong>${p.fecha_venta !== d.fecha
                            ? `<span class="sub">Saldo de venta del ${fmtFecha(p.fecha_venta)}</span>` : ''}` },
                        { titulo: 'Cliente', valor: p => esc(p.cliente_nombre) || '<span class="muted">Venta mesón</span>' },
                        { titulo: 'Medio', valor: p => esc(p.medio) },
                        { titulo: 'Monto', clase: 'num', valor: p => `<strong>${fmtCLP(p.monto)}</strong>` },
                    ], d.pagos, 'No se recibieron pagos este día.')}
                </div>
            </div>`;
    },

    dibujarMes(r, meses) {
        const nombreMes = fmtMes(r.mes, { month: 'long', year: 'numeric' });
        const pct = monto => r.bruto ? `${Math.round(monto / r.bruto * 100)}%` : '—';
        const barra = monto => `<div class="avance"><i style="width:${r.bruto ? Math.round(monto / r.bruto * 100) : 0}%"></i></div>`;
        const origen = [
            r.ventas_historia ? `historia ${fmtCLP(r.ventas_historia)}` : '',
            r.ventas_sin_detalle ? `sin detalle ${fmtCLP(r.ventas_sin_detalle)}` : '',
        ].filter(Boolean);
        const top = r.mas_vendido;
        document.getElementById('resVentasContenido').innerHTML = `
            <div class="franja">
                <div class="franja-item">
                    <span class="lbl">Ingresos brutos (con IVA)</span>
                    <strong>${fmtCLP(r.bruto)}</strong>
                    <span class="sub">Neto ${fmtCLP(r.neto)} + IVA ${fmtCLP(r.iva)}${origen.length ? `<br>Incluye ${origen.join(' y ')}` : ''}</span>
                </div>
                <div class="franja-item">
                    <span class="lbl">Recaudado en el mes</span>
                    <strong>${fmtCLP(r.recaudado)}</strong>
                    <span class="sub">Pagos recibidos en ${esc(nombreMes)}</span>
                </div>
                <div class="franja-item">
                    <span class="lbl">Ventas registradas</span>
                    <strong>${r.cantidad_ventas}</strong>
                    <span class="sub">${r.cantidad_ventas ? `Ticket promedio ${fmtCLP(r.ticket_promedio)}` : 'Sin ventas en el sistema'}</span>
                </div>
                <div class="franja-item">
                    <span class="lbl">Prendas confeccionadas / vendidas</span>
                    <strong>${fmtNumero(r.prendas_confeccionadas)} / ${fmtNumero(r.prendas_vendidas)}</strong>
                    <span class="sub">${r.ordenes_terminadas} ${r.ordenes_terminadas === 1 ? 'orden terminada' : 'órdenes terminadas'}${this.textoBalance(r)}</span>
                </div>
            </div>
            ${top ? `<p class="aviso destacado-mes"><strong>Producto más vendido:</strong> ${esc(top.nombre)} — ${fmtNumero(top.vendidas)} prendas (${fmtCLP(top.monto)})</p>` : ''}
            <div class="two-col">
                <div class="panel">
                    <div class="panel-title-row"><h3>Recaudado por medio de pago</h3></div>
                    ${this.tablaMedios(r.por_medio, r.recaudado)}
                </div>
                <div class="panel">
                    <div class="panel-title-row"><h3>Rotación por producto</h3></div>
                    ${tabla([
                        { titulo: 'Producto', valor: p => esc(p.nombre) },
                        { titulo: 'Vendidas', clase: 'num', valor: p => `<strong>${fmtNumero(p.vendidas)}</strong>` },
                        { titulo: 'Confeccionadas', clase: 'num', valor: p => p.confeccionadas ? fmtNumero(p.confeccionadas) : '—' },
                        { titulo: 'Monto', clase: 'num', valor: p => fmtCLP(p.monto) },
                    ], r.productos, 'Sin prendas vendidas ni confeccionadas este mes.')}
                </div>
            </div>
            <div class="two-col" style="margin-top:16px">
                <div class="panel">
                    <div class="panel-title-row"><h3>Por colegio</h3></div>
                    ${tabla([
                        { titulo: 'Colegio', valor: c => `${esc(c.nombre)}${barra(c.total)}` },
                        { titulo: 'Prendas', clase: 'num', valor: c => c.prendas ? fmtNumero(c.prendas) : '—' },
                        { titulo: 'Monto', clase: 'num', valor: c => `<strong>${fmtCLP(c.total)}</strong>${c.sin_detalle ? `<span class="sub">${fmtCLP(c.sin_detalle)} sin detalle</span>` : ''}` },
                        { titulo: '%', clase: 'num', valor: c => pct(c.total) },
                    ], r.colegios, 'Sin ventas este mes.', { porPagina: 0 })}
                </div>
                <div class="panel">
                    <div class="panel-title-row"><h3>Por tipo de prenda</h3></div>
                    ${tabla([
                        { titulo: 'Tipo', valor: t => esc(t.nombre) },
                        { titulo: 'Prendas', clase: 'num', valor: t => t.prendas === null ? '—' : fmtNumero(t.prendas) },
                        { titulo: 'Monto', clase: 'num', valor: t => fmtCLP(t.monto) },
                        { titulo: '%', clase: 'num', valor: t => pct(t.monto) },
                    ], r.tipos, 'Sin datos.', { porPagina: 0 })}
                </div>
            </div>
            <div class="panel" style="margin-top:16px">
                <div class="panel-title-row"><h3>Día a día</h3></div>
                ${tabla([
                    { titulo: 'Fecha', valor: x => fmtFecha(x.fecha) },
                    { titulo: 'Ventas', clase: 'num', valor: x => x.ventas || '—' },
                    { titulo: 'Vendido', clase: 'num', valor: x => fmtCLP(x.vendido) },
                    { titulo: 'Recaudado', clase: 'num', valor: x => `<strong>${fmtCLP(x.recaudado)}</strong>` },
                    { titulo: '', clase: 'acciones', valor: x => `<button class="btn btn-small" data-ver-dia="${x.fecha}">Ver día</button>` },
                ], r.por_dia, 'Sin movimientos registrados día a día este mes.', { porPagina: 31 })}
            </div>
            <div class="panel" style="margin-top:16px">
                <div class="panel-title-row"><h3>Mes a mes</h3></div>
                <p class="helper-text">Total de cada mes: ventas registradas + historia importada + totales sin detalle.</p>
                ${tabla([
                    { titulo: 'Mes', valor: x => `<span class="proy-mes"><strong>${fmtMes(x.mes, { month: 'long', year: 'numeric' })}</strong></span>${x.mes === r.mes ? ' <span class="pill pill-gray">Viendo</span>' : ''}` },
                    { titulo: 'Ventas registradas', clase: 'num', valor: x => x.cantidad_ventas ? `${fmtCLP(x.sistema)}<span class="sub">${x.cantidad_ventas} ventas</span>` : '—' },
                    { titulo: 'Prendas', clase: 'num', valor: x => fmtNumero(x.prendas) },
                    { titulo: 'Total del mes', clase: 'num', valor: x => `<strong>${fmtCLP(x.total)}</strong>` },
                    { titulo: '', clase: 'acciones', valor: x => (x.mes !== r.mes ? `<button class="btn btn-small" data-ver-mes="${x.mes.slice(0, 7)}">Ver</button>` : '')
                        + (x.cantidad_ventas ? ` <button class="btn btn-small btn-danger" data-borrar-mes="${x.mes.slice(0, 7)}" data-cantidad="${x.cantidad_ventas}">Eliminar ventas</button>` : '') },
                ], meses, 'Sin ventas.', { porPagina: 12 })}
            </div>`;

        const contenido = document.getElementById('resVentasContenido');
        contenido.querySelectorAll('[data-ver-dia]').forEach(b => b.addEventListener('click', () => {
            this.fecha = b.dataset.verDia;
            this.modo = 'dia';
            this.cargar();
        }));
        contenido.querySelectorAll('[data-ver-mes]').forEach(b => b.addEventListener('click', () => {
            this.mes = b.dataset.verMes;
            this.cargar();
            document.getElementById('ventasResumen').scrollIntoView({ behavior: 'smooth' });
        }));
        contenido.querySelectorAll('[data-borrar-mes]').forEach(b => b.addEventListener('click', () => this.eliminarMes(b.dataset.borrarMes, b.dataset.cantidad)));
    },

    // Anula todas las ventas registradas de un mes (no toca historia ni totales sin detalle).
    eliminarMes(mes, cantidad) {
        const nombre = fmtMes(`${mes}-01`, { month: 'long', year: 'numeric' });
        if (!confirm(`¿Eliminar las ${cantidad} ventas registradas en ${nombre}?\n\n`
            + 'Las prendas vuelven al stock y se borran sus pagos. La historia importada y los totales sin detalle no se tocan.')) return;
        intentar(async () => {
            const { eliminadas } = await api.delete(`/ventas/mes/${mes}`);
            aviso(`${eliminadas} ventas de ${nombre} eliminadas.`);
            await this.cargar();
        });
    },

    // " · se confeccionaron 12 más de las vendidas" / "... 5 menos ..."
    textoBalance(r) {
        const dif = r.prendas_confeccionadas - r.prendas_vendidas;
        if (!r.prendas_confeccionadas && !r.prendas_vendidas) return '';
        if (dif === 0) return ' · igual a lo vendido';
        return ` · ${fmtNumero(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que lo vendido`;
    },

    // ---------- Exportación ----------

    // Filas [titulo, [encabezados], [[...], ...]] comunes a CSV y PDF.
    secciones() {
        const d = this.datos;
        const medios = ['Por medio de pago', ['Medio de pago', 'Pagos', 'Monto'],
            d.por_medio.map(m => [m.nombre, m.pagos, m.monto])];
        if (this.modo === 'dia') {
            return {
                titulo: `Resumen de ventas del día ${fmtFecha(d.fecha)}`,
                archivo: `resumen-ventas-${d.fecha}`,
                indicadores: [
                    ['Total recaudado', d.recaudado], ['Pagos recibidos', d.cantidad_pagos],
                    ['Ventas realizadas', d.cantidad], ['Prendas vendidas', d.prendas],
                    ['Total vendido', d.vendido], ['Por cobrar de las ventas del día', d.por_cobrar],
                ],
                tablas: [
                    medios,
                    ['Pagos recibidos', ['Venta', 'Fecha de la venta', 'Cliente', 'Medio', 'Monto'],
                        d.pagos.map(p => [p.venta, fmtFecha(p.fecha_venta), p.cliente_nombre || 'Venta mesón', p.medio, p.monto])],
                ],
            };
        }
        const nombreMes = fmtMes(d.mes, { month: 'long', year: 'numeric' });
        return {
            titulo: `Resumen de ventas de ${nombreMes}`,
            archivo: `resumen-ventas-${d.mes.slice(0, 7)}`,
            indicadores: [
                ['Ingresos brutos (con IVA)', d.bruto], ['Ingresos netos (sin IVA)', d.neto], ['IVA', d.iva],
                ['Recaudado en el mes', d.recaudado], ['Ventas registradas', d.cantidad_ventas],
                ['Ticket promedio', d.ticket_promedio], ['Prendas vendidas', d.prendas_vendidas],
                ['Prendas confeccionadas', d.prendas_confeccionadas],
                ['Producto más vendido', d.mas_vendido ? `${d.mas_vendido.nombre} (${d.mas_vendido.vendidas} prendas)` : '—'],
            ],
            tablas: [
                medios,
                ['Rotación por producto', ['Producto', 'Vendidas', 'Confeccionadas', 'Monto'],
                    d.productos.map(p => [p.nombre, p.vendidas, p.confeccionadas, p.monto])],
                ['Por colegio', ['Colegio', 'Prendas', 'Monto'],
                    d.colegios.map(c => [c.nombre, c.prendas, c.total])],
                ['Por tipo de prenda', ['Tipo', 'Prendas', 'Monto'],
                    d.tipos.map(t => [t.nombre, t.prendas ?? '—', t.monto])],
                ['Día a día', ['Fecha', 'Ventas', 'Vendido', 'Recaudado'],
                    d.por_dia.map(x => [fmtFecha(x.fecha), x.ventas, x.vendido, x.recaudado])],
            ],
        };
    },

    // CSV con ";" y BOM: Excel en español lo abre en columnas y con tildes.
    exportarCsv() {
        if (!this.datos) return;
        const s = this.secciones();
        const celda = v => typeof v === 'number' ? String(Math.round(v)) : `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lineas = [[s.titulo], [], ['Indicador', 'Valor'], ...s.indicadores];
        for (const [titulo, encabezados, filas] of s.tablas) {
            lineas.push([], [titulo], encabezados, ...filas);
        }
        const texto = '﻿' + lineas.map(f => f.map(celda).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
        const enlace = Object.assign(document.createElement('a'), { href: url, download: `${s.archivo}.csv` });
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    async exportarPdf() {
        if (!this.datos) return;
        await cargarJsPdf();
        const s = this.secciones();
        const config = await api.get('/configuracion');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const m = 16;
        const NAVY = [22, 32, 51];
        // Cantidades (ventas, prendas, pagos) sin signo $; montos con $.
        const esCantidad = nombre => /^(Pagos|Ventas|Prendas|Vendidas|Confeccionadas)/.test(nombre);
        const formato = (nombre, v) => typeof v !== 'number' ? v : esCantidad(nombre) ? fmtNumero(v) : fmtCLP(v);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...NAVY);
        doc.text(s.titulo, m, 20);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(102, 112, 133);
        doc.text(`${config.empresa} · Generado el ${fmtFechaHora(new Date().toISOString())}`, m, 26);

        globalThis.autoTable(doc, {
            startY: 32, margin: { left: m, right: m },
            head: [['Indicador', 'Valor']],
            body: s.indicadores.map(([n, v]) => [n, formato(n, v)]),
            headStyles: { fillColor: NAVY }, styles: { fontSize: 9.5 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: c => { if (c.column.index === 1) c.cell.styles.halign = 'right'; },
        });
        for (const [titulo, encabezados, filas] of s.tablas) {
            let y = doc.lastAutoTable.finalY + 10;
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY);
            doc.text(titulo, m, y);
            globalThis.autoTable(doc, {
                startY: y + 3, margin: { left: m, right: m },
                head: [encabezados],
                body: filas.length ? filas.map(f => f.map((v, i) => formato(encabezados[i], v)))
                    : [[{ content: 'Sin registros', colSpan: encabezados.length }]],
                headStyles: { fillColor: NAVY }, styles: { fontSize: 9 },
                // Columnas numéricas (título incluido) alineadas a la derecha.
                didParseCell: c => { if (typeof filas[0]?.[c.column.index] === 'number') c.cell.styles.halign = 'right'; },
            });
        }
        doc.save(`${s.archivo}.pdf`);
    },
};
