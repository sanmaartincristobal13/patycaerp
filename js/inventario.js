// ======================================================
// INVENTARIO - prendas terminadas, materiales y movimientos
// ======================================================
// El stock solo cambia por ventas, compras, producción, una suma
// manual o un conteo físico. Todo queda en "Movimientos".
//
// Candado: para sumar, contar o editar hay que abrirlo con el botón
// "Editar o sumar inventario". Se cierra solo al salir de Inventario.
// ======================================================

vistas.inventario = {

    pestana: 'prendas',
    datos: [],
    edicion: false,      // candado abierto

    iniciar() {
        document.querySelectorAll('#view-inventario .tab').forEach(t => t.addEventListener('click', () => {
            document.querySelectorAll('#view-inventario .tab').forEach(x => x.classList.toggle('active', x === t));
            this.pestana = t.dataset.tab;
            this.cargar();
        }));
        document.getElementById('inventarioBuscar').addEventListener('input', () => this.dibujar());
        document.getElementById('inventarioSoloConteo').addEventListener('change', () => this.dibujar());
        document.getElementById('btnNuevoMaterial').addEventListener('click', () => this.formularioMaterial());
        document.getElementById('btnEditarInventario').addEventListener('click', () => this.cambiarEdicion(!this.edicion));
        // Sin permiso de inventario no hay nada que desbloquear.
        document.getElementById('btnNuevoMaterial').hidden = !puede('inventario');
        document.getElementById('btnEditarInventario').hidden = !puede('inventario');
        // Al salir de Inventario el candado vuelve a cerrarse.
        window.addEventListener('hashchange', () => { if (location.hash !== '#inventario' && this.edicion) this.cambiarEdicion(false, false); });
        this.cambiarEdicion(false, false);
    },

    cambiarEdicion(abierto, redibujar = true) {
        this.edicion = abierto;
        const boton = document.getElementById('btnEditarInventario');
        boton.textContent = abierto ? '🔓 Terminar edición' : '🔒 Editar o sumar inventario';
        boton.classList.toggle('activo', abierto);
        boton.setAttribute('aria-pressed', String(abierto));
        const nuevo = document.getElementById('btnNuevoMaterial');
        nuevo.disabled = !abierto;
        nuevo.title = abierto ? '' : 'Primero presione «Editar o sumar inventario»';
        if (redibujar) this.dibujar();
    },

    // Aviso bajo los filtros según el estado del candado (solo en pestañas editables).
    mostrarCandado() {
        const aviso = document.getElementById('inventarioCandado');
        const editable = puede('inventario') && ['prendas', 'materiales'].includes(this.pestana);
        aviso.hidden = !editable;
        aviso.classList.toggle('abierto', this.edicion);
        aviso.innerHTML = this.edicion
            ? '🔓 <strong>Edición activa.</strong> Use <strong>Sumar</strong> para agregar lo que llegó o <strong>Contar</strong> para fijar el total real. Presione «Terminar edición» al terminar.'
            : '🔒 Inventario bloqueado. Para sumar, contar o editar, presione <strong>«Editar o sumar inventario»</strong>.';
    },

    async cargar() {
        const rutas = { prendas: '/inventario/prendas', materiales: '/materiales', movimientos: '/inventario/movimientos', reposicion: '/inventario/reposicion' };
        if (this.pestana === 'materiales') compartido.refrescar('materiales');
        this.datos = this.pestana === 'materiales'
            ? await compartido.obtener('materiales')
            : await api.get(rutas[this.pestana]);
        const filtro = document.getElementById('inventarioSoloConteo').parentElement;
        filtro.hidden = this.pestana === 'movimientos';
        filtro.lastChild.textContent = this.pestana === 'reposicion' ? ' Solo lo que hay que comprar' : ' Solo con conteo';
        this.dibujar();
    },

    dibujar() {
        const texto = document.getElementById('inventarioBuscar').value;
        const soloConteo = document.getElementById('inventarioSoloConteo').checked;
        const coincide = s => coincideBusqueda(texto, s);
        const estadoStock = (stock, minimo) => stock === null ? '<span class="pill pill-gray">Sin conteo</span>'
            : minimo !== null && stock <= minimo ? '<span class="pill pill-red">Bajo mínimo</span>'
            : '<span class="pill pill-green">OK</span>';
        const contenedor = document.getElementById('inventarioTabla');
        this.mostrarCandado();
        // Con el candado cerrado no se muestran las acciones que modifican el stock.
        const acciones = this.edicion && puede('inventario');

        if (this.pestana === 'prendas') {
            const filas = this.datos.filter(s =>
                coincide(`${s.establecimiento} ${s.producto} ${s.talla}`) && (!soloConteo || s.stock !== null));
            contenedor.innerHTML = tabla([
                { titulo: 'Establecimiento', valor: s => esc(s.establecimiento) },
                { titulo: 'Producto', valor: s => `${esc(s.producto)}${s.es_conjunto ? '<span class="sub">Conjunto: stock según sus partes</span>' : ''}` },
                { titulo: 'Talla', valor: s => esc(s.talla) },
                { titulo: 'Stock', clase: 'num', valor: s => `<strong>${fmtNumero(s.stock)}</strong>` },
                { titulo: 'Mínimo', clase: 'num', valor: s => fmtNumero(s.stock_minimo) },
                { titulo: 'Estado', valor: s => estadoStock(s.stock, s.stock_minimo) },
                // El conjunto no se cuenta ni se suma: se hace en cada parte.
                ...(acciones ? [{ titulo: '', clase: 'acciones', valor: s => s.es_conjunto ? '' : `
                    <button class="btn btn-small btn-primary" data-sumar="${s.producto_id}|${esc(s.talla)}">+ Sumar</button>
                    <button class="btn btn-small" data-contar="${s.producto_id}|${esc(s.talla)}">Contar</button>` }] : []),
            ], filas, 'No hay prendas con este filtro.');

            const prenda = clave => {
                const [productoId, talla] = clave.split('|');
                return this.datos.find(s => s.producto_id === num(productoId) && s.talla === talla);
            };
            contenedor.querySelectorAll('[data-sumar]').forEach(b => b.addEventListener('click', () => this.sumar(prenda(b.dataset.sumar), 'prenda')));
            contenedor.querySelectorAll('[data-contar]').forEach(b => b.addEventListener('click', () => this.conteo(prenda(b.dataset.contar), 'prenda')));
        }

        if (this.pestana === 'materiales') {
            const filas = this.datos.filter(m =>
                coincide(`${m.codigo} ${m.detalle} ${m.tipo} ${m.proveedor || ''}`) && (!soloConteo || m.stock !== null));
            contenedor.innerHTML = tabla([
                { titulo: 'Código', valor: m => esc(m.codigo) },
                { titulo: 'Material', valor: m => `<strong>${esc(m.detalle)}</strong><span class="sub">${esc(m.tipo)} · ${esc(m.proveedor || 'Sin proveedor')}</span>` },
                { titulo: 'Stock', clase: 'num', valor: m => `<strong>${fmtNumero(m.stock)}</strong> ${esc(m.unidad)}` },
                { titulo: 'Mínimo', clase: 'num', valor: m => fmtNumero(m.stock_minimo) },
                { titulo: 'Último precio', clase: 'num', valor: m => fmtCLP(m.ultimo_precio) },
                { titulo: 'Estado', valor: m => estadoStock(m.stock, m.stock_minimo) },
                ...(acciones ? [{ titulo: '', clase: 'acciones', valor: m => `
                    <button class="btn btn-small btn-primary" data-sumar="${m.id}">+ Sumar</button>
                    <button class="btn btn-small" data-contar="${m.id}">Contar</button>
                    <button class="btn btn-small" data-editar="${m.id}">Editar</button>` }] : []),
            ], filas, 'No hay materiales con este filtro.');

            contenedor.querySelectorAll('[data-sumar]').forEach(b => b.addEventListener('click', () =>
                this.sumar(this.datos.find(m => m.id === num(b.dataset.sumar)), 'material')));
            contenedor.querySelectorAll('[data-contar]').forEach(b => b.addEventListener('click', () =>
                this.conteo(this.datos.find(m => m.id === num(b.dataset.contar)), 'material')));
            contenedor.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () =>
                this.formularioMaterial(this.datos.find(m => m.id === num(b.dataset.editar)))));
        }

        if (this.pestana === 'reposicion') {
            const filas = this.datos.filter(r =>
                coincide(`${r.codigo} ${r.detalle} ${r.proveedor || ''}`) &&
                (!soloConteo || ['Crítico', 'Comprar'].includes(r.estado)));

            // Un botón por proveedor con todo lo que conviene comprarle.
            const porProveedor = new Map();
            this.datos.filter(r => r.sugerido > 0).forEach(r => {
                const clave = r.proveedor_id ?? 0;
                if (!porProveedor.has(clave)) porProveedor.set(clave, { id: r.proveedor_id, nombre: r.proveedor || 'Sin proveedor', items: [], total: 0 });
                const grupo = porProveedor.get(clave);
                grupo.items.push({ material_id: r.id, cantidad: Math.ceil(r.sugerido * 100) / 100 });
                grupo.total += r.costo_estimado;
            });
            const botones = [...porProveedor.values()].map((g, i) =>
                `<button class="btn btn-small ${g.id ? 'btn-primary' : ''}" data-comprar="${i}">
                    Comprar a ${esc(g.nombre)} · ${g.items.length} material${g.items.length === 1 ? '' : 'es'} · ${fmtCLP(g.total)}
                </button>`).join(' ');

            contenedor.innerHTML = `
                <div class="reposicion-cabecera">
                    <p class="helper-text">Sugerido = stock objetivo (o mínimo) + lo que piden las órdenes abiertas según su ficha − stock actual. No se compra nada automáticamente.</p>
                    ${botones || '<span class="muted">No hay materiales que reponer.</span>'}
                </div>
                ${tabla([
                    { titulo: 'Material', valor: r => `<strong>${esc(r.detalle)}</strong><span class="sub">${esc(r.codigo)} · ${esc(r.proveedor || 'Sin proveedor')}</span>` },
                    { titulo: 'Stock', clase: 'num', valor: r => `${fmtNumero(r.stock)} ${esc(r.unidad)}` },
                    { titulo: 'Nivel deseado', clase: 'num', valor: r => `${fmtNumero(r.nivel)}<span class="sub">${esc(r.criterio)}</span>` },
                    { titulo: 'Piden las órdenes', clase: 'num', valor: r => r.demanda ? `${fmtNumero(r.demanda)}<span class="sub">${esc(r.ordenes)}</span>` : '—' },
                    { titulo: 'Queda después', clase: 'num', valor: r => r.proyectado === null ? '—' : `<span class="${r.proyectado < 0 ? 'atrasado' : ''}">${fmtNumero(r.proyectado)}</span>` },
                    { titulo: 'Comprar', clase: 'num', valor: r => r.sugerido ? `<strong>${fmtNumero(r.sugerido)} ${esc(r.unidad)}</strong><span class="sub">${fmtCLP(r.costo_estimado)}</span>` : '—' },
                    { titulo: 'Estado', valor: r => badge(r.estado) },
                ], filas, 'No hay materiales con este filtro.')}`;

            const grupos = [...porProveedor.values()];
            contenedor.querySelectorAll('[data-comprar]').forEach(b => b.addEventListener('click', () => {
                const g = grupos[num(b.dataset.comprar)];
                vistas.compras.formularioCompra({
                    proveedorId: g.id,
                    items: g.items,
                    alGuardar: () => this.cargar(),
                });
            }));
        }

        if (this.pestana === 'movimientos') {
            const filas = this.datos.filter(m => coincide(`${m.item} ${m.tipo} ${m.referencia} ${m.usuario || ''}`));
            contenedor.innerHTML = tabla([
                { titulo: 'Fecha', valor: m => fmtFechaHora(m.fecha_hora) },
                { titulo: 'Tipo', valor: m => `${esc(m.tipo)}<span class="sub">${esc(m.categoria)}</span>` },
                { titulo: 'Ítem', valor: m => esc(m.item) },
                { titulo: 'Cantidad', clase: 'num', valor: m => `<span class="${m.cantidad < 0 ? 'money-negative' : 'money-positive'}">${m.cantidad > 0 ? '+' : ''}${fmtNumero(m.cantidad)}</span>` },
                { titulo: 'Stock', clase: 'num', valor: m => `${fmtNumero(m.stock_anterior)} → ${fmtNumero(m.stock_nuevo)}` },
                { titulo: 'Documento', valor: m => esc(m.referencia) },
                { titulo: 'Usuario', valor: m => esc(m.usuario) },
            ], filas, 'Aún no hay movimientos de stock.');
        }
    },

    nombreItem(item, tipo) {
        return tipo === 'prenda' ? `${item.producto} · Talla ${item.talla}` : item.detalle;
    },

    // Suma rápida: solo pide cuánto llegó y muestra en cuánto queda el stock.
    sumar(item, tipo) {
        const unidad = tipo === 'prenda' ? 'unidades' : item.unidad;
        const actual = Number(item.stock || 0);
        const caja = modal.abrir('Sumar al stock', `
            <form>
                <p class="aviso">${esc(this.nombreItem(item, tipo))}<br>Stock actual: <strong>${fmtNumero(item.stock ?? 0)} ${esc(unidad)}</strong></p>
                ${campo(`Cantidad a sumar (${unidad})`, `<input type="number" name="cantidad" min="${tipo === 'prenda' ? 1 : 0.001}" step="${tipo === 'prenda' ? 1 : 'any'}" required>`)}
                <p class="helper-text" data-queda>Quedará en ${fmtNumero(actual)} ${esc(unidad)}.</p>
                ${PIE_FORM('Sumar')}
            </form>`);
        const form = caja.querySelector('form');
        form.cantidad.addEventListener('input', () => {
            form.querySelector('[data-queda]').textContent = `Quedará en ${fmtNumero(actual + (num(form.cantidad.value) || 0))} ${unidad}.`;
        });
        alEnviar(form, async datos => {
            const ruta = tipo === 'prenda'
                ? `/inventario/prendas/${item.producto_id}/${encodeURIComponent(item.talla)}/sumar`
                : `/inventario/materiales/${item.id}/sumar`;
            await api.post(ruta, { cantidad: num(datos.cantidad) });
            if (tipo === 'material') compartido.refrescar('materiales');
            modal.cerrar();
            aviso(`Se sumaron ${fmtNumero(num(datos.cantidad))} ${unidad}.`);
            await this.cargar();
        });
    },

    // Conteo físico: fija el stock real y deja registro del ajuste.
    // Mínimo y objetivo quedan plegados: casi nunca cambian.
    conteo(item, tipo) {
        const caja = modal.abrir('Contar (fijar el total)', `
            <form>
                <p class="aviso">${esc(this.nombreItem(item, tipo))}<br>Stock actual en sistema: <strong>${fmtNumero(item.stock)}</strong></p>
                ${campo('Cantidad contada (total real)', `<input type="number" name="stock" min="0" step="${tipo === 'prenda' ? 1 : 'any'}" required value="${esc(item.stock ?? '')}">`)}
                <details class="plegable">
                    <summary>Mínimo y objetivo (opcional)</summary>
                    <div class="form-grid">
                        ${campo('Stock mínimo (alerta)', `<input type="number" name="stock_minimo" min="0" step="any" value="${esc(item.stock_minimo ?? '')}">`)}
                        ${campo('Stock objetivo (hasta dónde reponer)', `<input type="number" name="stock_objetivo" min="0" step="any" value="${esc(item.stock_objetivo ?? '')}">`)}
                    </div>
                </details>
                ${PIE_FORM('Guardar conteo')}
            </form>`);
        caja.querySelector('[name=stock]').select();

        alEnviar(caja.querySelector('form'), async datos => {
            const ruta = tipo === 'prenda'
                ? `/inventario/prendas/${item.producto_id}/${encodeURIComponent(item.talla)}`
                : `/inventario/materiales/${item.id}`;
            await api.put(ruta, {
                stock: num(datos.stock),
                stock_minimo: num(datos.stock_minimo),
                stock_objetivo: num(datos.stock_objetivo),
            });
            if (tipo === 'material') compartido.refrescar('materiales');
            modal.cerrar();
            aviso('Conteo guardado.');
            await this.cargar();
        });
    },

    async formularioMaterial(material = null) {
        const [{ tiposMaterial, unidades, bodegas }, proveedores] = await Promise.all([
            compartido.obtener('catalogos'),
            compartido.obtener('proveedores'),
        ]);
        const caja = modal.abrir(material ? `Editar ${material.codigo}` : 'Nuevo material', `
            <form>
                <div class="form-grid">
                    ${campo('Detalle', `<input name="detalle" required value="${esc(material?.detalle)}" placeholder="Ej: Franela Polycotton Azul Rey">`, 'full')}
                    ${campo('Tipo', `<select name="tipo_material_id">${opciones(tiposMaterial, { seleccionado: material?.tipo_material_id })}</select>`)}
                    ${campo('Unidad', `<select name="unidad_id">${opciones(unidades, { texto: 'nombre', seleccionado: material?.unidad_id })}</select>`)}
                    ${campo('Proveedor habitual', `<select name="proveedor_id">${opciones(proveedores, { seleccionado: material?.proveedor_id, vacio: 'Sin proveedor' })}</select>`)}
                    ${campo('Bodega', `<select name="bodega_id">${opciones(bodegas, { seleccionado: material?.bodega_id, vacio: 'Por definir' })}</select>`)}
                    ${campo('Último precio', `<input type="number" name="ultimo_precio" min="0" step="any" value="${esc(material?.ultimo_precio ?? '')}">`)}
                </div>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            const cuerpo = {
                detalle: datos.detalle,
                tipo_material_id: num(datos.tipo_material_id),
                unidad_id: num(datos.unidad_id),
                proveedor_id: num(datos.proveedor_id),
                bodega_id: num(datos.bodega_id),
                ultimo_precio: num(datos.ultimo_precio) ?? 0,
            };
            if (material) await api.put(`/materiales/${material.id}`, cuerpo);
            else await api.post('/materiales', cuerpo);
            compartido.refrescar('materiales');
            modal.cerrar();
            aviso('Material guardado.');
            this.pestana = 'materiales';
            document.querySelectorAll('#view-inventario .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'materiales'));
            await this.cargar();
        });
    },
};
