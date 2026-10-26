// ======================================================
// CONFIGURACIÓN - empresa y usuarios
// ======================================================

vistas.configuracion = {

    iniciar() {
        document.getElementById('btnNuevoUsuario').addEventListener('click', () => this.formularioUsuario());
    },

    async cargar() {
        const [config, usuarios] = await Promise.all([api.get('/configuracion'), api.get('/usuarios')]);

        const form = document.getElementById('formConfig');
        form.innerHTML = `
            <div class="form-grid">
                ${campo('Nombre de la empresa', `<input name="empresa" required value="${esc(config.empresa)}">`, 'full')}
                ${campo('Nombre del taller', `<input name="taller" required value="${esc(config.taller)}">`, 'full')}
                ${campo('Días de anticipación para alertas (entregas de producción y pagos)', `<input type="number" name="dias_aviso_vencimiento" min="0" value="${config.dias_aviso_vencimiento}">`, 'full')}
                ${campo('Saldo inicial de caja', `<input type="number" name="saldo_inicial" value="${config.saldo_inicial}">`)}
                ${campo('Fecha del saldo inicial', `<input type="date" name="fecha_saldo_inicial" value="${esc(config.fecha_saldo_inicial || '')}">`)}
            </div>
            <p class="error-form"></p>
            <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>`;

        // Se reemplaza el form para no acumular listeners entre recargas.
        const limpio = form.cloneNode(true);
        form.replaceWith(limpio);
        alEnviar(limpio, async datos => {
            // Se parte de lo guardado para no pisar los datos de cotización (otro panel).
            const actual = await api.get('/configuracion');
            await api.put('/configuracion', {
                ...actual,
                ...datos,
                dias_aviso_vencimiento: num(datos.dias_aviso_vencimiento),
                saldo_inicial: num(datos.saldo_inicial) ?? 0,
                fecha_saldo_inicial: datos.fecha_saldo_inicial || null,
            });
            aviso('Configuración guardada.');
        });

        this.formularioCotizacion(config);

        document.getElementById('configUsuarios').innerHTML = tabla([
            { titulo: 'Nombre', valor: u => `<strong>${esc(u.nombre)}</strong><span class="sub">${esc(u.email)}</span>` },
            { titulo: 'Rol', valor: u => esc(u.rol) },
            { titulo: 'Estado', valor: u => u.activo ? '<span class="pill pill-green">Activo</span>' : '<span class="pill pill-gray">Inactivo</span>' },
            { titulo: '', clase: 'acciones', valor: u => `<button class="btn btn-small" data-editar="${u.id}">Editar</button>` },
        ], usuarios);

        document.querySelectorAll('#configUsuarios [data-editar]').forEach(b => b.addEventListener('click', () =>
            this.formularioUsuario(usuarios.find(u => u.id === num(b.dataset.editar)))));
    },

    // Datos del emisor, textos y firma que aparecen en el PDF de cotizaciones.
    formularioCotizacion(config) {
        let firma = config.firma_imagen || '';
        const form = document.getElementById('formCotizacionConfig');
        form.innerHTML = `
            <div class="form-grid">
                ${campo('Nombre del emisor', `<input name="emisor_nombre" required value="${esc(config.emisor_nombre)}">`, 'full')}
                ${campo('RUT', `<input name="emisor_rut" value="${esc(config.emisor_rut)}" placeholder="12.345.678-9">`)}
                ${campo('Giro', `<input name="emisor_giro" value="${esc(config.emisor_giro)}" placeholder="Confección de uniformes">`)}
                ${campo('Dirección', `<input name="emisor_direccion" value="${esc(config.emisor_direccion)}">`, 'full')}
                ${campo('Teléfonos', `<input name="emisor_telefonos" value="${esc(config.emisor_telefonos)}" placeholder="+56 9 ...">`)}
                ${campo('Correo', `<input type="email" name="emisor_correo" value="${esc(config.emisor_correo)}">`)}
                ${campo('Lema (bajo el título)', `<textarea name="cotizacion_lema" rows="2">${esc(config.cotizacion_lema)}</textarea>`, 'full')}
                ${campo('Texto de cierre (antes de la firma)', `<textarea name="cotizacion_cierre" rows="2">${esc(config.cotizacion_cierre)}</textarea>`, 'full')}
                ${campo('Nombre bajo la firma', `<input name="firma_nombre" value="${esc(config.firma_nombre)}">`, 'full')}
                <div class="field full">
                    <label>Firma digitalizada (PNG o JPG, idealmente con fondo transparente)</label>
                    <div class="firma-config">
                        <img data-firma-vista alt="Firma" ${firma ? `src="${firma}"` : 'hidden'}>
                        <span class="muted" data-firma-vacia ${firma ? 'hidden' : ''}>Sin firma: el PDF deja la línea para firmar a mano.</span>
                    </div>
                    <input type="file" accept="image/png,image/jpeg" data-firma-archivo>
                    <button type="button" class="btn btn-small" data-firma-quitar ${firma ? '' : 'hidden'}>Quitar firma</button>
                </div>
            </div>
            <p class="error-form"></p>
            <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar datos de cotización</button></div>`;

        const limpio = form.cloneNode(true);
        form.replaceWith(limpio);
        const vista = limpio.querySelector('[data-firma-vista]');
        const mostrarFirma = () => {
            vista.hidden = !firma;
            if (firma) vista.src = firma; else vista.removeAttribute('src');
            limpio.querySelector('[data-firma-vacia]').hidden = !!firma;
            limpio.querySelector('[data-firma-quitar]').hidden = !firma;
        };
        limpio.querySelector('[data-firma-archivo]').addEventListener('change', event => {
            const archivo = event.target.files[0];
            if (!archivo) return;
            if (archivo.size > 500 * 1024) {
                aviso('La imagen pesa más de 500 KB. Recórtela o redúzcala e intente de nuevo.', true);
                event.target.value = '';
                return;
            }
            const lector = new FileReader();
            lector.onload = () => { firma = lector.result; mostrarFirma(); };
            lector.readAsDataURL(archivo);
        });
        limpio.querySelector('[data-firma-quitar]').addEventListener('click', () => {
            firma = '';
            limpio.querySelector('[data-firma-archivo]').value = '';
            mostrarFirma();
        });

        alEnviar(limpio, async datos => {
            // Se parte de lo guardado para no pisar lo que se cambió en el panel Empresa.
            const actual = await api.get('/configuracion');
            await api.put('/configuracion', { ...actual, ...datos, firma_imagen: firma });
            aviso('Datos de cotización guardados.');
        });
    },

    async formularioUsuario(u = null) {
        const { roles } = await compartido.obtener('catalogos');
        const caja = modal.abrir(u ? `Editar ${u.nombre}` : 'Nuevo usuario', `
            <form>
                <div class="form-grid">
                    ${campo('Nombre', `<input name="nombre" required value="${esc(u?.nombre)}">`, 'full')}
                    ${campo('Correo', `<input type="email" name="email" required value="${esc(u?.email)}" ${u ? 'disabled' : ''}>`, 'full')}
                    ${campo('Rol', `<select name="rol_id">${opciones(roles, { seleccionado: u?.rol_id })}</select>`)}
                    ${campo(u ? 'Nueva clave (dejar vacío para no cambiar)' : 'Clave', `<input type="password" name="password" minlength="8" ${u ? '' : 'required'}>`)}
                    ${u ? campo('Estado', `<select name="activo"><option value="1" ${u.activo ? 'selected' : ''}>Activo</option><option value="0" ${u.activo ? '' : 'selected'}>Inactivo</option></select>`) : ''}
                </div>
                ${PIE_FORM()}
            </form>`);

        alEnviar(caja.querySelector('form'), async datos => {
            if (u) {
                await api.put(`/usuarios/${u.id}`, {
                    nombre: datos.nombre, rol_id: num(datos.rol_id),
                    activo: datos.activo === '1', password: datos.password || null,
                });
            } else {
                await api.post('/usuarios', { ...datos, rol_id: num(datos.rol_id) });
            }
            modal.cerrar();
            aviso('Usuario guardado.');
            await this.cargar();
        });
    },
};
