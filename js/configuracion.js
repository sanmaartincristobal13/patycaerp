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
            await api.put('/configuracion', {
                ...config,
                ...datos,
                dias_aviso_vencimiento: num(datos.dias_aviso_vencimiento),
                saldo_inicial: num(datos.saldo_inicial) ?? 0,
                fecha_saldo_inicial: datos.fecha_saldo_inicial || null,
            });
            aviso('Configuración guardada.');
        });

        document.getElementById('configUsuarios').innerHTML = tabla([
            { titulo: 'Nombre', valor: u => `<strong>${esc(u.nombre)}</strong><span class="sub">${esc(u.email)}</span>` },
            { titulo: 'Rol', valor: u => esc(u.rol) },
            { titulo: 'Estado', valor: u => u.activo ? '<span class="pill pill-green">Activo</span>' : '<span class="pill pill-gray">Inactivo</span>' },
            { titulo: '', clase: 'acciones', valor: u => `<button class="btn btn-small" data-editar="${u.id}">Editar</button>` },
        ], usuarios);

        document.querySelectorAll('#configUsuarios [data-editar]').forEach(b => b.addEventListener('click', () =>
            this.formularioUsuario(usuarios.find(u => u.id === num(b.dataset.editar)))));
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
