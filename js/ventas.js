// ======================================================
// VENTAS - MINI POS, HISTORIAL Y COBRANZA
// ======================================================
// Vender: tocar producto → elegir talla → cobrar.
// Venta: el cliente se lleva la prenda ahora (descuenta stock).
// Encargo: se anota cliente, abono y fecha de retiro; el stock se
// descuenta cuando se entrega.
// ======================================================

vistas.ventas = {

    pestana: 'vender',
    lista: [],

    // Estado del punto de venta
    productos: [],
    stock: [],
    establecimiento: null,     // filtro por colegio (id) o null = todos
    tipo: null,                // filtro por tipo de prenda (id) o null = todo
    abierto: null,             // producto con las tallas desplegadas
    carrito: [],               // [{producto_id, producto, talla, precio, cantidad}]

    async iniciar() {
        document.querySelectorAll('#view-ventas .tab').forEach(t => t.addEventListener('click', () => {
            document.querySelectorAll('#view-ventas .tab').forEach(x => x.classList.toggle('active', x === t));
            this.pestana = t.dataset.tab;
            this.cargar();
        }));
        ['ventasFiltroEntrega', 'ventasFiltroPago'].forEach(id =>
            document.getElementById(id).addEventListener('change', () => this.cargar()));
        document.getElementById('ventasBuscar').addEventListener('input', () => this.dibujarHistorial());
        document.getElementById('posBuscar').addEventListener('input', () => this.dibujarProductos());
        document.getElementById('btnNuevoTotal').addEventListener('click', () => this.formularioTotal());
        await this.armarCarrito();
    },

    async cargar() {
        document.getElementById('ventasPos').hidden = this.pestana !== 'vender';
        document.getElementById('ventasHistorial').hidden = this.pestana !== 'historial';
        document.getElementById('ventasTotales').hidden = this.pestana !== 'totales';
        document.getElementById('ventasPorMes').hidden = this.pestana !== 'mes';

        if (this.pestana === 'mes') {
            await this.dibujarPorMes();
            return;
        }

        if (this.pestana === 'totales') {
            await this.dibujarTotales();
            return;
        }

        if (this.pestana === 'vender') {
            const [productos, establecimientos, stock] = await Promise.all([
                compartido.obtener('productos'),
                compartido.obtener('establecimientos'),
                api.get('/inventario/prendas'),
            ]);
            this.productos = productos;
            this.stock = stock;
            // Todos los colegios, tengan o no productos cargados.
            this.dibujarEstablecimientos(establecimientos);
            this.dibujarProductos();
            this.dibujarCarrito();
            return;
        }

        const params = new URLSearchParams();
        const entrega = document.getElementById('ventasFiltroEntrega').value;
        const pago = document.getElementById('ventasFiltroPago').value;
        if (entrega) params.set('estado_entrega', entrega);
        if (pago) params.set('estado_pago', pago);
        this.lista = await api.get('/ventas?' + params);
        this.dibujarHistorial();
    },

    // ---------- Ventas por mes ----------

    async dibujarPorMes() {
        const meses = await api.get('/reportes/ventas-mes');
        const hayHistoria = meses.some(m => m.historia);
        const haySinDetalle = meses.some(m => m.sin_detalle);
        const contenedor = document.getElementById('ventasPorMesTabla');
        contenedor.innerHTML = tabla([
            { titulo: 'Mes', valor: m => `<span class="proy-mes"><strong>${fmtMes(m.mes, { month: 'long', year: 'numeric' })}</strong></span>` },
            { titulo: 'Ventas registradas', clase: 'num', valor: m => m.cantidad_ventas ? `${fmtCLP(m.sistema)}<span class="sub">${m.cantidad_ventas} ventas</span>` : '—' },
            ...(hayHistoria ? [{ titulo: 'Historia importada', clase: 'num', valor: m => m.historia ? fmtCLP(m.historia) : '—' }] : []),
            ...(haySinDetalle ? [{ titulo: 'Totales sin detalle', clase: 'num', valor: m => m.sin_detalle ? fmtCLP(m.sin_detalle) : '—' }] : []),
            { titulo: 'Prendas', clase: 'num', valor: m => fmtNumero(m.prendas) },
            { titulo: 'Total del mes', clase: 'num', valor: m => `<strong>${fmtCLP(m.total)}</strong>` },
            { titulo: '', clase: 'acciones', valor: m => m.total ? `<button class="btn btn-small" data-mes="${m.mes.slice(0, 7)}">Ver detalle</button>` : '' },
        ], meses, 'Sin ventas.', { porPagina: 12 });
        contenedor.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => this.detalleMes(b.dataset.mes)));
    },

    // Desglose de un mes: por colegio, por tipo de prenda y productos más vendidos.
    // También se abre al hacer clic en un mes del gráfico de Inicio.
    async detalleMes(mes) {
        const d = await api.get(`/reportes/ventas-mes/${mes}`);
        const barra = (monto) => `<div class="avance"><i style="width:${d.total ? Math.round(monto / d.total * 100) : 0}%"></i></div>`;
        const pct = monto => d.total ? `${Math.round(monto / d.total * 100)}%` : '—';
        modal.abrir(`Ventas de ${fmtMes(d.mes, { month: 'long', year: 'numeric' })}`, `
            <div class="franja">
                <div class="franja-item"><span class="lbl">Total del mes</span><strong>${fmtCLP(d.total)}</strong>
                    ${d.sin_detalle ? `<span class="sub">${fmtCLP(d.sin_detalle)} sin detalle</span>` : ''}</div>
                <div class="franja-item"><span class="lbl">Prendas</span><strong>${fmtNumero(d.prendas)}</strong></div>
                <div class="franja-item"><span class="lbl">Ventas registradas</span><strong>${fmtNumero(d.cantidad_ventas)}</strong>
                    ${d.prendas ? `<span class="sub">Precio promedio ${fmtCLP(d.con_detalle / d.prendas)} por prenda</span>` : ''}</div>
            </div>
            <h3>Por colegio</h3>
            ${tabla([
                { titulo: 'Colegio', valor: c => `${esc(c.nombre)}${barra(c.total)}` },
                { titulo: 'Prendas', clase: 'num', valor: c => c.prendas ? fmtNumero(c.prendas) : '—' },
                { titulo: 'Monto', clase: 'num', valor: c => `<strong>${fmtCLP(c.total)}</strong>${c.sin_detalle ? `<span class="sub">${fmtCLP(c.sin_detalle)} sin detalle</span>` : ''}` },
                { titulo: '%', clase: 'num', valor: c => pct(c.total) },
            ], d.colegios, 'Sin ventas este mes.', { porPagina: 0 })}
            <div class="two-col" style="margin-top:12px">
                <div>
                    <h3>Por tipo de prenda</h3>
                    ${tabla([
                        { titulo: 'Tipo', valor: t => esc(t.nombre) },
                        { titulo: 'Prendas', clase: 'num', valor: t => t.prendas === null ? '—' : fmtNumero(t.prendas) },
                        { titulo: 'Monto', clase: 'num', valor: t => fmtCLP(t.monto) },
                        { titulo: '%', clase: 'num', valor: t => pct(t.monto) },
                    ], d.tipos, 'Sin datos.', { porPagina: 0 })}
                </div>
                <div>
                    <h3>Más vendidos</h3>
                    ${tabla([
                        { titulo: 'Producto', valor: p => esc(p.nombre) },
                        { titulo: 'Prendas', clase: 'num', valor: p => fmtNumero(p.prendas) },
                        { titulo: 'Monto', clase: 'num', valor: p => fmtCLP(p.monto) },
                    ], d.productos, 'Sin datos de prendas.', { porPagina: 0 })}
                </div>
            </div>`, { ancho: true });
    },

    // ---------- Totales sin detalle (solo dinero) ----------

    async dibujarTotales() {
        const totales = await api.get('/ventas-resumen');
        const contenedor = document.getElementById('ventasTotalesTabla');
        contenedor.innerHTML = tabla([
            { titulo: 'Mes', valor: t => `<span class="proy-mes">${fmtMes(t.mes, { month: 'long', year: 'numeric' })}</span>` },
            { titulo: 'Colegio', valor: t => esc(t.establecimiento || 'Varios / sin separar') },
            { titulo: 'Monto', clase: 'num', valor: t => `<strong>${fmtCLP(t.monto)}</strong>` },
            { titulo: 'Nota', valor: t => esc(t.observacion) },
            { titulo: 'Registró', valor: t => esc(t.usuario) },
            { titulo: '', clase: 'acciones', valor: t => `<button class="btn btn-small btn-danger" data-borrar-total="${t.id}">Eliminar</button>` },
        ], totales, 'Aún no hay totales registrados.');

        contenedor.querySelectorAll('[data-borrar-total]').forEach(b => b.addEventListener('click', () => {
            if (!confirm('¿Eliminar este total?')) return;
            intentar(async () => {
                await api.delete(`/ventas-resumen/${b.dataset.borrarTotal}`);
                await this.dibujarTotales();
            }, 'Total eliminado.');
        }));
    },

    async formularioTotal() {
        const establecimientos = await compartido.obtener('establecimientos');
        // Por defecto, el mes pasado.
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
        const mesPasado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const caja = modal.abrir('Registrar total del mes', `
            <form>
                <div class="form-grid">
                    ${campo('Mes', `<input type="month" name="mes" required value="${mesPasado}" max="${hoy().slice(0, 7)}">`)}
                    ${campo('Monto vendido ($)', '<input type="number" name="monto" min="1" required>')}
                    ${campo('Colegio (opcional)', `<select name="establecimiento_id">${opciones(establecimientos, { vacio: 'Varios / sin separar' })}</select>`)}
                    ${campo('Nota', '<input name="observacion" placeholder="Ej: según cuaderno de ventas">')}
                </div>
                <p class="helper-text">Puede registrar un total general o uno por colegio (varias veces para el mismo mes).</p>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            await api.post('/ventas-resumen', {
                mes: datos.mes, monto: num(datos.monto),
                establecimiento_id: num(datos.establecimiento_id), observacion: datos.observacion,
            });
            modal.cerrar();
            aviso('Total registrado.');
            await this.dibujarTotales();
        });
    },

    stockDe(productoId, talla) {
        return this.stock.find(s => s.producto_id === productoId && s.talla === talla)?.stock ?? null;
    },

    // ---------- Productos ----------

    // Selector compacto de colegio. Recuerda el último elegido en este
    // navegador (en el mesón suele atenderse un colegio a la vez).
    dibujarEstablecimientos(establecimientos) {
        const select = document.getElementById('posColegio');
        if (this.establecimiento === null) {
            try { this.establecimiento = num(localStorage.getItem('posColegio')); } catch { /* sin almacenamiento */ }
            if (!establecimientos.some(e => e.id === this.establecimiento)) this.establecimiento = null;
        }
        const conProductos = new Set(this.productos.map(p => p.establecimiento_id));
        select.innerHTML = opciones(establecimientos, {
            seleccionado: this.establecimiento, vacio: 'Todos los colegios',
            texto: e => conProductos.has(e.id) ? e.nombre : `${e.nombre} (sin productos)`,
        });
        select.onchange = () => {
            this.establecimiento = num(select.value);
            this.abierto = null;
            this.tipo = null;
            try { localStorage.setItem('posColegio', select.value); } catch { /* sin almacenamiento */ }
            this.dibujarProductos();
        };
    },

    // Subselector de tipo de prenda: solo muestra los tipos que tiene el colegio elegido.
    dibujarTipos(delColegio) {
        // [[id, nombre], ...] en el orden del catálogo de tipos (sin tipo = al final).
        const tipos = [...new Map(delColegio.map(p => [p.tipo_prenda_id, p.tipo_prenda || 'Otros'])).entries()]
            .sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99));
        if (!tipos.some(([id]) => id === this.tipo)) this.tipo = null;

        const contenedor = document.getElementById('posTipos');
        contenedor.hidden = tipos.length < 2;
        contenedor.innerHTML = [[null, 'Todo'], ...tipos].map(([id, nombre]) =>
            `<button type="button" class="${id === this.tipo ? 'active' : ''}" data-tipo="${id ?? ''}">${esc(nombre)}</button>`).join('');
        contenedor.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => {
            this.tipo = num(b.dataset.tipo);
            this.abierto = null;
            this.dibujarProductos();
        }));
    },

    tarjetaProducto(p) {
        const precios = p.precios.map(g => g.precio);
        const desde = precios.length ? Math.min(...precios) : 0;
        const tallas = p.id === this.abierto ? `
            <div class="pos-tallas">
                ${tallasProducto(p).map(t => {
                    const s = this.stockDe(p.id, t.talla);
                    return `<button class="pos-talla" data-talla="${esc(t.talla)}">
                        <strong>${esc(t.talla)}</strong>
                        <small>${fmtCLP(t.precio)}</small>
                        <small class="${!s ? 'sin-stock' : ''}">${s === null ? 'sin conteo' : s + ' en stock'}</small>
                    </button>`;
                }).join('')}
            </div>` : '';
        return `
            <div class="pos-producto ${p.id === this.abierto ? 'abierto' : ''}" data-producto="${p.id}">
                <h4>${esc(p.nombre)}</h4>
                ${this.establecimiento ? '' : `<span class="sub">${esc(p.establecimiento)}</span>`}
                <div class="precio">${precios.length > 1 ? 'desde ' : ''}${fmtCLP(desde)}</div>
                ${tallas}
            </div>`;
    },

    dibujarProductos() {
        const texto = document.getElementById('posBuscar').value.trim().toLowerCase();
        const delColegio = this.productos.filter(p => !this.establecimiento || p.establecimiento_id === this.establecimiento);
        this.dibujarTipos(delColegio);
        const filas = delColegio.filter(p =>
            (this.tipo === null || p.tipo_prenda_id === this.tipo) &&
            (!texto || `${p.nombre} ${p.establecimiento}`.toLowerCase().includes(texto)));

        const contenedor = document.getElementById('posProductos');
        if (!delColegio.length) {
            contenedor.innerHTML = `<div class="empty">Este colegio aún no tiene productos cargados.
                ${puede('catalogo') ? '<br><a href="#catalogo" class="btn btn-small" style="margin-top:8px">Agregar productos en Catálogo</a>' : ''}</div>`;
            return;
        }
        if (!filas.length) {
            contenedor.innerHTML = '<div class="empty">No hay productos con este filtro.</div>';
            return;
        }

        // Separados por tipo de prenda (orden: Poleras, Polerones, Pantalones, Buzos, Otros).
        const grupos = new Map();
        [...filas].sort((a, b) => (a.tipo_prenda_id ?? 99) - (b.tipo_prenda_id ?? 99))
            .forEach(p => {
                const nombre = p.tipo_prenda || 'Otros';
                if (!grupos.has(nombre)) grupos.set(nombre, []);
                grupos.get(nombre).push(p);
            });
        contenedor.innerHTML = [...grupos].map(([nombre, productos]) => `
            ${grupos.size > 1 ? `<h4 class="pos-grupo">${esc(nombre)}</h4>` : ''}
            ${productos.map(p => this.tarjetaProducto(p)).join('')}`).join('');

        this.conectarTarjetas(contenedor);
    },

    conectarTarjetas(contenedor) {
        contenedor.querySelectorAll('[data-producto]').forEach(tarjeta => tarjeta.addEventListener('click', event => {
            const p = this.productos.find(x => x.id === num(tarjeta.dataset.producto));
            const botonTalla = event.target.closest('[data-talla]');
            if (botonTalla) {
                const talla = botonTalla.dataset.talla;
                this.agregar(p, talla, tallasProducto(p).find(t => t.talla === talla).precio);
                return;
            }
            this.abierto = this.abierto === p.id ? null : p.id;
            this.dibujarProductos();
        }));
    },

    // ---------- Carrito ----------

    agregar(p, talla, precio) {
        const linea = this.carrito.find(l => l.producto_id === p.id && l.talla === talla);
        if (linea) linea.cantidad++;
        else this.carrito.push({ producto_id: p.id, producto: p.nombre, establecimiento: p.establecimiento, talla, precio, cantidad: 1 });
        this.dibujarCarrito();
    },

    // El formulario del carrito se arma una vez; solo las líneas y totales se redibujan.
    async armarCarrito() {
        const { mediosPago } = await compartido.obtener('catalogos');
        const panel = document.getElementById('posCarrito');
        panel.innerHTML = `
            <h3>Carrito</h3>
            <div id="carritoLineas"></div>
            <div class="carrito-total"><span>Total</span><strong id="carritoTotal">$0</strong></div>
            <form id="carritoForm">
                ${campo('Descuento', '<input type="number" name="descuento" min="0" value="0">')}
                <label class="interruptor"><input type="checkbox" name="encargo"> Es encargo (el cliente retira después)</label>
                <div id="carritoAviso"></div>
                ${campo('Cliente', '<input name="cliente_nombre" placeholder="Nombre del apoderado">')}
                ${campo('Teléfono', '<input name="cliente_telefono" placeholder="+569...">')}
                <div data-solo-encargo hidden>
                    ${campo('Fecha de retiro', '<input type="date" name="fecha_compromiso">')}
                    <p class="helper-text">Lo que haya en stock se descuenta y queda reservado para el cliente al registrar.</p>
                    ${puede('produccion') ? '<label class="check" style="margin-bottom:8px"><input type="checkbox" name="enviar_taller" checked> Enviar al taller lo que falte</label>' : ''}
                </div>
                <div class="form-grid">
                    ${campo('Paga ahora', '<input type="number" name="pago" min="0">')}
                    ${campo('Medio de pago', `<select name="medio_pago_id">${opciones(mediosPago)}</select>`)}
                </div>
                <!-- Montos rápidos para no tipear -->
                <div class="pago-rapido" id="pagoRapido">
                    <button type="button" class="chip" data-pago="1">Todo</button>
                    <button type="button" class="chip" data-pago="0.5">50%</button>
                    <button type="button" class="chip" data-pago="0">Nada</button>
                </div>
                <p class="error-form"></p>
                <button type="submit" class="btn btn-primary grande" id="carritoCobrar">Cobrar</button>
            </form>`;

        const form = document.getElementById('carritoForm');
        form.pago.addEventListener('input', () => (form.pago.dataset.tocado = '1'));
        // Botón rápido: guarda la proporción elegida para recalcular si cambia el carrito.
        form.querySelectorAll('[data-pago]').forEach(b => b.addEventListener('click', () => {
            form.pago.dataset.tocado = '1';
            form.pago.dataset.proporcion = b.dataset.pago;
            this.dibujarCarrito();
        }));
        form.pago.addEventListener('input', () => {
            form.pago.dataset.proporcion = '';   // escribió un monto a mano
            this.marcarPagoRapido();
        });
        form.descuento.addEventListener('input', () => this.dibujarCarrito());
        form.encargo.addEventListener('change', () => {
            form.pago.dataset.tocado = '';
            this.dibujarCarrito();
        });
        alEnviar(form, datos => this.cobrar(datos));
    },

    total() {
        const form = document.getElementById('carritoForm');
        const subtotal = this.carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);
        return Math.max(0, subtotal - (num(form.descuento.value) || 0));
    },

    dibujarCarrito() {
        const form = document.getElementById('carritoForm');
        if (!form) return;
        const encargo = form.encargo.checked;

        const lineas = document.getElementById('carritoLineas');
        lineas.innerHTML = this.carrito.length ? this.carrito.map((l, i) => {
            const s = this.stockDe(l.producto_id, l.talla);
            const falta = !encargo && (s ?? 0) < l.cantidad;
            return `
                <div class="carrito-linea">
                    <div>${esc(l.producto)} · T${esc(l.talla)}
                        <span class="sub ${falta ? 'atrasado' : ''}">${fmtCLP(l.precio)} c/u${falta ? ` · stock: ${s ?? 'sin conteo'}` : ''}</span></div>
                    <span class="cantidad">
                        <button type="button" data-menos="${i}">−</button>${l.cantidad}<button type="button" data-mas="${i}">+</button>
                    </span>
                    <button type="button" class="quitar" data-quitar="${i}" title="Quitar">×</button>
                </div>`;
        }).join('') : '<div class="empty">Toque un producto y elija la talla.</div>';

        lineas.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => { this.carrito[b.dataset.mas].cantidad++; this.dibujarCarrito(); }));
        lineas.querySelectorAll('[data-menos]').forEach(b => b.addEventListener('click', () => {
            const l = this.carrito[b.dataset.menos];
            if (l.cantidad > 1) l.cantidad--; else this.carrito.splice(b.dataset.menos, 1);
            this.dibujarCarrito();
        }));
        lineas.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => { this.carrito.splice(b.dataset.quitar, 1); this.dibujarCarrito(); }));

        const total = this.total();
        document.getElementById('carritoTotal').textContent = fmtCLP(total);

        // Venta: por defecto paga todo. Encargo: el abono se elige (botones o a mano).
        if (form.pago.dataset.proporcion) form.pago.value = Math.round(total * Number(form.pago.dataset.proporcion)) || '';
        else if (form.pago.dataset.tocado !== '1') form.pago.value = encargo ? '' : (total || '');
        form.pago.placeholder = encargo ? 'Abono (opcional)' : '';
        const montos = { 1: total, 0.5: Math.round(total / 2) };
        form.querySelectorAll('[data-pago]').forEach(b => {
            const nombre = { 1: 'Todo', 0.5: '50%', 0: 'Nada' }[b.dataset.pago];
            b.textContent = montos[b.dataset.pago] ? `${nombre} · ${fmtCLP(montos[b.dataset.pago])}` : nombre;
        });
        this.marcarPagoRapido();
        form.cliente_nombre.required = encargo;
        form.cliente_nombre.placeholder = encargo ? 'Nombre del apoderado (obligatorio)' : 'Nombre del apoderado (opcional)';
        form.querySelector('[data-solo-encargo]').hidden = !encargo;
        document.getElementById('carritoCobrar').textContent = encargo ? 'Registrar encargo' : 'Cobrar';
        document.getElementById('carritoCobrar').disabled = !this.carrito.length;

        // Si falta stock en una venta, ofrecer pasarla a encargo.
        const faltantes = encargo ? [] : this.carrito.filter(l => (this.stockDe(l.producto_id, l.talla) ?? 0) < l.cantidad);
        const aviso = document.getElementById('carritoAviso');
        aviso.innerHTML = faltantes.length
            ? `<p class="aviso">No hay stock suficiente de ${faltantes.map(l => `${esc(l.producto)} T${esc(l.talla)}`).join(', ')}.
                <button type="button" class="btn btn-small" data-a-encargo>Registrar como encargo</button></p>`
            : '';
        aviso.querySelector('[data-a-encargo]')?.addEventListener('click', () => {
            form.encargo.checked = true;
            form.encargo.dispatchEvent(new Event('change'));
        });
    },

    async cobrar(datos) {
        if (!this.carrito.length) throw new Error('Agregue al menos una prenda al carrito.');
        const encargo = datos.encargo === 'on';
        const venta = await api.post('/ventas', {
            encargo,
            cliente_nombre: datos.cliente_nombre,
            cliente_telefono: datos.cliente_telefono,
            fecha_compromiso: encargo ? datos.fecha_compromiso || null : null,
            enviar_taller: encargo && datos.enviar_taller === 'on',
            descuento: num(datos.descuento) || 0,
            items: this.carrito.map(l => ({ producto_id: l.producto_id, talla: l.talla, cantidad: l.cantidad, precio_unitario: l.precio })),
            pago_inicial: num(datos.pago) > 0 ? { monto: num(datos.pago), medio_pago_id: num(datos.medio_pago_id) } : null,
        });

        const ordenes = venta.items.filter(i => i.orden).map(i => i.orden.codigo);
        const reservadas = venta.items.reduce((s, i) => s + i.reservada, 0);
        aviso(!encargo ? `Venta ${venta.codigo} registrada.`
            : `Encargo ${venta.codigo} registrado${reservadas ? ` · ${reservadas} prenda(s) reservada(s) del stock` : ''}${ordenes.length ? ` · al taller: ${ordenes.join(', ')}` : ''}.`);
        this.carrito = [];
        const form = document.getElementById('carritoForm');
        form.reset();
        form.pago.dataset.tocado = '';
        form.pago.dataset.proporcion = '';
        this.stock = await api.get('/inventario/prendas');
        this.dibujarProductos();
        this.dibujarCarrito();
    },

    // Resalta el botón rápido que coincide con el monto escrito.
    marcarPagoRapido() {
        const form = document.getElementById('carritoForm');
        const pago = num(form.pago.value) || 0;
        const total = this.total();
        form.querySelectorAll('[data-pago]').forEach(b =>
            b.classList.toggle('active', total > 0 && pago === Math.round(total * Number(b.dataset.pago))));
    },

    // ---------- Historial ----------

    dibujarHistorial() {
        const texto = document.getElementById('ventasBuscar').value.trim().toLowerCase();
        const filas = this.lista.filter(v =>
            !texto || `${v.codigo} ${v.cliente_nombre} ${v.cliente_telefono}`.toLowerCase().includes(texto));

        document.getElementById('ventasTabla').innerHTML = tabla([
            { titulo: 'Código', valor: v => `<strong>${esc(v.codigo)}</strong><span class="sub">${fmtFecha(v.fecha)}</span>` },
            { titulo: 'Cliente', valor: v => v.cliente_nombre ? `${esc(v.cliente_nombre)}<span class="sub">${esc(v.cliente_telefono)}</span>` : '<span class="muted">Venta mesón</span>' },
            { titulo: 'Prendas', valor: v => v.items.map(i => `${i.cantidad} × ${esc(i.producto)} T${esc(i.talla)}`).join('<br>') },
            { titulo: 'Total', clase: 'num', valor: v => fmtCLP(v.total) },
            { titulo: 'Saldo', clase: 'num', valor: v => v.saldo_pendiente > 0 ? `<strong>${fmtCLP(v.saldo_pendiente)}</strong>` : '—' },
            { titulo: 'Pago', valor: v => badge(v.estado_pago) },
            { titulo: 'Entrega', valor: v => this.estadoEntrega(v) },
            { titulo: '', clase: 'acciones', valor: v => `<button class="btn btn-small" data-ver="${v.id}">Ver</button>` },
        ], filas, 'No hay ventas con estos filtros.');

        document.querySelectorAll('#ventasTabla [data-ver]').forEach(b =>
            b.addEventListener('click', () => this.detalle(Number(b.dataset.ver))));
    },

    // "Entregada" / "Listo para retirar" / "Por entregar · En taller" / "Por entregar · Falta enviar al taller"
    estadoEntrega(v) {
        if (v.estado_entrega === 'Entregada') return badge('Entregada');
        const retiro = v.fecha_compromiso
            ? `<span class="sub ${v.fecha_compromiso < hoy() ? 'atrasado' : ''}">Retira ${fmtFecha(v.fecha_compromiso)}</span>` : '';
        if (v.listo_para_entregar) return `<span class="pill pill-green">Listo para retirar</span>${retiro}`;
        const enTaller = v.items.filter(i => i.orden && i.orden.estado !== 'Terminada');
        const sinOrden = v.items.filter(i => i.reservada < i.cantidad && !(i.orden && i.orden.estado !== 'Terminada'));
        const taller = enTaller.length
            ? `<span class="sub">En taller: ${enTaller.map(i => `${esc(i.orden.codigo)} (${esc(i.orden.estado)})`).join(', ')}</span>`
            : sinOrden.length ? '<span class="sub atrasado">Falta enviar al taller</span>' : '';
        return badge('Por entregar') + taller + retiro;
    },

    // ---------- Detalle: pagos, entrega, taller, anular ----------

    async detalle(id) {
        const [v, pagos, { mediosPago }] = await Promise.all([
            api.get(`/ventas/${id}`),
            api.get(`/ventas/${id}/pagos`),
            compartido.obtener('catalogos'),
        ]);
        const esEncargoPendiente = v.estado_entrega === 'Por entregar';
        const puedeProducir = esEncargoPendiente && puede('produccion');

        const caja = modal.abrir(`${v.codigo} · ${v.cliente_nombre || 'Venta mesón'}`, `
            <div class="form-grid">
                <div><span class="muted">Fecha</span><br>${fmtFecha(v.fecha)}</div>
                <div><span class="muted">Teléfono</span><br>${esc(v.cliente_telefono) || '—'}</div>
                <div><span class="muted">Entrega</span><br>${badge(v.estado_entrega)}
                    ${esEncargoPendiente ? `<span class="sub">Retira ${fmtFecha(v.fecha_compromiso)}</span>` : `<span class="sub">${fmtFecha(v.fecha_entrega)}</span>`}</div>
                <div><span class="muted">Pago</span><br>${badge(v.estado_pago)}</div>
            </div>

            ${v.listo_para_entregar ? `<p class="aviso">Listo para retirar: todas las prendas están reservadas para este cliente.
                ${v.cliente_telefono ? `Avise a ${esc(v.cliente_nombre)} al ${esc(v.cliente_telefono)}.` : ''}</p>` : ''}

            <h3>Prendas</h3>
            ${tabla([
                { titulo: 'Producto', valor: i => `${esc(i.producto)}<span class="sub">${esc(i.establecimiento)}</span>` },
                { titulo: 'Talla', valor: i => esc(i.talla) },
                { titulo: 'Cant.', clase: 'num', valor: i => i.cantidad },
                { titulo: 'Total', clase: 'num', valor: i => fmtCLP(i.total) },
                ...(esEncargoPendiente ? [{ titulo: 'Reservado / taller', clase: 'acciones', valor: i => {
                    const falta = i.cantidad - i.reservada;
                    const reservado = `<span class="sub">Reservado ${i.reservada} de ${i.cantidad}</span>`;
                    if (falta <= 0) return '<span class="pill pill-green">Reservado</span>';
                    if (i.orden && i.orden.estado !== 'Terminada') return `${esc(i.orden.codigo)} ${badge(i.orden.estado)}${reservado}`;
                    return (puedeProducir
                        ? `<button class="btn btn-small" data-taller="${i.producto_id}|${esc(i.talla)}|${falta}">Enviar al taller (${falta})</button>`
                        : `<span class="muted">Faltan ${falta}</span>`) + reservado;
                } }] : []),
            ], v.items, '', { porPagina: 0 })}
            <div class="totales">
                ${v.descuento ? `<span>Descuento: ${fmtCLP(v.descuento)}</span>` : ''}
                <span>Total</span><strong>${fmtCLP(v.total)}</strong>
                <span>Pagado ${fmtCLP(v.monto_pagado)} · Saldo <strong>${fmtCLP(v.saldo_pendiente)}</strong></span>
            </div>

            <h3>Pagos</h3>
            ${tabla([
                { titulo: 'Fecha', valor: p => fmtFecha(p.fecha) },
                { titulo: 'Medio', valor: p => esc(p.medio_pago) },
                { titulo: 'Detalle', valor: p => esc(p.observacion) },
                { titulo: 'Monto', clase: 'num', valor: p => fmtCLP(p.monto) },
            ], pagos, 'Sin pagos registrados.')}

            ${v.saldo_pendiente > 0 ? `
                <form class="form-grid" data-pago style="margin-top:10px">
                    ${campo('Registrar pago', `<input type="number" name="monto" min="1" max="${v.saldo_pendiente}" value="${v.saldo_pendiente}" required>`)}
                    ${campo('Medio de pago', `<select name="medio_pago_id">${opciones(mediosPago)}</select>`)}
                    <div class="full"><button type="submit" class="btn btn-primary">Registrar pago</button><p class="error-form"></p></div>
                </form>` : ''}

            <div class="modal-actions">
                <button type="button" class="btn btn-danger" data-anular>Anular</button>
                ${esEncargoPendiente ? '<button type="button" class="btn btn-primary" data-entregar>Marcar como entregado</button>' : ''}
            </div>`, { ancho: true });

        const formPago = caja.querySelector('[data-pago]');
        if (formPago) alEnviar(formPago, async datos => {
            await api.post(`/ventas/${id}/pagos`, { monto: num(datos.monto), medio_pago_id: num(datos.medio_pago_id) });
            aviso('Pago registrado.');
            await this.detalle(id);
            if (this.pestana === 'historial') await this.cargar();
        });

        caja.querySelector('[data-entregar]')?.addEventListener('click', () => intentar(async () => {
            await api.patch(`/ventas/${id}/entregar`);
            modal.cerrar();
            if (vistaVisible('ventas')) await this.cargar();
        }, 'Encargo entregado. Stock descontado.'));

        caja.querySelector('[data-anular]').addEventListener('click', () => {
            const msg = v.estado_entrega === 'Entregada'
                ? `¿Anular ${v.codigo}? Las prendas vuelven al stock y se borran sus pagos.`
                : `¿Anular el encargo ${v.codigo}? Lo reservado vuelve al stock y se borran sus abonos.`;
            if (!confirm(msg)) return;
            intentar(async () => {
                await api.delete(`/ventas/${id}`);
                modal.cerrar();
                if (vistaVisible('ventas')) await this.cargar();
            }, `${v.codigo} anulada.`);
        });

        caja.querySelectorAll('[data-taller]').forEach(b => b.addEventListener('click', () => {
            const [productoId, talla, cantidad] = b.dataset.taller.split('|');
            intentar(async () => {
                const orden = await api.post('/produccion/ordenes', {
                    producto_id: num(productoId), talla, cantidad: num(cantidad), venta_id: id,
                    observacion: `Encargo de ${v.cliente_nombre}`,
                });
                aviso(`Orden ${orden.codigo} creada en Producción.`);
                await this.detalle(id);
            });
        }));
    },
};
