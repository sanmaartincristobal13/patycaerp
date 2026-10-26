// ======================================================
// COTIZACIONES
// ======================================================
// Cotización para un colegio, institución o empresa:
// ítems libres (producto, cantidad, característica y precio NETO),
// totales con IVA y PDF listo para enviar (js/cotizacion-pdf.js).
// ======================================================

const ESTADOS_COTIZACION = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'];
const IVA_COTIZACION = 0.19;

vistas.cotizaciones = {

    lista: [],

    iniciar() {
        document.getElementById('btnNuevaCotizacion').addEventListener('click', () => this.formulario());
        document.getElementById('cotFiltroEstado').addEventListener('change', () => this.cargar());
        document.getElementById('cotBuscar').addEventListener('input', () => this.dibujar());
    },

    async cargar() {
        const estado = document.getElementById('cotFiltroEstado').value;
        this.lista = await api.get('/cotizaciones' + (estado ? `?estado=${encodeURIComponent(estado)}` : ''));
        this.dibujar();
    },

    dibujar() {
        const texto = document.getElementById('cotBuscar').value.trim().toLowerCase();
        const filas = this.lista.filter(c => !texto || `${c.codigo} ${c.referencia}`.toLowerCase().includes(texto));
        const resumenItems = c => {
            const primeros = c.items.slice(0, 2).map(i => `${fmtNumero(i.cantidad)} × ${esc(i.producto)}`).join('<br>');
            return c.items.length > 2 ? `${primeros}<span class="sub">y ${c.items.length - 2} más</span>` : primeros;
        };
        const bloqueada = c => c.ventas_generadas.length > 0;

        const contenedor = document.getElementById('cotizacionesTabla');
        contenedor.innerHTML = tabla([
            { titulo: 'Código', valor: c => `<strong>${esc(c.codigo)}</strong><span class="sub">${fmtFecha(c.fecha)}</span>` },
            { titulo: 'Señores', valor: c => esc(c.referencia) },
            { titulo: 'Detalle', valor: resumenItems },
            { titulo: 'Total', clase: 'num', valor: c => `<strong>${fmtCLP(c.total)}</strong><span class="sub">Neto ${fmtCLP(c.neto)}</span>` },
            { titulo: 'Estado', valor: c => bloqueada(c)
                ? `${badge(c.estado)}<span class="sub">Venta ${c.ventas_generadas.map(esc).join(', ')}</span>`
                : `<select class="select-estado" data-estado="${c.id}" aria-label="Estado">${ESTADOS_COTIZACION.map(e =>
                    `<option ${e === c.estado ? 'selected' : ''}>${e}</option>`).join('')}</select>` },
            { titulo: '', clase: 'acciones', valor: c => `
                <button class="btn btn-small btn-primary" data-pdf="${c.id}">PDF</button>
                ${bloqueada(c) ? '' : `<button class="btn btn-small" data-editar="${c.id}">Editar</button>
                <button class="btn btn-small btn-danger" data-borrar="${c.id}">Eliminar</button>`}` },
        ], filas, 'Aún no hay cotizaciones. Use "+ Nueva cotización".');

        const buscar = id => this.lista.find(c => c.id === num(id));
        contenedor.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', () =>
            intentar(() => cotizacionPdf.abrir(num(b.dataset.pdf)))));
        contenedor.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () =>
            this.formulario(buscar(b.dataset.editar))));
        contenedor.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', () => {
            const c = buscar(b.dataset.borrar);
            if (!confirm(`¿Eliminar la cotización ${c.codigo} de ${c.referencia}?`)) return;
            intentar(async () => {
                await api.delete(`/cotizaciones/${c.id}`);
                await this.cargar();
            }, `Cotización ${c.codigo} eliminada.`);
        }));
        contenedor.querySelectorAll('[data-estado]').forEach(s => s.addEventListener('change', () =>
            intentar(async () => {
                await api.patch(`/cotizaciones/${s.dataset.estado}/estado`, { estado: s.value });
                await this.cargar();
            }, 'Estado actualizado.')));
    },

    // Crear o editar. Al guardar puede abrir el PDF de inmediato.
    async formulario(cot = null) {
        const productos = await compartido.obtener('productos');
        // Sugerencias de nombre: las prendas del catálogo (sin repetir).
        const sugerencias = [...new Set(productos.map(p => p.nombre))].sort();

        const caja = modal.abrir(cot ? `Editar ${cot.codigo}` : 'Nueva cotización', `
            <form>
                <div class="form-grid">
                    ${campo('Señores (cliente)', `<input name="referencia" required placeholder="Ej: Corporación de Deportes Maule" value="${esc(cot?.referencia)}">`, 'full')}
                    ${campo('Fecha', `<input type="date" name="fecha" value="${esc(cot?.fecha?.slice(0, 10) || hoy())}" required>`)}
                </div>
                <datalist id="cotSugerencias">${sugerencias.map(s => `<option value="${esc(s)}">`).join('')}</datalist>
                <table class="lineas lineas-cotizacion">
                    <thead><tr>
                        <th>Producto</th><th style="width:90px">Cantidad</th><th>Característica</th>
                        <th style="width:120px">P. unitario neto</th><th style="width:110px" class="num">Total</th><th style="width:30px"></th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="btn btn-small" data-agregar>+ Agregar ítem</button>
                <div class="totales totales-cotizacion">
                    <span>Neto <strong data-neto>$0</strong></span>
                    <span>IVA (19%) <strong data-iva>$0</strong></span>
                    <span>Total <strong data-total>$0</strong></span>
                </div>
                ${campo('Observaciones (opcional, salen en el PDF)', `<textarea name="observacion" rows="2" placeholder="Ej: Plazo de entrega 20 días hábiles. Validez de la oferta 15 días.">${esc(cot?.observacion)}</textarea>`)}
                <p class="error-form"></p>
                <div class="modal-actions">
                    <button type="button" class="btn" data-cerrar>Cancelar</button>
                    <button type="submit" class="btn" name="accion" value="guardar">Guardar</button>
                    <button type="submit" class="btn btn-primary" name="accion" value="pdf">Guardar y ver PDF</button>
                </div>
            </form>`, { ancho: true });

        const form = caja.querySelector('form');
        const cuerpo = form.querySelector('tbody');
        const valor = (fila, nombre) => fila.querySelector(`[name=${nombre}]`).value;

        const recalcular = () => {
            let neto = 0;
            [...cuerpo.rows].forEach(f => {
                const total = (num(valor(f, 'cantidad')) || 0) * (num(valor(f, 'precio')) || 0);
                f.querySelector('[data-total-fila]').textContent = fmtCLP(total);
                neto += total;
            });
            const iva = Math.round(neto * IVA_COTIZACION);
            form.querySelector('[data-neto]').textContent = fmtCLP(neto);
            form.querySelector('[data-iva]').textContent = fmtCLP(iva);
            form.querySelector('[data-total]').textContent = fmtCLP(neto + iva);
        };

        const agregar = (item = {}) => {
            const fila = cuerpo.insertRow();
            fila.innerHTML = `
                <td><input name="producto" list="cotSugerencias" required value="${esc(item.producto)}" placeholder="Ej: Polera deportiva"></td>
                <td><input type="number" name="cantidad" min="1" step="1" required value="${esc(item.cantidad)}"></td>
                <td><input name="caracteristica" value="${esc(item.caracteristica)}" placeholder="Tela, estampado DTF, logos..."></td>
                <td><input type="number" name="precio" min="0" step="1" required value="${esc(item.precio_unitario)}"></td>
                <td class="num" data-total-fila>$0</td>
                <td><button type="button" class="btn btn-small" data-quitar title="Quitar">×</button></td>`;
            fila.addEventListener('input', recalcular);
            fila.querySelector('[data-quitar]').addEventListener('click', () => {
                if (cuerpo.rows.length > 1) { fila.remove(); recalcular(); }
            });
        };

        form.querySelector('[data-agregar]').addEventListener('click', () => {
            agregar();
            cuerpo.rows[cuerpo.rows.length - 1].querySelector('input').focus();
        });
        (cot?.items.length ? cot.items : [{}]).forEach(agregar);
        recalcular();

        // Qué botón se usó para enviar (Guardar / Guardar y ver PDF).
        let accion = 'guardar';
        form.querySelectorAll('[name=accion]').forEach(b => b.addEventListener('click', () => (accion = b.value)));

        alEnviar(form, async datos => {
            const cuerpoPeticion = {
                referencia: datos.referencia,
                fecha: datos.fecha,
                observacion: datos.observacion,
                descuento: 0,
                items: [...cuerpo.rows].map(f => ({
                    descripcion: valor(f, 'producto'),
                    caracteristica: valor(f, 'caracteristica'),
                    cantidad: num(valor(f, 'cantidad')),
                    precio_unitario: num(valor(f, 'precio')),
                })),
            };
            const guardada = cot
                ? await api.put(`/cotizaciones/${cot.id}`, cuerpoPeticion)
                : await api.post('/cotizaciones', cuerpoPeticion);
            modal.cerrar();
            aviso(`Cotización ${guardada.codigo} guardada.`);
            await this.cargar();
            if (accion === 'pdf') await cotizacionPdf.abrir(guardada.id);
        });
    },
};
