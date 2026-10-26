// ======================================================
// INICIO - cómo va el mes, qué viene y qué requiere atención
// ======================================================
// Solo lectura: aquí no se registra nada.
//   · Franja con 3 números (vendido vs proyectado, por cobrar, por pagar)
//   · Gráfico de dinero: ventas y egresos reales + proyección
//   · Calendario de retiros de encargos y entregas de producción
//   · Pendientes: atrasos, próximos vencimientos y stock bajo
// ======================================================

const MESES_PROYECTADOS_INICIO = 6;

vistas.inicio = {

    mes: null,

    iniciar() {
        const [a, m] = hoy().split('-').map(Number);
        this.mes = new Date(a, m - 1, 1);
        // Si se cambió algo desde un evento del calendario, refrescar.
        document.addEventListener('modal-cerrado', () => {
            if (vistaVisible('inicio')) this.cargar();
        });
        let espera;
        window.addEventListener('resize', () => {
            clearTimeout(espera);
            espera = setTimeout(() => vistaVisible('inicio') && this.datos && this.dibujarGrafico(), 150);
        });
    },

    async cargar() {
        const [datos, proyeccion] = await Promise.all([
            api.get('/inicio'),
            puede('reportes') ? api.get('/proyeccion') : null,
        ]);
        this.datos = datos;
        // Proyección mensual base (unidades proyectadas × precio de lista).
        this.proyectado = proyeccion
            ? proyeccion.meses_proyeccion.slice(0, MESES_PROYECTADOS_INICIO).map((mes, i) => ({
                mes, monto: proyeccion.items.reduce((s, it) => s + it.unidades[i] * it.precio, 0),
            }))
            : null;

        this.dibujarFranja();
        this.dibujarGrafico();
        this.dibujarCalendario();
        this.dibujarAlertas();
    },

    // ---------- Franja: 3 números ----------

    dibujarFranja() {
        const r = this.datos;
        const items = [];

        if (r.ventas_mes !== undefined) {
            const meta = this.proyectado?.[0]?.monto;
            const avance = meta ? Math.min(100, Math.round(r.ventas_mes / meta * 100)) : null;
            items.push(`
                <div class="franja-item">
                    <span class="lbl">Vendido este mes</span>
                    <strong>${fmtCLP(r.ventas_mes)}</strong>
                    ${meta ? `
                        <div class="avance" role="progressbar" aria-valuenow="${avance}" aria-valuemin="0" aria-valuemax="100"><i style="width:${avance}%"></i></div>
                        <span class="sub">${avance}% de ${fmtCLP(meta)} proyectado</span>` : ''}
                </div>`);
            items.push(`
                <div class="franja-item">
                    <span class="lbl">Por cobrar a clientes</span>
                    <strong>${fmtCLP(r.por_cobrar)}</strong>
                    <span class="sub">${r.encargos_por_entregar} encargo${r.encargos_por_entregar === 1 ? '' : 's'} por entregar${r.encargos_atrasados ? ` · <b class="atrasado">${r.encargos_atrasados} atrasado${r.encargos_atrasados === 1 ? '' : 's'}</b>` : ''}</span>
                </div>`);
        }
        if (r.por_pagar !== undefined) {
            items.push(`
                <div class="franja-item">
                    <span class="lbl">Por pagar a proveedores</span>
                    <strong>${fmtCLP(r.por_pagar)}</strong>
                    ${r.gastos_mes !== undefined ? `<span class="sub">Gastos del mes: ${fmtCLP(r.gastos_mes)}</span>` : ''}
                </div>`);
        }
        document.getElementById('inicioFranja').innerHTML = items.join('');
        document.getElementById('inicioFranja').hidden = !items.length;
    },

    // ---------- Gráfico de dinero ----------

    dibujarGrafico() {
        const serie = this.datos.serie;
        const panel = document.getElementById('inicioDineroPanel');
        const hayVentas = serie[0].ventas !== undefined;
        const hayEgresos = serie[0].compras !== undefined || serie[0].gastos !== undefined;
        panel.hidden = !hayVentas && !hayEgresos;
        if (panel.hidden) return;

        // Meses completos (el mes en curso se informa en el tooltip para no "caer" la línea).
        const completos = serie.slice(0, -1);
        const actual = serie[serie.length - 1];
        const egresos = s => (s.compras || 0) + (s.gastos || 0);
        const ultimo = completos.length - 1;
        const proyectado = this.proyectado || [];
        const etiquetas = [...completos.map(s => s.mes), ...proyectado.map(p => p.mes)];
        if (!proyectado.length) etiquetas.push(actual.mes);

        const series = [];
        if (hayVentas) {
            series.push({ nombre: 'Ventas', color: COLOR_SERIE.ventas, etiquetaFinal: !proyectado.length,
                puntos: completos.map((s, i) => [i, s.ventas]) });
        }
        if (hayEgresos) {
            series.push({ nombre: 'Egresos (compras + gastos)', color: COLOR_SERIE.egresos,
                puntos: completos.map((s, i) => [i, egresos(s)]) });
        }
        if (hayVentas && proyectado.length) {
            series.push({ nombre: 'Proyección de ventas', color: COLOR_SERIE.proyeccion, punteada: true, desdeDivisor: true,
                puntos: [[ultimo, completos[ultimo].ventas], ...proyectado.map((p, i) => [completos.length + i, p.monto])] });
        }

        graficoLineas(document.getElementById('inicioGrafico'), {
            etiquetas, series,
            divisor: proyectado.length ? ultimo : null,
            leyenda: document.getElementById('inicioLeyenda'),
            alto: 280,
            // Clic en un mes real (incluido el actual): desglose de ventas de ese mes.
            alClick: hayVentas ? idx => {
                const mes = idx <= ultimo ? completos[idx]?.mes : idx === ultimo + 1 ? actual.mes : null;
                if (!mes) return;
                // Con permiso de finanzas: resumen completo del mes; si no, el resumen de ventas del mes.
                if (puede('finanzas')) vistas.resumen.abrir(mes.slice(0, 7));
                else vistas.ventas.abrirResumenMes(mes.slice(0, 7));
            } : null,
            extra: i => {
                if (i <= ultimo && hayVentas && hayEgresos) {
                    const resultado = completos[i].ventas - egresos(completos[i]);
                    return `<div class="tooltip-total"><span>Ventas − egresos</span><b class="${resultado < 0 ? 'atrasado' : ''}">${fmtCLP(resultado)}</b></div>`;
                }
                if (i === ultimo + 1) {
                    return `<div class="tooltip-total"><span>Llevamos (mes en curso)</span><b>${hayVentas ? fmtCLP(actual.ventas) : ''}</b></div>` +
                        (hayEgresos ? `<div><span>Egresos a la fecha</span><b>${fmtCLP(egresos(actual))}</b></div>` : '');
                }
                return '';
            },
        });

        document.getElementById('inicioNotaGrafico').textContent =
            'Ventas incluye la historia importada y los totales sin detalle. Pase el mouse para ver cada mes y haga clic para ver el resumen de ese mes.' +
            (proyectado.length ? ' La proyección se puede simular en el menú Proyección.' : '');
    },

    // ---------- Calendario ----------

    dibujarCalendario() {
        const contenedor = document.getElementById('inicioCalendario');
        const agenda = this.datos.agenda;
        contenedor.hidden = !puede('ventas') && !puede('produccion');
        if (contenedor.hidden) return;

        calendarioMes(contenedor, {
            mes: this.mes,
            compacto: true,
            eventos: agenda.map(e => ({
                fecha: e.fecha,
                texto: e.tipo === 'Encargo' ? `Retira ${e.titulo}` : e.titulo,
                titulo: `${e.codigo} · ${e.tipo === 'Encargo' ? 'Retiro de encargo: ' + e.titulo : 'Entrega de producción: ' + e.titulo} · ${e.alerta}`,
                clase: CLASE_ALERTA[e.alerta] || '',
                alClick: () => e.tipo === 'Encargo' ? vistas.ventas.detalle(e.id) : vistas.produccion.detalleOrden(e.id),
            })),
            alCambiarMes: nuevo => { this.mes = nuevo; this.dibujarCalendario(); },
        });
    },

    // ---------- Pendientes ----------

    dibujarAlertas() {
        const urgentes = this.datos.agenda.filter(e => e.alerta !== 'A tiempo');
        const stock = this.datos.stock_bajo;
        const listos = this.datos.listos_para_retirar || [];
        const filas = [
            ...listos.map(e => `
                <li data-tipo="Encargo" data-id="${e.id}">
                    <span class="pill pill-green">Listo</span>
                    <span><strong>Avisar a ${esc(e.cliente_nombre)} que puede retirar</strong>
                        <span class="sub">${esc(e.codigo)}${e.cliente_telefono ? ' · ' + esc(e.cliente_telefono) : ''}${e.saldo_pendiente > 0 ? ' · saldo ' + fmtCLP(e.saldo_pendiente) : ''}</span></span>
                </li>`),
            ...urgentes.map(e => `
                <li data-tipo="${e.tipo}" data-id="${e.id}">
                    ${badge(e.alerta)}
                    <span><strong>${esc(e.tipo === 'Encargo' ? `Retiro: ${e.titulo}` : e.titulo)}</strong>
                        <span class="sub">${esc(e.codigo)} · ${textoPlazo(Math.round((new Date(e.fecha) - new Date(hoy())) / 864e5))} · ${fmtFecha(e.fecha)}</span></span>
                </li>`),
            ...stock.map(s => `
                <li>
                    <span class="pill pill-red">Stock bajo</span>
                    <span><strong>${esc(s.item)}</strong>
                        <span class="sub">${esc(s.tipo)} · quedan ${fmtNumero(s.stock)} ${esc(s.unidad)} (mínimo ${fmtNumero(s.stock_minimo)})</span></span>
                </li>`),
        ];
        const contenedor = document.getElementById('inicioAlertas');
        contenedor.innerHTML = filas.length
            ? `<ul class="lista-alertas">${filas.join('')}</ul>`
            : '<div class="empty">Nada pendiente. Todo al día.</div>';

        contenedor.querySelectorAll('[data-tipo]').forEach(li => li.addEventListener('click', () =>
            li.dataset.tipo === 'Encargo' ? vistas.ventas.detalle(num(li.dataset.id)) : vistas.produccion.detalleOrden(num(li.dataset.id))));
    },
};
