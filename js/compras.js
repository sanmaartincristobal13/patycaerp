// ======================================================
// COMPRAS Y GASTOS
// ======================================================
// Registrar una compra suma el stock de los materiales y
// actualiza su último precio. Los gastos (mano de obra,
// transporte, etc.) no mueven stock.
// ======================================================

vistas.compras = {

    pestana: 'compras',

    iniciar() {
        document.querySelectorAll('#view-compras .tab').forEach(t => t.addEventListener('click', () => {
            document.querySelectorAll('#view-compras .tab').forEach(x => x.classList.toggle('active', x === t));
            this.pestana = t.dataset.tab;
            this.cargar();
        }));
        document.getElementById('btnNuevaCompra').addEventListener('click', () => this.formularioCompra());
        document.getElementById('btnNuevoProveedor').addEventListener('click', () => this.formularioProveedor());
        document.getElementById('btnNuevoGasto').addEventListener('click', () => this.formularioGasto());
        // Los gastos requieren el permiso de finanzas.
        document.getElementById('btnNuevoGasto').hidden = !puede('finanzas');
        document.getElementById('btnTotalGastos').addEventListener('click', () => this.formularioTotalGastos());
        document.getElementById('btnTotalGastos').hidden = !puede('finanzas');
        document.querySelector('#view-compras [data-tab=gastos]').hidden = !puede('finanzas');
    },

    irAPestana(nombre) {
        this.pestana = nombre;
        document.querySelectorAll('#view-compras .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === nombre));
        return this.cargar();
    },

    async cargar() {
        const contenedor = document.getElementById('comprasTabla');

        if (this.pestana === 'proveedores') {
            const proveedores = await compartido.obtener('proveedores');
            contenedor.innerHTML = tabla([
                { titulo: 'Código', valor: p => esc(p.codigo) },
                { titulo: 'Proveedor', valor: p => `<strong>${esc(p.nombre)}</strong>${p.rut ? `<span class="sub">RUT ${esc(p.rut)}</span>` : ''}` },
                { titulo: 'Rubro', valor: p => esc(p.categoria) },
                { titulo: 'Contacto', valor: p => [p.telefono, p.email].filter(Boolean).map(esc).join('<br>') || '—' },
                { titulo: '', clase: 'acciones', valor: p => `<button class="btn btn-small" data-editar="${p.id}">Editar</button>` },
            ], proveedores, 'No hay proveedores.');
            contenedor.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () =>
                this.formularioProveedor(proveedores.find(p => p.id === num(b.dataset.editar)))));
            return;
        }

        if (this.pestana === 'gastos') {
            const gastos = await api.get('/finanzas/gastos');
            contenedor.innerHTML = tabla([
                { titulo: 'Código', valor: g => `<strong>${esc(g.codigo)}</strong><span class="sub">${g.sin_detalle
                    ? `<span class="proy-mes">${fmtMes(g.fecha, { month: 'long', year: 'numeric' })}</span>` : fmtFecha(g.fecha)}</span>` },
                { titulo: 'Categoría', valor: g => esc(g.categoria) },
                { titulo: 'Concepto', valor: g => `${esc(g.concepto)}${g.sin_detalle ? ' <span class="pill pill-gray">Total del mes</span>' : ''}` },
                { titulo: 'Monto', clase: 'num', valor: g => fmtCLP(g.monto) },
                { titulo: 'Registró', valor: g => esc(g.usuario) },
                { titulo: '', clase: 'acciones', valor: g => `<button class="btn btn-small btn-danger" data-borrar-gasto="${g.id}">Eliminar</button>` },
            ], gastos, 'No hay gastos registrados.');
            contenedor.querySelectorAll('[data-borrar-gasto]').forEach(b => b.addEventListener('click', () => {
                if (!confirm('¿Eliminar este gasto?')) return;
                intentar(async () => {
                    await api.delete(`/finanzas/gastos/${b.dataset.borrarGasto}`);
                    await this.cargar();
                }, 'Gasto eliminado.');
            }));
            return;
        }

        const compras = await api.get('/compras');
        contenedor.innerHTML = tabla([
            { titulo: 'Código', valor: c => `<strong>${esc(c.codigo)}</strong><span class="sub">${fmtFecha(c.fecha)}</span>` },
            { titulo: 'Proveedor', valor: c => `${esc(c.proveedor)}${c.documento ? `<span class="sub">Doc. ${esc(c.documento)}</span>` : ''}` },
            { titulo: 'Materiales', valor: c => c.items.map(i => `${fmtNumero(i.cantidad)} ${esc(i.unidad)} ${esc(i.material)}`).join('<br>') },
            { titulo: 'Total', clase: 'num', valor: c => fmtCLP(c.total) },
            { titulo: 'Saldo', clase: 'num', valor: c => c.saldo_pendiente > 0 ? `<strong>${fmtCLP(c.saldo_pendiente)}</strong>` : '—' },
            { titulo: 'Pago', valor: c => badge(c.estado_pago) + (c.vencimiento && c.saldo_pendiente > 0
                ? `<span class="sub ${c.vencimiento < hoy() ? 'atrasado' : ''}">Vence ${fmtFecha(c.vencimiento)}</span>` : '') },
            { titulo: '', clase: 'acciones', valor: c => c.saldo_pendiente > 0 ? `<button class="btn btn-small" data-pagar="${c.id}">Pagar</button>` : '' },
        ], compras, 'Aún no hay compras registradas.');

        contenedor.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () =>
            this.formularioPago(compras.find(c => c.id === num(b.dataset.pagar)))));
    },

    // precarga (opcional): { proveedorId, items: [{material_id, cantidad}], alGuardar }
    // La usa Inventario → Reposición para comprar lo sugerido.
    async formularioCompra(precarga = {}) {
        const [proveedores, materiales, { mediosPago }] = await Promise.all([
            compartido.obtener('proveedores'),
            compartido.obtener('materiales'),
            compartido.obtener('catalogos'),
        ]);
        const caja = modal.abrir('Nueva compra', `
            <form>
                <div class="form-grid">
                    ${campo('Proveedor', `<select name="proveedor_id" required>${opciones(proveedores, { vacio: 'Elegir...', seleccionado: precarga.proveedorId })}</select>`)}
                    ${campo('Fecha', `<input type="date" name="fecha" value="${hoy()}" required>`)}
                    ${campo('N° factura / boleta', '<input name="documento">')}
                    ${campo('Vence el pago', '<input type="date" name="vencimiento">')}
                </div>
                <table class="lineas">
                    <thead><tr><th>Material</th><th style="width:110px">Cantidad</th><th style="width:120px">Precio unitario</th><th style="width:30px"></th></tr></thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="btn btn-small" data-agregar>+ Agregar material</button>
                <div class="form-grid" style="margin-top:12px">
                    ${campo('Pagado ahora', '<input type="number" name="pago" min="0" placeholder="0 = queda pendiente">')}
                    ${campo('Medio de pago', `<select name="medio_pago_id">${opciones(mediosPago)}</select>`)}
                </div>
                <div class="totales"><span>Total</span><strong data-total>$0</strong></div>
                ${PIE_FORM('Registrar compra')}
            </form>`, { ancho: true });

        const form = caja.querySelector('form');
        const cuerpo = form.querySelector('tbody');
        const recalcular = () => {
            const total = [...cuerpo.rows].reduce((s, f) =>
                s + num(f.querySelector('[name=cantidad]').value) * num(f.querySelector('[name=precio]').value), 0);
            form.querySelector('[data-total]').textContent = fmtCLP(total);
        };
        const agregar = (materialId = null, cantidad = '') => {
            const precio = materiales.find(m => m.id === materialId)?.ultimo_precio ?? '';
            const fila = cuerpo.insertRow();
            fila.innerHTML = `
                <td><select name="material" required>${opciones(materiales, { texto: m => `${m.detalle} (${m.unidad})`, vacio: 'Elegir...', seleccionado: materialId })}</select></td>
                <td><input type="number" name="cantidad" min="0.001" step="any" required value="${esc(cantidad)}"></td>
                <td><input type="number" name="precio" min="0" step="any" required value="${esc(precio)}"></td>
                <td><button type="button" class="btn btn-small" data-quitar>×</button></td>`;
            // Propone el último precio pagado por ese material.
            fila.querySelector('select').addEventListener('change', e => {
                const m = materiales.find(x => x.id === num(e.target.value));
                fila.querySelector('[name=precio]').value = m?.ultimo_precio || '';
                recalcular();
            });
            fila.addEventListener('input', recalcular);
            fila.querySelector('[data-quitar]').addEventListener('click', () => {
                if (cuerpo.rows.length > 1) { fila.remove(); recalcular(); }
            });
        };
        form.querySelector('[data-agregar]').addEventListener('click', () => agregar());
        if (precarga.items?.length) precarga.items.forEach(i => agregar(i.material_id, i.cantidad));
        else agregar();
        recalcular();

        alEnviar(form, async datos => {
            const compra = await api.post('/compras', {
                proveedor_id: num(datos.proveedor_id),
                fecha: datos.fecha,
                documento: datos.documento,
                vencimiento: datos.vencimiento || null,
                items: [...cuerpo.rows].map(f => ({
                    material_id: num(f.querySelector('[name=material]').value),
                    cantidad: num(f.querySelector('[name=cantidad]').value),
                    precio_unitario: num(f.querySelector('[name=precio]').value),
                })),
                pago_inicial: num(datos.pago) > 0 ? { monto: num(datos.pago), medio_pago_id: num(datos.medio_pago_id) } : null,
            });
            compartido.refrescar('materiales');
            modal.cerrar();
            aviso(`Compra ${compra.codigo} registrada. Stock actualizado.`);
            if (precarga.alGuardar) await precarga.alGuardar();
            else await this.cargar();
        });
    },

    // Gasto de un mes anotado como un solo monto (igual que "Totales sin detalle" de ventas).
    async formularioTotalGastos() {
        const { categoriasGasto } = await compartido.obtener('catalogos');
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
        const mesPasado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const otro = categoriasGasto.find(c => c.nombre === 'Otro')?.id;

        const caja = modal.abrir('Total de gastos del mes', `
            <form>
                <p class="aviso">Para gastos que solo tiene como <strong>total del mes</strong>.
                    No incluya aquí gastos que ya registró uno por uno, o se contarán dos veces.</p>
                <div class="form-grid">
                    ${campo('Mes', `<input type="month" name="mes" required value="${mesPasado}" max="${hoy().slice(0, 7)}">`)}
                    ${campo('Monto gastado ($)', '<input type="number" name="monto" min="1" required>')}
                    ${campo('Categoría', `<select name="categoria_gasto_id">${opciones(categoriasGasto, { seleccionado: otro })}</select>`)}
                    ${campo('Nota', '<input name="nota" placeholder="Ej: según cuaderno de gastos">')}
                </div>
                <p class="helper-text">Puede registrar un total por categoría (varias veces para el mismo mes).</p>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            const nombreMes = fmtMes(`${datos.mes}-01`, { month: 'long', year: 'numeric' });
            await api.post('/finanzas/gastos', {
                fecha: `${datos.mes}-01`,
                categoria_gasto_id: num(datos.categoria_gasto_id),
                concepto: datos.nota ? `Total de ${nombreMes}: ${datos.nota}` : `Total de gastos de ${nombreMes}`,
                monto: num(datos.monto),
                sin_detalle: true,
            });
            modal.cerrar();
            aviso('Total de gastos registrado.');
            await this.irAPestana('gastos');
        });
    },

    async formularioGasto() {
        const { categoriasGasto } = await compartido.obtener('catalogos');
        const caja = modal.abrir('Registrar gasto', `
            <form>
                <div class="form-grid">
                    ${campo('Fecha', `<input type="date" name="fecha" value="${hoy()}" required>`)}
                    ${campo('Categoría', `<select name="categoria_gasto_id" required>${opciones(categoriasGasto)}</select>`)}
                    ${campo('Concepto', '<input name="concepto" required placeholder="Ej: pago costurera semana 2">', 'full')}
                    ${campo('Monto', '<input type="number" name="monto" min="1" required>')}
                </div>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            await api.post('/finanzas/gastos', { ...datos, monto: num(datos.monto) });
            modal.cerrar();
            aviso('Gasto registrado.');
            await this.irAPestana('gastos');
        });
    },

    async formularioPago(compra) {
        const { mediosPago } = await compartido.obtener('catalogos');
        const caja = modal.abrir(`Pagar ${compra.codigo}`, `
            <form>
                <p class="aviso">${esc(compra.proveedor)} · Saldo pendiente <strong>${fmtCLP(compra.saldo_pendiente)}</strong></p>
                <div class="form-grid">
                    ${campo('Monto', `<input type="number" name="monto" min="1" max="${compra.saldo_pendiente}" value="${compra.saldo_pendiente}" required>`)}
                    ${campo('Medio de pago', `<select name="medio_pago_id">${opciones(mediosPago)}</select>`)}
                    ${campo('Fecha', `<input type="date" name="fecha" value="${hoy()}">`)}
                    ${campo('Observación', '<input name="observacion">')}
                </div>
                ${PIE_FORM('Registrar pago')}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            await api.post(`/compras/${compra.id}/pagos`, { ...datos, monto: num(datos.monto), medio_pago_id: num(datos.medio_pago_id) });
            modal.cerrar();
            aviso('Pago registrado.');
            await this.cargar();
        });
    },

    formularioProveedor(proveedor = null) {
        const caja = modal.abrir(proveedor ? `Editar ${proveedor.codigo}` : 'Nuevo proveedor', `
            <form>
                <div class="form-grid">
                    ${campo('Nombre', `<input name="nombre" required value="${esc(proveedor?.nombre)}">`, 'full')}
                    ${campo('Rubro', `<input name="categoria" value="${esc(proveedor?.categoria)}" placeholder="Ej: Telas">`)}
                    ${campo('RUT', `<input name="rut" value="${esc(proveedor?.rut)}">`)}
                    ${campo('Teléfono', `<input name="telefono" value="${esc(proveedor?.telefono)}">`)}
                    ${campo('Email', `<input type="email" name="email" value="${esc(proveedor?.email)}">`)}
                </div>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            if (proveedor) await api.put(`/proveedores/${proveedor.id}`, datos);
            else await api.post('/proveedores', datos);
            compartido.refrescar('proveedores');
            modal.cerrar();
            aviso('Proveedor guardado.');
            await this.irAPestana('proveedores');
        });
    },
};
