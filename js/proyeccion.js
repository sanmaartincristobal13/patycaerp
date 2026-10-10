// ======================================================
// PROYECCIÓN DE VENTAS Y SIMULADOR
// ======================================================
// El backend entrega la historia mensual (24 meses) y la proyección
// base por producto/talla. El simulador ajusta esa base en el
// navegador, sin volver a consultar:
//   unidades = base × (1 + crecimiento elegido) / (1 + crecimiento base) × (1 + ajuste demanda)
//   monto    = unidades × precio de lista × (1 + ajuste de precios)
// ======================================================

vistas.proyeccion = {

    datos: null,
    params: null,

    async iniciar() {
        const establecimientos = await compartido.obtener('establecimientos');
        document.getElementById('simControles').innerHTML = `
            ${campo('Colegio', `<select name="establecimiento_id">${opciones(establecimientos, { vacio: 'Todos los colegios' })}</select>`)}
            ${campo('Horizonte', '<select name="horizonte"><option value="12">12 meses</option><option value="6">6 meses</option></select>')}
            ${campo('Crecimiento anual (%)', '<input type="number" name="crecimiento" step="0.5"><p class="helper-text" data-base></p>')}
            ${campo('Ajuste de precios (%)', '<input type="number" name="precios" step="1" value="0"><p class="helper-text">Ej: 5 = subir precios 5%</p>')}
            ${campo('Ajuste de demanda (%)', '<input type="number" name="demanda" step="1" value="0"><p class="helper-text">Ej: 20 = nuevo convenio</p>')}
            <div class="field"><button type="button" class="btn" data-restablecer>Restablecer</button></div>`;

        const controles = document.getElementById('simControles');
        controles.querySelector('[name=establecimiento_id]').addEventListener('change', () => this.cargar());
        controles.querySelectorAll('input, [name=horizonte]').forEach(c => c.addEventListener('input', () => this.dibujar()));
        controles.querySelector('[data-restablecer]').addEventListener('click', () => this.restablecer());
        document.getElementById('proyVentana').addEventListener('change', () => this.dibujarProduccion());

        // El gráfico se ajusta al ancho disponible.
        let espera;
        window.addEventListener('resize', () => {
            clearTimeout(espera);
            espera = setTimeout(() => this.datos && !document.getElementById('view-proyeccion').hidden && this.dibujarGrafico(), 150);
        });
    },

    async cargar() {
        const controles = document.getElementById('simControles');
        const est = controles.querySelector('[name=establecimiento_id]').value;
        this.datos = await api.get('/proyeccion' + (est ? `?establecimiento_id=${est}` : ''));
        controles.querySelector('[data-base]').textContent = `Según la historia: ${this.datos.crecimiento_base.toLocaleString('es-CL')}%`;
        if (controles.querySelector('[name=crecimiento]').dataset.tocado !== '1') {
            controles.querySelector('[name=crecimiento]').value = this.datos.crecimiento_base;
        }
        this.dibujar();
    },

    restablecer() {
        const c = document.getElementById('simControles');
        c.querySelector('[name=crecimiento]').value = this.datos.crecimiento_base;
        c.querySelector('[name=precios]').value = 0;
        c.querySelector('[name=demanda]').value = 0;
        this.dibujar();
    },

    // ---------- Cálculo del escenario ----------

    leerParametros() {
        const c = document.getElementById('simControles');
        const crecimiento = num(c.querySelector('[name=crecimiento]').value) ?? this.datos.crecimiento_base;
        c.querySelector('[name=crecimiento]').dataset.tocado = crecimiento !== this.datos.crecimiento_base ? '1' : '';
        return {
            horizonte: num(c.querySelector('[name=horizonte]').value),
            crecimiento,
            precios: num(c.querySelector('[name=precios]').value) || 0,
            demanda: num(c.querySelector('[name=demanda]').value) || 0,
        };
    },

    // Unidades y monto por mes futuro, para la base y para el escenario.
    calcular() {
        const d = this.datos;
        const p = this.params;
        const factorUnidades = (1 + p.crecimiento / 100) / (1 + d.crecimiento_base / 100) * (1 + p.demanda / 100);
        const factorPrecio = 1 + p.precios / 100;

        const meses = d.meses_proyeccion.slice(0, p.horizonte).map((mes, i) => {
            let base = 0, escenario = 0, unidades = 0;
            for (const item of d.items) {
                base += item.unidades[i] * item.precio;
                unidades += item.unidades[i] * factorUnidades;
                escenario += item.unidades[i] * factorUnidades * item.precio * factorPrecio;
            }
            // Mismo mes del año anterior (real).
            const anterior = d.historia[d.historia.length - 13 + i]?.monto ?? 0;
            return { mes, base, escenario, unidades, anterior };
        });

        const items = d.items.map(item => ({
            ...item,
            proyectadas: item.unidades.slice(0, p.horizonte).map(u => u * factorUnidades),
        }));
        const esBase = p.crecimiento === d.crecimiento_base && !p.precios && !p.demanda;
        return { meses, items, esBase };
    },

    dibujar() {
        if (!this.datos) return;
        this.params = this.leerParametros();
        this.calculo = this.calcular();
        this.dibujarTarjetas();
        this.dibujarGrafico();
        this.dibujarProduccion();
        this.dibujarTabla();
    },

    // ---------- Tarjetas ----------

    dibujarTarjetas() {
        const { meses } = this.calculo;
        const total = meses.reduce((s, m) => s + m.escenario, 0);
        const unidades = meses.reduce((s, m) => s + m.unidades, 0);
        const anterior = meses.reduce((s, m) => s + m.anterior, 0);
        const variacion = anterior ? (total / anterior - 1) * 100 : 0;
        const peak = meses.reduce((a, b) => (b.escenario > a.escenario ? b : a), meses[0]);

        document.getElementById('proyCards').innerHTML = `
            <div class="card"><div class="num">${fmtCLP(total)}</div><div class="lbl">Venta proyectada · ${this.params.horizonte} meses</div></div>
            <div class="card"><div class="num">${fmtNumero(Math.round(unidades))}</div><div class="lbl">Prendas a vender</div></div>
            <div class="card ${variacion >= 0 ? 'good' : 'bad'}"><div class="num">${variacion >= 0 ? '+' : ''}${variacion.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</div><div class="lbl">vs. mismo período del año anterior</div></div>
            <div class="card"><div class="num proy-mes">${fmtMes(peak.mes, { month: 'long' })}</div><div class="lbl">Mes más fuerte · ${fmtCLP(peak.escenario)}</div></div>`;
    },

    // ---------- Gráfico de líneas (SVG) ----------

    dibujarGrafico() {
        const { meses, esBase } = this.calculo;
        const historia = this.datos.historia.slice(0, -1);   // meses completos; el actual va en la proyección
        const ultimoReal = historia.length - 1;
        const empalme = [ultimoReal, historia[ultimoReal].monto];
        const series = [
            { nombre: 'Real', color: COLOR_SERIE.ventas, etiquetaFinal: false,
              puntos: historia.map((h, i) => [i, h.monto]) },
            { nombre: 'Proyección', color: COLOR_SERIE.proyeccion, punteada: true, desdeDivisor: true, etiquetaFinal: esBase,
              puntos: [empalme, ...meses.map((m, i) => [historia.length + i, m.base])] },
        ];
        if (!esBase) {
            series.push({ nombre: 'Escenario simulado', color: COLOR_SERIE.escenario, desdeDivisor: true,
              puntos: [empalme, ...meses.map((m, i) => [historia.length + i, m.escenario])] });
        }
        graficoLineas(document.getElementById('proyGrafico'), {
            etiquetas: [...historia.map(h => h.mes), ...meses.map(m => m.mes)],
            series,
            divisor: ultimoReal,
            leyenda: document.getElementById('proyLeyenda'),
        });
    },

    // ---------- ¿Cuánto fabricar? ----------

    dibujarProduccion() {
        if (!this.calculo) return;
        const ventana = Math.min(num(document.getElementById('proyVentana').value), this.params.horizonte);
        const faltantes = this.calculo.items
            .map(item => {
                const venta = Math.ceil(item.proyectadas.slice(0, ventana).reduce((s, u) => s + u, 0));
                const faltante = venta - item.stock - item.en_produccion;
                // Tela según el peso de la ficha (consumo con merma); null si no hay peso cargado.
                const telaKg = item.consumo_g ? faltante * item.consumo_g / 1000 : null;
                return { ...item, venta, faltante, telaKg };
            })
            .filter(f => f.faltante > 0)
            .sort((a, b) => b.faltante - a.faltante);
        const filas = faltantes.slice(0, 25);

        // Total de tela a comprar por tipo, para todo lo que falta fabricar.
        const porTela = new Map();
        faltantes.filter(f => f.telaKg).forEach(f => {
            const t = porTela.get(f.tipo_tela) || { kg: 0, rollo: f.peso_rollo_kg };
            t.kg += f.telaKg;
            porTela.set(f.tipo_tela, t);
        });
        const sinPeso = faltantes.filter(f => !f.telaKg).length;
        const resumenTela = porTela.size
            ? `<p class="aviso">Tela para fabricar lo que falta: ${[...porTela].map(([tela, t]) =>
                `<strong>${fmtNumero(Math.round(t.kg))} kg de ${esc(tela)}</strong> (≈ ${Math.ceil(t.kg / t.rollo)} rollos)`).join(' · ')}
                ${sinPeso ? `<span class="sub">${sinPeso} prendas/tallas sin peso cargado no se incluyen.</span>` : ''}</p>`
            : '';

        const contenedor = document.getElementById('proyProduccion');
        contenedor.innerHTML = resumenTela + tabla([
            { titulo: 'Producto', valor: f => `${esc(f.producto)}<span class="sub">${esc(f.establecimiento)}</span>` },
            { titulo: 'Talla', valor: f => esc(f.talla) },
            { titulo: 'Venta proyectada', clase: 'num', valor: f => fmtNumero(f.venta) },
            { titulo: 'Stock', clase: 'num', valor: f => fmtNumero(f.stock) },
            { titulo: 'En taller', clase: 'num', valor: f => fmtNumero(f.en_produccion) },
            { titulo: 'Faltan', clase: 'num', valor: f => `<strong>${fmtNumero(f.faltante)}</strong>` },
            { titulo: 'Tela', clase: 'num', valor: f => f.telaKg ? `${fmtNumero(Math.round(f.telaKg * 10) / 10)} kg<span class="sub">${esc(f.tipo_tela)}</span>` : '<span class="muted">—</span>' },
            { titulo: '', clase: 'acciones', valor: f => puede('produccion')
                ? `<button class="btn btn-small" data-producir="${f.producto_id}|${esc(f.talla)}|${f.faltante}">Crear orden</button>` : '' },
        ], filas, 'El stock y las órdenes en curso cubren la venta proyectada de este período.');

        contenedor.querySelectorAll('[data-producir]').forEach(b => b.addEventListener('click', () => {
            const [productoId, talla, cantidad] = b.dataset.producir.split('|');
            const entrega = new Date();
            entrega.setDate(entrega.getDate() + 21);
            intentar(async () => {
                const orden = await api.post('/produccion/ordenes', {
                    producto_id: num(productoId), talla, cantidad: num(cantidad),
                    fecha_entrega: entrega.toISOString().slice(0, 10),
                    observacion: 'Según proyección de ventas',
                });
                b.disabled = true;
                b.textContent = orden.codigo;
                aviso(`Orden ${orden.codigo} creada (entrega en 3 semanas; se puede reprogramar en Producción).`);
            });
        }));
    },

    // ---------- Tabla mensual (vista accesible del gráfico) ----------

    dibujarTabla() {
        const { meses, esBase } = this.calculo;
        document.getElementById('proyTabla').innerHTML = tabla([
            { titulo: 'Mes', valor: m => `<span class="proy-mes">${fmtMes(m.mes, { month: 'long', year: 'numeric' })}</span>` },
            { titulo: 'Año anterior (real)', clase: 'num', valor: m => fmtCLP(m.anterior) },
            { titulo: 'Proyección', clase: 'num', valor: m => fmtCLP(m.base) },
            ...(esBase ? [] : [{ titulo: 'Escenario', clase: 'num', valor: m => `<strong>${fmtCLP(m.escenario)}</strong>` }]),
            { titulo: 'Prendas', clase: 'num', valor: m => fmtNumero(Math.round(m.unidades)) },
        ], meses, '', { porPagina: 0 });
    },
};
