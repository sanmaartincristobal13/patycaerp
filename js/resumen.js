// ======================================================
// RESUMEN MENSUAL - generado, gastado y resultado de un mes
// ======================================================
// Generado = ventas registradas + historia importada + totales sin detalle
// Egresos  = compras + gastos (incluye gastos "total del mes")
// Flujo de caja = lo cobrado - lo pagado a proveedores - gastos
// ======================================================

vistas.resumen = {

    mes: null,   // "YYYY-MM"; Inicio puede fijarlo antes de abrir la vista

    iniciar() {
        const input = document.getElementById('resumenMes');
        input.max = hoy().slice(0, 7);
        input.addEventListener('change', () => { if (input.value) { this.mes = input.value; this.cargar(); } });
        document.querySelectorAll('#view-resumen [data-mes-paso]').forEach(b => b.addEventListener('click', () => {
            const [a, m] = this.mes.split('-').map(Number);
            const d = new Date(a, m - 1 + Number(b.dataset.mesPaso), 1);
            const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (nuevo > hoy().slice(0, 7)) return;
            this.mes = nuevo;
            this.cargar();
        }));
        document.getElementById('resumenVerVentas').addEventListener('click', () => vistas.ventas.detalleMes(this.mes));
    },

    // Abre la vista en un mes dado (lo usa el gráfico de Inicio).
    abrir(mes) {
        this.mes = mes;
        if (location.hash === '#resumen') this.cargar();
        else location.hash = 'resumen';
    },

    async cargar() {
        this.mes ??= hoy().slice(0, 7);
        document.getElementById('resumenMes').value = this.mes;
        document.querySelector('#view-resumen [data-mes-paso="1"]').disabled = this.mes >= hoy().slice(0, 7);
        const r = await api.get(`/finanzas/resumen-mes/${this.mes}`);
        const a = r.anterior;
        const nombreAnterior = fmtMes(a.mes, { month: 'long' });

        // Variación contra el mes anterior: "+12% vs agosto"
        const variacion = (actual, previo, invertir = false) => {
            if (!previo) return `<span class="sub">Sin datos de ${nombreAnterior}</span>`;
            const pct = Math.round((actual / previo - 1) * 100);
            const bueno = invertir ? pct <= 0 : pct >= 0;
            return `<span class="sub"><b class="${bueno ? 'money-positive' : 'money-negative'}">${pct >= 0 ? '+' : ''}${pct}%</b> vs ${nombreAnterior} (${fmtCLP(previo)})</span>`;
        };

        document.getElementById('resumenFranja').innerHTML = `
            <div class="franja-item">
                <span class="lbl">Generado (ventas)</span>
                <strong>${fmtCLP(r.ventas)}</strong>
                ${variacion(r.ventas, a.ventas)}
            </div>
            <div class="franja-item">
                <span class="lbl">Gastado (compras + gastos)</span>
                <strong>${fmtCLP(r.egresos)}</strong>
                ${variacion(r.egresos, a.egresos, true)}
            </div>
            <div class="franja-item">
                <span class="lbl">Resultado del mes</span>
                <strong class="${r.resultado < 0 ? 'money-negative' : 'money-positive'}">${fmtCLP(r.resultado)}</strong>
                <span class="sub">Flujo de caja: ${fmtCLP(r.flujo_caja)} (cobrado − pagado)</span>
            </div>`;

        const fila = (nombre, monto, sub = '') => ({ nombre, monto, sub });
        const tablaMontos = (filas, vacio) => tabla([
            { titulo: 'Concepto', valor: f => `${esc(f.nombre)}${f.sub ? `<span class="sub">${f.sub}</span>` : ''}` },
            { titulo: 'Monto', clase: 'num', valor: f => `<strong>${fmtCLP(f.monto)}</strong>` },
        ], filas, vacio, { porPagina: 0 });

        // ---------- Ingresos ----------
        const origen = [
            fila('Ventas registradas', r.ventas_registradas, `${r.cantidad_ventas} ventas en el sistema`),
            ...(r.ventas_historia ? [fila('Historia importada', r.ventas_historia)] : []),
            ...(r.ventas_sin_detalle ? [fila('Totales sin detalle', r.ventas_sin_detalle, 'anotados como monto del mes')] : []),
        ];
        document.getElementById('resumenIngresos').innerHTML = `
            ${tablaMontos(origen, 'Sin ventas este mes.')}
            <div class="totales"><span>Total generado</span><strong>${fmtCLP(r.ventas)}</strong>
                <span>Cobrado en el mes: <strong>${fmtCLP(r.cobrado)}</strong></span></div>
            <h4 class="subtitulo">Por colegio</h4>
            ${tablaMontos(r.ventas_por_colegio.map(c => fila(c.nombre, c.monto, r.ventas ? `${c.monto / r.ventas < 0.01 ? 'menos de 1%' : Math.round(c.monto / r.ventas * 100) + '%'} del mes` : '')), 'Sin ventas este mes.')}`;

        // ---------- Egresos ----------
        document.getElementById('resumenEgresos').innerHTML = `
            <h4 class="subtitulo">Compras de materiales · ${fmtCLP(r.compras)}</h4>
            ${tablaMontos(r.compras_por_proveedor.map(p => fila(p.nombre, p.monto,
                `${p.cantidad} compra${p.cantidad === 1 ? '' : 's'}${p.pendiente ? ` · falta pagar ${fmtCLP(p.pendiente)}` : ''}`)), 'Sin compras este mes.')}
            <h4 class="subtitulo">Gastos · ${fmtCLP(r.gastos)}</h4>
            ${tablaMontos(r.gastos_por_categoria.map(g => fila(g.nombre, g.monto,
                `${g.cantidad} registro${g.cantidad === 1 ? '' : 's'}${g.incluye_sin_detalle ? ' · incluye total sin detalle' : ''}`)), 'Sin gastos este mes.')}
            <div class="totales"><span>Total gastado</span><strong>${fmtCLP(r.egresos)}</strong>
                <span>Pagado a proveedores en el mes: <strong>${fmtCLP(r.pagado_proveedores)}</strong></span></div>`;
    },
};
