// ======================================================
// PRODUCCIÓN - calendario de entregas, órdenes y fichas
// ======================================================
// Pendiente → En proceso → Terminada.
// Cada orden tiene fecha de entrega; las que vencen dentro del
// margen de aviso (Configuración) o están atrasadas se destacan.
// Al terminar: las prendas entran al stock y, si el producto
// tiene ficha de materiales, se descuenta la tela/insumos usados.
// ======================================================

vistas.produccion = {

    pestana: 'calendario',
    mes: null,          // primer día del mes visible en el calendario
    ordenes: [],

    iniciar() {
        document.querySelectorAll('#view-produccion .tab').forEach(t => t.addEventListener('click', () => {
            document.querySelectorAll('#view-produccion .tab').forEach(x => x.classList.toggle('active', x === t));
            this.pestana = t.dataset.tab;
            this.cargar();
        }));
        document.getElementById('btnNuevaOrden').addEventListener('click', () => this.formularioOrden());
        document.getElementById('btnNuevaFicha').addEventListener('click', () => this.formularioFicha());
        document.getElementById('btnNuevaFicha').hidden = !puede('fichas');
        const [a, m] = hoy().split('-');
        this.mes = new Date(Number(a), Number(m) - 1, 1);
    },

    async cargar() {
        const contenedor = document.getElementById('produccionTabla');
        const alertas = document.getElementById('produccionAlertas');
        alertas.innerHTML = '';

        if (this.pestana === 'tela') {
            await this.dibujarTela(contenedor);
            return;
        }

        if (this.pestana === 'fichas') {
            const fichas = await api.get('/produccion/fichas');
            contenedor.innerHTML = `<div class="table-wrap">${tabla([
                { titulo: 'Producto', valor: f => esc(f.producto) },
                { titulo: 'Talla', valor: f => esc(f.talla) },
                { titulo: 'Materiales por prenda', valor: f => f.materiales.map(m => `${fmtNumero(m.cantidad)} ${esc(m.unidad)} de ${esc(m.material)}`).join('<br>') || '<span class="muted">Sin materiales</span>' },
                { titulo: 'Costo materiales', clase: 'num', valor: f => fmtCLP(f.materiales.reduce((s, m) => s + m.costo, 0)) },
                { titulo: '', clase: 'acciones', valor: f => puede('fichas') ? `<button class="btn btn-small" data-ficha="${f.producto_id}|${esc(f.talla)}">Editar</button>` : '' },
            ], fichas, 'Aún no hay fichas. Son opcionales: sirven para descontar materiales al terminar una orden y calcular la reposición.')}</div>`;

            contenedor.querySelectorAll('[data-ficha]').forEach(b => b.addEventListener('click', () => {
                const [productoId, talla] = b.dataset.ficha.split('|');
                this.formularioFicha(fichas.find(f => f.producto_id === num(productoId) && f.talla === talla));
            }));
            return;
        }

        this.ordenes = await api.get('/produccion/ordenes');
        if (this.pestana !== 'terminadas') this.dibujarAlertas(alertas);
        if (this.pestana === 'calendario') this.dibujarCalendario(contenedor);
        else this.dibujarLista(contenedor);
    },

    // ---------- Costo y rendimiento de tela ----------
    // Mismo cálculo que la planilla "Pesos_uniformes_rendimiento_tela":
    // consumo = peso × (1 + merma); costo = consumo × precio por kg.

    async dibujarTela(contenedor) {
        const [{ tiposTela }, establecimientos] = await Promise.all([
            api.get('/catalogos'),   // sin caché: los parámetros pueden haber cambiado
            compartido.obtener('establecimientos'),
        ]);
        this.colegioTela ??= '';
        const filas = await api.get('/produccion/rendimiento-tela' + (this.colegioTela ? `?establecimiento_id=${this.colegioTela}` : ''));
        const editable = puede('fichas');

        const parametros = tiposTela.map(t => `
            <div class="card">
                <div class="lbl"><strong>${esc(t.nombre)}</strong></div>
                <div class="num">${fmtCLP(t.precio_kg)}<small> /kg</small></div>
                <div class="lbl">Rollo ${fmtNumero(t.peso_rollo_kg)} kg · merma ${fmtNumero(t.merma * 100)}%</div>
                ${t.observacion ? `<span class="sub">${esc(t.observacion)}</span>` : ''}
                ${editable ? `<button class="btn btn-small" data-tela="${t.id}" style="margin-top:8px">Editar</button>` : ''}
            </div>`).join('');

        // Una tabla por producto.
        const porProducto = new Map();
        filas.forEach(f => {
            const clave = `${f.establecimiento} · ${f.producto}`;
            if (!porProducto.has(clave)) porProducto.set(clave, []);
            porProducto.get(clave).push(f);
        });
        const estimados = filas.filter(f => f.peso_estimado).length;

        contenedor.innerHTML = `
            <div class="cards">${parametros}</div>
            <div class="filtros">
                <select data-colegio>${opciones(establecimientos, { seleccionado: this.colegioTela, vacio: 'Todos los colegios' })}</select>
                <span class="muted">${filas.length} tallas con peso · ${estimados} estimadas
                    <span class="pill pill-yellow">Estimado</span> = reemplazar por pesaje real</span>
            </div>
            ${porProducto.size ? [...porProducto].map(([nombre, tallas]) => `
                <div class="panel" style="margin-bottom:14px">
                    <div class="panel-title-row"><h3>${esc(nombre)}</h3><span class="muted">Tela: ${esc(tallas[0].tipo_tela)}</span></div>
                    ${tabla([
                        { titulo: 'Talla', valor: f => `<strong>${esc(f.talla)}</strong>` },
                        { titulo: 'Peso prenda', clase: 'num', valor: f => `${fmtNumero(f.peso_unitario_g)} g ${f.peso_estimado ? '<span class="pill pill-yellow">Estimado</span>' : '<span class="pill pill-green">Real</span>'}` },
                        { titulo: 'Consumo c/ merma', clase: 'num', valor: f => `${fmtNumero(f.consumo_g)} g` },
                        { titulo: 'Prendas por kg', clase: 'num', valor: f => fmtNumero(f.prendas_por_kg) },
                        { titulo: 'Prendas por rollo', clase: 'num', valor: f => `${f.prendas_por_rollo}<span class="sub">sobran ${fmtNumero(f.sobrante_rollo_kg)} kg</span>` },
                        { titulo: 'Costo tela', clase: 'num', valor: f => `<strong>${fmtCLP(f.costo_tela)}</strong>` },
                        { titulo: 'Precio venta', clase: 'num', valor: f => fmtCLP(f.precio_venta) },
                        { titulo: 'Tela / precio', clase: 'num', valor: f => `${fmtNumero(f.costo_tela_pct)}%` },
                        ...(editable ? [{ titulo: '', clase: 'acciones', valor: f =>
                            `<button class="btn btn-small" data-peso="${f.producto_id}|${esc(f.talla)}">Pesar</button>` }] : []),
                    ], tallas, '', { porPagina: 0 })}
                </div>`).join('')
            : '<div class="empty">No hay prendas con peso y tipo de tela. Cargue los pesos con "npm run db:pesos" o desde "Pesar".</div>'}`;

        contenedor.querySelector('[data-colegio]').addEventListener('change', e => {
            this.colegioTela = e.target.value;
            this.dibujarTela(contenedor);
        });
        contenedor.querySelectorAll('[data-tela]').forEach(b => b.addEventListener('click', () =>
            this.formularioTela(tiposTela.find(t => t.id === num(b.dataset.tela)), contenedor)));
        contenedor.querySelectorAll('[data-peso]').forEach(b => b.addEventListener('click', () => {
            const [productoId, talla] = b.dataset.peso.split('|');
            this.formularioPeso(filas.find(f => f.producto_id === num(productoId) && f.talla === talla), contenedor);
        }));
    },

    formularioTela(tela, contenedor) {
        const caja = modal.abrir(`Tela ${tela.nombre}`, `
            <form>
                <div class="form-grid">
                    ${campo('Precio por kg ($)', `<input type="number" name="precio_kg" min="0" required value="${tela.precio_kg}">`)}
                    ${campo('Peso del rollo (kg)', `<input type="number" name="peso_rollo_kg" min="0.1" step="any" required value="${tela.peso_rollo_kg}">`)}
                    ${campo('Merma (%)', `<input type="number" name="merma" min="0" max="99" step="any" required value="${fmtNumero(tela.merma * 100).replace(',', '.')}">`)}
                    ${campo('Observación', `<input name="observacion" value="${esc(tela.observacion)}">`)}
                </div>
                <p class="helper-text">Todos los costos y rendimientos de esta tela se recalculan al guardar.</p>
                ${PIE_FORM()}
            </form>`);
        alEnviar(caja.querySelector('form'), async datos => {
            await api.put(`/tipos-tela/${tela.id}`, {
                precio_kg: num(datos.precio_kg), peso_rollo_kg: num(datos.peso_rollo_kg),
                merma: num(datos.merma) / 100, observacion: datos.observacion,
            });
            compartido.refrescar('catalogos');
            modal.cerrar();
            aviso(`Parámetros de ${tela.nombre} actualizados.`);
            await this.dibujarTela(contenedor);
        });
    },

    formularioPeso(fila, contenedor) {
        const caja = modal.abrir(`Peso · ${fila.producto} T${fila.talla}`, `
            <form>
                <div class="form-grid">
                    ${campo('Peso de la prenda terminada (g)', `<input type="number" name="peso" min="1" step="any" required value="${fila.peso_unitario_g}">`)}
                    <label class="interruptor"><input type="checkbox" name="estimado" ${fila.peso_estimado ? 'checked' : ''}> Es una estimación (no se pesó)</label>
                </div>
                ${PIE_FORM()}
            </form>`);
        alEnviar(caja.querySelector('form'), async datos => {
            await api.patch(`/produccion/fichas/${fila.producto_id}/${encodeURIComponent(fila.talla)}/peso`, {
                peso_unitario_g: num(datos.peso), peso_estimado: datos.estimado === 'on',
            });
            modal.cerrar();
            aviso('Peso actualizado.');
            await this.dibujarTela(contenedor);
        });
    },

    // ---------- Alertas de entrega ----------

    dibujarAlertas(contenedor) {
        const urgentes = this.ordenes.filter(o => o.alerta === 'Atrasada' || o.alerta === 'Por vencer');
        contenedor.innerHTML = urgentes.length ? `
            <div class="alertas">
                ${urgentes.map(o => `
                    <div class="alerta ${o.alerta === 'Atrasada' ? 'atrasada' : ''}" data-orden="${o.id}" style="cursor:pointer">
                        <strong>${textoPlazo(o.dias_restantes)} · ${esc(o.codigo)}</strong>
                        ${o.cantidad} × ${esc(o.producto)} T${esc(o.talla)}
                        <span class="sub">${o.cliente_nombre ? 'Para ' + esc(o.cliente_nombre) : 'Para stock'} · entrega ${fmtFecha(o.fecha_entrega)} · ${esc(o.estado)}</span>
                    </div>`).join('')}
            </div>` : '';
        contenedor.querySelectorAll('[data-orden]').forEach(el =>
            el.addEventListener('click', () => this.detalleOrden(num(el.dataset.orden))));
    },

    // ---------- Calendario mensual ----------

    dibujarCalendario(contenedor) {
        const sinFecha = this.ordenes.filter(o => !o.fecha_entrega && o.estado !== 'Terminada');
        contenedor.innerHTML = `
            <div class="panel" data-calendario></div>
            ${sinFecha.length ? `
                <div class="panel" style="margin-top:16px">
                    <div class="panel-title-row"><h3>Órdenes sin fecha de entrega</h3></div>
                    ${tabla([
                        { titulo: 'Orden', valor: o => esc(o.codigo) },
                        { titulo: 'Prenda', valor: o => `${o.cantidad} × ${esc(o.producto)} T${esc(o.talla)}` },
                        { titulo: 'Estado', valor: o => badge(o.estado) },
                        { titulo: '', clase: 'acciones', valor: o => `<button class="btn btn-small" data-orden="${o.id}">Asignar fecha</button>` },
                    ], sinFecha)}
                </div>` : ''}`;

        const dibujar = () => calendarioMes(contenedor.querySelector('[data-calendario]'), {
            mes: this.mes,
            eventos: this.ordenes.filter(o => o.fecha_entrega).map(o => ({
                fecha: o.fecha_entrega,
                texto: `${o.cantidad}× ${o.producto} T${o.talla}`,
                titulo: `${o.codigo} · ${o.cantidad} × ${o.producto} T${o.talla} · ${o.estado}`,
                clase: CLASE_ALERTA[o.alerta] || '',
                alClick: () => this.detalleOrden(o.id),
            })),
            alCambiarMes: nuevo => { this.mes = nuevo; dibujar(); },
        });
        dibujar();
        contenedor.querySelectorAll('[data-orden]').forEach(b =>
            b.addEventListener('click', () => this.detalleOrden(num(b.dataset.orden))));
    },

    // ---------- Lista (en curso / terminadas) ----------

    dibujarLista(contenedor) {
        const terminadas = this.pestana === 'terminadas';
        const filas = this.ordenes.filter(o => terminadas === (o.estado === 'Terminada'));
        contenedor.innerHTML = `<div class="table-wrap">${tabla([
            { titulo: 'Orden', valor: o => `<strong>${esc(o.codigo)}</strong><span class="sub">Creada ${fmtFecha(o.fecha)}</span>` },
            { titulo: 'Producto', valor: o => `${esc(o.producto)}<span class="sub">${esc(o.establecimiento)}</span>` },
            { titulo: 'Talla', valor: o => esc(o.talla) },
            { titulo: 'Cantidad', clase: 'num', valor: o => o.cantidad },
            { titulo: 'Para', valor: o => o.venta_codigo ? `${esc(o.cliente_nombre)}<span class="sub">Encargo ${esc(o.venta_codigo)}</span>` : '<span class="muted">Stock</span>' },
            { titulo: 'Entrega', valor: o => terminadas
                ? `Terminada ${fmtFecha(o.fecha_finalizacion)}`
                : `${badge(o.alerta)}<span class="sub">${o.fecha_entrega ? textoPlazo(o.dias_restantes) + ' · ' + fmtFecha(o.fecha_entrega) : ''}</span>` },
            { titulo: 'Estado', valor: o => badge(o.estado) },
            { titulo: '', clase: 'acciones', valor: o => `<button class="btn btn-small" data-orden="${o.id}">Ver</button>` },
        ], filas, terminadas ? 'Aún no hay órdenes terminadas.' : 'No hay órdenes en curso.')}</div>`;

        contenedor.querySelectorAll('[data-orden]').forEach(b =>
            b.addEventListener('click', () => this.detalleOrden(num(b.dataset.orden))));
    },

    // ---------- Detalle de una orden: avanzar, reprogramar, eliminar ----------

    async detalleOrden(id) {
        const o = await api.get(`/produccion/ordenes/${id}`);
        const abierta = o.estado !== 'Terminada';
        const materiales = o.materiales_requeridos;

        const caja = modal.abrir(`${o.codigo} · ${o.producto} T${o.talla}`, `
            <div class="form-grid">
                <div><span class="muted">Cantidad</span><br><strong>${o.cantidad}</strong> prendas</div>
                <div><span class="muted">Estado</span><br>${badge(o.estado)}</div>
                <div><span class="muted">Para</span><br>${o.venta_codigo ? `${esc(o.cliente_nombre)} (encargo ${esc(o.venta_codigo)})` : 'Stock'}</div>
                <div><span class="muted">Entrega</span><br>${abierta ? `${badge(o.alerta)} <span class="sub">${o.fecha_entrega ? textoPlazo(o.dias_restantes) + ' · ' + fmtFecha(o.fecha_entrega) : 'Sin fecha'}</span>` : `Terminada ${fmtFecha(o.fecha_finalizacion)}`}</div>
                ${o.observacion ? `<div class="full"><span class="muted">Observación</span><br>${esc(o.observacion)}</div>` : ''}
            </div>

            ${o.tela_necesaria ? `
                <p class="aviso">Tela necesaria: <strong>${fmtNumero(o.tela_necesaria.kg)} kg de ${esc(o.tela_necesaria.tipo_tela)}</strong>
                    (≈ ${fmtNumero(o.tela_necesaria.rollos)} rollos de ${fmtNumero(o.tela_necesaria.peso_rollo_kg)} kg) · costo de tela ${fmtCLP(o.tela_necesaria.costo)}
                    ${o.tela_necesaria.peso_estimado ? '<br><span class="sub">Calculado con un peso estimado.</span>' : ''}</p>` : ''}

            ${abierta && materiales.length ? `
                <h3>Materiales según ficha</h3>
                ${tabla([
                    { titulo: 'Material', valor: m => esc(m.material) },
                    { titulo: 'Se usa', clase: 'num', valor: m => `${fmtNumero(m.cantidad_total)} ${esc(m.unidad)}` },
                    { titulo: 'Disponible', clase: 'num', valor: m => `<span class="${(m.stock ?? 0) < m.cantidad_total ? 'atrasado' : ''}">${fmtNumero(m.stock)} ${esc(m.unidad)}</span>` },
                ], materiales)}` : ''}

            ${abierta ? `
                <form class="form-grid" data-fecha style="margin-top:12px">
                    ${campo('Reprogramar entrega', `<input type="date" name="fecha_entrega" value="${esc(o.fecha_entrega || '')}" required>`)}
                    <div class="field"><label>&nbsp;</label><button type="submit" class="btn">Guardar fecha</button></div>
                    <p class="error-form full"></p>
                </form>
                <div class="modal-actions">
                    <button type="button" class="btn btn-danger" data-eliminar>Eliminar</button>
                    ${o.estado === 'Pendiente'
                        ? '<button type="button" class="btn btn-primary" data-iniciar>Iniciar (En proceso)</button>'
                        : `<button type="button" class="btn btn-primary" data-terminar>Terminar · ${o.cantidad} prendas al stock</button>`}
                </div>` : ''}`, { ancho: true });

        if (!abierta) return;

        // Si se abrió desde otra vista (ej. el calendario de Inicio), solo cierra.
        const recargar = async () => { modal.cerrar(); if (vistaVisible('produccion')) await this.cargar(); };

        alEnviar(caja.querySelector('[data-fecha]'), async datos => {
            await api.patch(`/produccion/ordenes/${id}/fecha`, datos);
            aviso('Fecha de entrega actualizada.');
            await recargar();
        });
        caja.querySelector('[data-iniciar]')?.addEventListener('click', () => intentar(async () => {
            await api.patch(`/produccion/ordenes/${id}/estado`, { estado: 'En proceso' });
            await recargar();
        }, `${o.codigo} en proceso.`));
        caja.querySelector('[data-terminar]')?.addEventListener('click', () => {
            const avisoMateriales = materiales.length ? ' y se descontarán los materiales de la ficha' : '';
            if (!confirm(`¿Terminar ${o.codigo}? Entrarán ${o.cantidad} prendas al stock${avisoMateriales}.`)) return;
            intentar(async () => {
                await api.patch(`/produccion/ordenes/${id}/estado`, { estado: 'Terminada' });
                await recargar();
            }, `Orden terminada. ${o.cantidad} prendas sumadas al stock.`);
        });
        caja.querySelector('[data-eliminar]').addEventListener('click', () => {
            if (!confirm(`¿Eliminar ${o.codigo}?`)) return;
            intentar(async () => {
                await api.delete(`/produccion/ordenes/${id}`);
                await recargar();
            }, 'Orden eliminada.');
        });
    },

    // Selector producto + talla reutilizado por orden y ficha.
    async selectorPrenda(form, productoId = null, talla = null) {
        const productos = await compartido.obtener('productos');
        const selProducto = form.querySelector('[name=producto_id]');
        const selTalla = form.querySelector('[name=talla]');
        selProducto.innerHTML = opciones(productos, { texto: nombreProducto, seleccionado: productoId, vacio: 'Elegir producto...' });
        const llenarTallas = () => {
            const p = productos.find(x => x.id === num(selProducto.value));
            selTalla.innerHTML = opciones(tallasProducto(p), { valor: 'talla', texto: 'talla', seleccionado: talla });
        };
        selProducto.addEventListener('change', llenarTallas);
        llenarTallas();
    },

    async formularioOrden() {
        const caja = modal.abrir('Nueva orden de producción', `
            <form>
                <div class="form-grid">
                    ${campo('Producto', '<select name="producto_id" required></select>', 'full')}
                    ${campo('Talla', '<select name="talla" required></select>')}
                    ${campo('Cantidad', '<input type="number" name="cantidad" min="1" required>')}
                    ${campo('Fecha de entrega', '<input type="date" name="fecha_entrega" required>')}
                    ${campo('Observación', '<input name="observacion">', 'full')}
                </div>
                ${PIE_FORM('Crear orden')}
            </form>`);
        const form = caja.querySelector('form');
        await this.selectorPrenda(form);

        alEnviar(form, async datos => {
            const orden = await api.post('/produccion/ordenes', { ...datos, producto_id: num(datos.producto_id), cantidad: num(datos.cantidad) });
            modal.cerrar();
            aviso(`Orden ${orden.codigo} creada.`);
            await this.cargar();
        });
    },

    // Ficha de materiales: cuánto material usa UNA prenda (en la unidad del inventario).
    async formularioFicha(ficha = null) {
        const materiales = await compartido.obtener('materiales');
        const caja = modal.abrir(ficha ? `Ficha · ${ficha.producto} T${ficha.talla}` : 'Ficha de materiales', `
            <form>
                <p class="helper-text">Indique cuánto material usa <strong>una</strong> prenda, en la unidad del inventario (ej: 0,25 kg de franela).</p>
                <div class="form-grid">
                    ${campo('Producto', `<select name="producto_id" required ${ficha ? 'disabled' : ''}></select>`, 'full')}
                    ${campo('Talla', `<select name="talla" required ${ficha ? 'disabled' : ''}></select>`)}
                </div>
                <table class="lineas">
                    <thead><tr><th>Material</th><th style="width:140px">Cantidad por prenda</th><th style="width:30px"></th></tr></thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="btn btn-small" data-agregar>+ Agregar material</button>
                ${PIE_FORM()}
            </form>`);

        const form = caja.querySelector('form');
        await this.selectorPrenda(form, ficha?.producto_id, ficha?.talla);
        const cuerpo = form.querySelector('tbody');
        const agregar = (materialId = '', cantidad = '') => {
            const fila = cuerpo.insertRow();
            fila.innerHTML = `
                <td><select name="material_id" required>${opciones(materiales, { texto: m => `${m.detalle} (${m.unidad})`, seleccionado: materialId, vacio: 'Elegir...' })}</select></td>
                <td><input type="number" name="cantidad" min="0.0001" step="any" required value="${esc(cantidad)}"></td>
                <td><button type="button" class="btn btn-small" data-quitar>×</button></td>`;
            fila.querySelector('[data-quitar]').addEventListener('click', () => fila.remove());
        };
        form.querySelector('[data-agregar]').addEventListener('click', () => agregar());
        (ficha?.materiales.length ? ficha.materiales : [{}]).forEach(m => agregar(m.material_id, m.cantidad));

        alEnviar(form, async () => {
            const productoId = num(form.producto_id.value);
            const talla = form.talla.value;
            await api.put(`/produccion/fichas/${productoId}/${encodeURIComponent(talla)}`, {
                ...(ficha || {}),   // conserva peso y medidas si la ficha ya existía
                materiales: [...cuerpo.rows].map(f => ({
                    material_id: num(f.querySelector('[name=material_id]').value),
                    cantidad: num(f.querySelector('[name=cantidad]').value),
                })),
            });
            modal.cerrar();
            aviso('Ficha guardada.');
            this.pestana = 'fichas';
            document.querySelectorAll('#view-produccion .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'fichas'));
            await this.cargar();
        });
    },
};
