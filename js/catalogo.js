// ======================================================
// CATÁLOGO - productos y precios por talla
// ======================================================
// Los precios se ingresan por grupo de tallas, igual que en la
// lista de precios de la tienda: "4-6-8" → $8.000.
//
// Candado: para crear, editar o quitar productos y establecimientos hay
// que abrirlo con "Editar catálogo" (pide la contraseña del usuario).
// Se cierra solo al salir de Catálogo.
// ======================================================

vistas.catalogo = {

    edicion: false,      // candado abierto

    iniciar() {
        document.getElementById('btnNuevoProducto').addEventListener('click', () => this.formularioProducto());
        document.getElementById('btnNuevoEstablecimiento').addEventListener('click', () => this.establecimientos());
        document.getElementById('catalogoFiltroEst').addEventListener('change', () => this.dibujar());
        document.getElementById('catalogoBuscar').addEventListener('input', () => this.dibujar());
        document.getElementById('btnEditarCatalogo').addEventListener('click', () => this.edicion
            ? this.cambiarEdicion(false)
            : pedirClave('Para editar el catálogo, confirme su contraseña.', () => this.cambiarEdicion(true)));
        // Al salir de Catálogo el candado vuelve a cerrarse.
        window.addEventListener('hashchange', () => { if (location.hash !== '#catalogo' && this.edicion) this.cambiarEdicion(false, false); });
        this.cambiarEdicion(false, false);
    },

    cambiarEdicion(abierto, redibujar = true) {
        this.edicion = abierto;
        const boton = document.getElementById('btnEditarCatalogo');
        boton.textContent = abierto ? '🔓 Terminar edición' : '🔒 Editar catálogo';
        boton.classList.toggle('activo', abierto);
        boton.setAttribute('aria-pressed', String(abierto));
        for (const id of ['btnNuevoProducto', 'btnNuevoEstablecimiento']) {
            const b = document.getElementById(id);
            b.disabled = !abierto;
            b.title = abierto ? '' : 'Primero presione «Editar catálogo»';
        }
        const aviso = document.getElementById('catalogoCandado');
        aviso.classList.toggle('abierto', abierto);
        aviso.innerHTML = abierto
            ? '🔓 <strong>Edición activa.</strong> Puede crear, editar o quitar productos y establecimientos. Presione «Terminar edición» al terminar.'
            : '🔒 Catálogo bloqueado. Para crear, editar o quitar, presione <strong>«Editar catálogo»</strong>.';
        if (redibujar) this.dibujar();
    },

    async cargar() {
        const [productos, establecimientos] = await Promise.all([
            compartido.obtener('productos'),
            compartido.obtener('establecimientos'),
        ]);
        const filtro = document.getElementById('catalogoFiltroEst');
        const elegido = filtro.value;
        filtro.innerHTML = opciones(establecimientos, { seleccionado: elegido, vacio: 'Todos los establecimientos' });
        this.productos = productos;
        this.dibujar();
    },

    dibujar() {
        const est = num(document.getElementById('catalogoFiltroEst').value);
        const texto = document.getElementById('catalogoBuscar').value;
        const filas = this.productos.filter(p =>
            (!est || p.establecimiento_id === est) &&
            coincideBusqueda(texto, p.nombre, p.establecimiento, p.codigo));

        document.getElementById('catalogoTabla').innerHTML = tabla([
            { titulo: 'Código', valor: p => esc(p.codigo) },
            { titulo: 'Establecimiento', valor: p => esc(p.establecimiento) },
            { titulo: 'Tipo', valor: p => `${p.tipo_prenda ? esc(p.tipo_prenda) : '<span class="muted">Sin tipo</span>'}${p.tipo_tela ? `<span class="sub">Tela: ${esc(p.tipo_tela)}</span>` : ''}` },
            { titulo: 'Producto', valor: p => `<strong>${esc(p.nombre)}</strong>${p.componentes.length ? `<span class="sub">Conjunto: ${p.componentes.map(c => esc(c.nombre)).join(' + ')}</span>` : ''}${p.observaciones ? `<span class="sub">${esc(p.observaciones)}</span>` : ''}` },
            { titulo: 'Año', valor: p => p.anio ?? '—' },
            { titulo: 'Precios', valor: p => p.precios.map(g => `<span class="pill pill-gray">${esc(g.grupo)}: ${fmtCLP(g.precio)}</span>`).join(' ') },
            // Con el candado cerrado no se muestran las acciones que modifican el catálogo.
            ...(this.edicion ? [{ titulo: '', clase: 'acciones', valor: p => `
                <button class="btn btn-small" data-editar="${p.id}">Editar</button>
                <button class="btn btn-small btn-danger" data-borrar="${p.id}">Quitar</button>` }] : []),
        ], filas, 'No hay productos con este filtro.');

        document.querySelectorAll('#catalogoTabla [data-editar]').forEach(b => b.addEventListener('click', () =>
            this.formularioProducto(this.productos.find(p => p.id === num(b.dataset.editar)))));
        document.querySelectorAll('#catalogoTabla [data-borrar]').forEach(b => b.addEventListener('click', () => {
            const p = this.productos.find(x => x.id === num(b.dataset.borrar));
            if (!confirm(`¿Quitar "${p.nombre}" del catálogo? Su historial de ventas se conserva.`)) return;
            intentar(async () => {
                await api.delete(`/productos/${p.id}`);
                compartido.refrescar('productos');
                await this.cargar();
            }, 'Producto quitado del catálogo.');
        }));
    },

    async formularioProducto(producto = null) {
        const [establecimientos, { tiposPrenda, tiposTela }] = await Promise.all([
            compartido.obtener('establecimientos'),
            compartido.obtener('catalogos'),
        ]);
        const caja = modal.abrir(producto ? `Editar ${producto.codigo}` : 'Nuevo producto', `
            <form>
                <div class="form-grid">
                    ${campo('Establecimiento', `<select name="establecimiento_id" required>${opciones(establecimientos, { seleccionado: producto?.establecimiento_id, vacio: 'Elegir...' })}</select>`)}
                    ${campo('Tipo de prenda', `<select name="tipo_prenda_id">${opciones(tiposPrenda, { seleccionado: producto?.tipo_prenda_id, vacio: 'Sin tipo' })}</select>`)}
                    ${campo('Tipo de tela', `<select name="tipo_tela_id">${opciones(tiposTela, { seleccionado: producto?.tipo_tela_id, vacio: 'Sin definir' })}</select>`)}
                    ${campo('Nombre', `<input name="nombre" required value="${esc(producto?.nombre)}">`)}
                    ${campo('Año de la lista de precios', `<input type="number" name="anio" value="${esc(producto?.anio ?? new Date().getFullYear())}">`)}
                    ${campo('Tela principal', `<input name="tela_principal" value="${esc(producto?.tela_principal)}">`)}
                    ${campo('Observaciones', `<input name="observaciones" value="${esc(producto?.observaciones)}">`, 'full')}
                </div>
                <h3>Precios por talla</h3>
                <p class="helper-text">Separe con guion las tallas que tienen el mismo precio. Ej: 4-6-8</p>
                <table class="lineas">
                    <thead><tr><th>Tallas</th><th>Precio</th><th style="width:30px"></th></tr></thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="btn btn-small" data-agregar>+ Agregar grupo de tallas</button>
                <h3>Conjunto</h3>
                <p class="helper-text">Si es un conjunto (ej. Buzo), marque sus partes: al venderlo se descuenta una de cada parte en la misma talla, y su stock es el de las partes.</p>
                <div data-partes></div>
                ${PIE_FORM()}
            </form>`);

        const form = caja.querySelector('form');
        const cuerpo = form.querySelector('tbody');
        const agregar = (grupo = '', precio = '') => {
            const fila = cuerpo.insertRow();
            fila.innerHTML = `
                <td><input name="grupo" required value="${esc(grupo)}" placeholder="S-M"></td>
                <td><input type="number" name="precio" min="0" required value="${esc(precio)}"></td>
                <td><button type="button" class="btn btn-small" data-quitar>×</button></td>`;
            fila.querySelector('[data-quitar]').addEventListener('click', () => cuerpo.rows.length > 1 && fila.remove());
        };
        form.querySelector('[data-agregar]').addEventListener('click', () => agregar());
        (producto?.precios.length ? producto.precios : [{ grupo: '', precio: '' }]).forEach(g => agregar(g.grupo, g.precio));

        // Posibles partes: productos del mismo establecimiento que no son conjuntos.
        const partes = form.querySelector('[data-partes]');
        const elegidas = new Set((producto?.componentes ?? []).map(c => c.id));
        const dibujarPartes = () => {
            form.querySelectorAll('[name=componente]').forEach(c => c.checked ? elegidas.add(num(c.value)) : elegidas.delete(num(c.value)));
            const est = num(form.establecimiento_id.value);
            const candidatos = this.productos.filter(p =>
                p.establecimiento_id === est && p.id !== producto?.id && !p.componentes.length);
            partes.innerHTML = candidatos.length
                ? candidatos.map(p => `<label class="check"><input type="checkbox" name="componente" value="${p.id}" ${elegidas.has(p.id) ? 'checked' : ''}> ${esc(p.nombre)}</label>`).join(' ')
                : '<p class="muted">Elija un establecimiento con productos.</p>';
        };
        form.establecimiento_id.addEventListener('change', dibujarPartes);
        dibujarPartes();

        alEnviar(form, async datos => {
            const cuerpoApi = {
                establecimiento_id: num(datos.establecimiento_id),
                nombre: datos.nombre,
                anio: num(datos.anio),
                tipo_prenda_id: num(datos.tipo_prenda_id),
                tipo_tela_id: num(datos.tipo_tela_id),
                tela_principal: datos.tela_principal,
                observaciones: datos.observaciones,
                imagen: producto?.imagen || '',
                componentes: [...form.querySelectorAll('[name=componente]:checked')].map(c => num(c.value)),
                precios: [...cuerpo.rows].map(f => ({
                    grupo: f.querySelector('[name=grupo]').value,
                    precio: num(f.querySelector('[name=precio]').value),
                })),
            };
            if (producto) await api.put(`/productos/${producto.id}`, cuerpoApi);
            else await api.post('/productos', cuerpoApi);
            compartido.refrescar('productos');
            modal.cerrar();
            aviso('Producto guardado.');
            await this.cargar();
        });
    },

    // Lista de establecimientos con su cantidad de productos, para crear o eliminar.
    async establecimientos() {
        compartido.refrescar('establecimientos');
        const lista = await compartido.obtener('establecimientos');
        const caja = modal.abrir('Establecimientos', `
            <div class="filtros" style="justify-content:space-between">
                <p class="helper-text" style="margin:0">Al eliminar un establecimiento con ventas u órdenes registradas, se archiva: deja de aparecer, pero su historial se conserva en los reportes.</p>
                <button type="button" class="btn btn-primary" data-nuevo>+ Nuevo</button>
            </div>
            ${tabla([
                { titulo: 'Código', valor: e => esc(e.codigo) },
                { titulo: 'Nombre', valor: e => `<strong>${esc(e.nombre)}</strong><span class="sub">${esc(e.tipo)}${e.anio_precio ? ` · precios ${e.anio_precio}` : ''}</span>` },
                { titulo: 'Productos', clase: 'num', valor: e => e.productos || '—' },
                { titulo: '', clase: 'acciones', valor: e => `<button class="btn btn-small btn-danger" data-eliminar="${e.id}">Eliminar</button>` },
            ], lista, 'No hay establecimientos.', { porPagina: 0 })}
            <div class="modal-actions"><button type="button" class="btn" data-cerrar>Cerrar</button></div>`, { ancho: true });

        caja.querySelector('[data-nuevo]').addEventListener('click', () => this.formularioEstablecimiento());
        caja.querySelectorAll('[data-eliminar]').forEach(b => b.addEventListener('click', () => {
            const e = lista.find(x => x.id === num(b.dataset.eliminar));
            const detalle = e.productos
                ? `Se quitarán también sus ${e.productos} producto${e.productos === 1 ? '' : 's'} del catálogo y del punto de venta.`
                : 'No tiene productos.';
            if (!confirm(`¿Eliminar "${e.nombre}"?\n\n${detalle}\nSi tiene ventas u órdenes registradas, se archiva y su historial se conserva.`)) return;
            intentar(async () => {
                const r = await api.delete(`/establecimientos/${e.id}`);
                compartido.refrescar('establecimientos');
                compartido.refrescar('productos');
                aviso(r.accion === 'eliminado'
                    ? `${e.nombre} eliminado.`
                    : `${e.nombre} archivado: tenía historial, que se conserva en los reportes.`);
                await this.cargar();
                await this.establecimientos();
            });
        }));
    },

    formularioEstablecimiento() {
        const caja = modal.abrir('Nuevo establecimiento', `
            <form>
                <div class="form-grid">
                    ${campo('Nombre', '<input name="nombre" required placeholder="Ej: Colegio San Esteban">', 'full')}
                    ${campo('Tipo', `<select name="tipo">${opciones(['Establecimiento', 'Línea'].map(t => ({ id: t, nombre: t })))}</select>`)}
                    ${campo('Año de precios', `<input type="number" name="anio_precio" value="${new Date().getFullYear()}">`)}
                </div>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            await api.post('/establecimientos', { ...datos, anio_precio: num(datos.anio_precio) });
            compartido.refrescar('establecimientos');
            aviso('Establecimiento creado.');
            await this.cargar();
            await this.establecimientos();
        });
    },
};
