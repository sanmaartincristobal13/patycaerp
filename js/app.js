// ======================================================
// PATYCA ERP V6 - APP PRINCIPAL
// ======================================================


// ======================================================
// SESIÓN
// ======================================================

const usuarioGuardado =
    sessionStorage.getItem(
        "usuarioPatyca"
    );


if (
    !usuarioGuardado
) {

    window.location.href =
        "login.html";


    throw new Error(
        "No existe sesión iniciada."
    );

}


const usuarioActivo =
    JSON.parse(
        usuarioGuardado
    );


// ======================================================
// DATOS
// ======================================================

let db =
    normalizarDb(

        Store.load()

        ||

        seedData()

    );


// ======================================================
// GUARDAR
// ======================================================

function persist() {

    Store.save(
        db
    );

}


// ======================================================
// MONEDA
// ======================================================

function fmtCLP(
    numero
) {

    const valor =
        Math.round(

            Number(
                numero
                ||
                0
            )

        );


    return new Intl.NumberFormat(

        "es-CL",

        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0
        }

    )
    .format(
        valor
    );

}


// ======================================================
// FECHA LOCAL
// ======================================================

function todayStr() {

    const d =
        new Date();


    const año =
        d.getFullYear();


    const mes =
        String(
            d.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const dia =
        String(
            d.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return `${año}-${mes}-${dia}`;

}


// ======================================================
// FECHA Y HORA LEGIBLE
// ======================================================

function fechaHoraActual() {

    return new Date()
        .toLocaleString(
            "es-CL",
            {
                dateStyle:
                    "short",

                timeStyle:
                    "medium"
            }
        );

}


// ======================================================
// AUDITORÍA
// ======================================================

function registrarActividad(
    modulo,
    descripcion,
    extra = {}
) {

    if (
        !Array.isArray(
            db.actividad
        )
    ) {

        db.actividad = [];

    }


    db.actividad.push({

        id:
            Date.now()
            +
            Math.random(),

        fechaISO:
            new Date()
                .toISOString(),

        fecha:
            fechaHoraActual(),

        modulo:
            modulo,

        descripcion:
            descripcion,

        usuario:
            usuarioActivo.nombre
            ||
            "Usuario",

        rol:
            usuarioActivo.rol
            ||
            "Sin rol",

        referencia:
            extra.referencia
            ||
            "",

        accion:
            extra.accion
            ||
            ""

    });


    if (
        db.actividad.length >
        1000
    ) {

        db.actividad =
            db.actividad.slice(
                -1000
            );

    }

}


// ======================================================
// USUARIO
// ======================================================

function cargarUsuario() {

    const nombre =
        usuarioActivo.nombre
        ||
        "Usuario";


    const rol =
        usuarioActivo.rol
        ||
        "Usuario";


    const iniciales =

        nombre
            .split(
                " "
            )
            .filter(
                Boolean
            )
            .map(

                palabra =>
                    palabra[0]

            )
            .slice(
                0,
                2
            )
            .join("")
            .toUpperCase();


    const avatar =
        document.getElementById(
            "userAvatar"
        );


    const nombreText =
        document.getElementById(
            "userNameText"
        );


    const rolText =
        document.getElementById(
            "userRole"
        );


    if (
        avatar
    ) {

        avatar.textContent =
            iniciales;

    }


    if (
        nombreText
    ) {

        nombreText.textContent =
            nombre;

    }


    if (
        rolText
    ) {

        rolText.textContent =
            rol;

    }

}


// ======================================================
// LOGOUT
// ======================================================

document
    .getElementById(
        "logoutBtn"
    )
    ?.addEventListener(

        "click",

        () => {

            if (
                !confirm(
                    "¿Cerrar la sesión de PATYCA ERP?"
                )
            ) {

                return;

            }


            sessionStorage.removeItem(
                "usuarioPatyca"
            );


            window.location.href =
                "login.html";

        }

    );


// ======================================================
// GASTOS
// ======================================================

function openGastoModal() {

    if (
        !tienePermiso(
            "finanzas"
        )
    ) {

        alert(
            "No tienes permiso para registrar gastos."
        );

        return;

    }


    document
        .getElementById(
            "g_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "g_concepto"
        )
        .value =
        "";


    document
        .getElementById(
            "g_monto"
        )
        .value =
        "";


    openModal(
        "modalGasto"
    );

}


// ======================================================
// GUARDAR GASTO
// ======================================================

function saveGasto() {

    const concepto =
        document
            .getElementById(
                "g_concepto"
            )
            .value
            .trim();


    const monto =
        Number(

            document
                .getElementById(
                    "g_monto"
                )
                .value

        );


    if (
        !concepto
        ||
        !Number.isFinite(
            monto
        )
        ||
        monto <= 0
    ) {

        alert(
            "Completa un concepto y monto válidos."
        );

        return;

    }


    const gasto = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(
                "G",
                db.gastos
            ),

        fecha:
            document
                .getElementById(
                    "g_fecha"
                )
                .value,

        categoria:
            document
                .getElementById(
                    "g_categoria"
                )
                .value,

        concepto:
            concepto,

        monto:
            monto

    };


    db.gastos.push(
        gasto
    );


    registrarActividad(

        "Finanzas",

        "Gasto "
        +
        gasto.codigo
        +
        " · "
        +
        concepto
        +
        " · "
        +
        fmtCLP(
            monto
        ),

        {
            referencia:
                gasto.codigo,

            accion:
                "Crear gasto"
        }

    );


    persist();

    closeModal(
        "modalGasto"
    );

    renderAll();

}


// ======================================================
// GASTOS
// ======================================================

function renderGastos() {

    const tbody =
        document.getElementById(
            "tablaGastos"
        );


    if (
        !tbody
    ) {

        return;

    }


    tbody.innerHTML =

        db.gastos.length

        ?

        db.gastos
            .slice()
            .reverse()
            .map(

                gasto => `

                    <tr data-searchable>

                        <td>
                            ${gasto.fecha}
                        </td>

                        <td>
                            ${gasto.codigo || "—"}
                        </td>

                        <td>
                            ${gasto.categoria}
                        </td>

                        <td>
                            ${gasto.concepto}
                        </td>

                        <td>
                            ${fmtCLP(
                                gasto.monto
                            )}
                        </td>

                    </tr>

                `

            )
            .join("")

        :

        `

            <tr>

                <td
                    colspan="5"
                    class="empty"
                >
                    No existen gastos registrados.
                </td>

            </tr>

        `;

}


// ======================================================
// TAREAS DEL ERP
// ======================================================

function obtenerTareasERP() {

    const tareas =
        [];


    const materialesSinConteo =

        db.materiales.filter(

            material =>
                material.stock ===
                null

        );


    if (
        materialesSinConteo.length
    ) {

        tareas.push({

            nivel:
                "advertencia",

            titulo:
                "Inventario pendiente",

            detalle:

                materialesSinConteo.length
                +
                " material(es) todavía no tienen conteo físico.",

            vista:
                "inventario"

        });

    }


    const stockCritico =

        [

            ...db.materiales.filter(

                item =>
                    estadoStock(
                        item.stock,
                        item.stockMinimo
                    )
                    ===
                    "Crítico"

            ),

            ...db.stockPrendas.filter(

                item =>
                    estadoStock(
                        item.stock,
                        item.stockMinimo
                    )
                    ===
                    "Crítico"

            )

        ];


    if (
        stockCritico.length
    ) {

        tareas.push({

            nivel:
                "critica",

            titulo:
                "Stock crítico",

            detalle:

                stockCritico.length
                +
                " registro(s) requieren revisión.",

            vista:
                "inventario"

        });

    }


    const cotizacionesBorrador =

        db.cotizaciones.filter(

            item =>
                item.estado ===
                "Borrador"

        );


    if (
        cotizacionesBorrador.length
    ) {

        tareas.push({

            nivel:
                "info",

            titulo:
                "Cotizaciones en borrador",

            detalle:

                cotizacionesBorrador.length
                +
                " cotización(es) sin enviar.",

            vista:
                "cotizaciones"

        });

    }


    const ordenes =

        db.ordenesProduccion.filter(

            item =>
                item.estado !==
                "Finalizado"

        );


    if (
        ordenes.length
    ) {

        tareas.push({

            nivel:
                "info",

            titulo:
                "Producción en curso",

            detalle:

                ordenes.length
                +
                " orden(es) abiertas.",

            vista:
                "ordenes"

        });

    }


    const cuentasCobrar =
        totalCuentasPorCobrar();


    if (
        cuentasCobrar > 0
    ) {

        tareas.push({

            nivel:
                "advertencia",

            titulo:
                "Cuentas por cobrar",

            detalle:
                fmtCLP(
                    cuentasCobrar
                )
                +
                " pendientes de cobro.",

            vista:
                "ventas"

        });

    }


    const cuentasPagar =
        totalCuentasPorPagar();


    if (
        cuentasPagar > 0
    ) {

        tareas.push({

            nivel:
                "advertencia",

            titulo:
                "Cuentas por pagar",

            detalle:
                fmtCLP(
                    cuentasPagar
                )
                +
                " pendientes a proveedores.",

            vista:
                "compras"

        });

    }


    const fichasPendientes =

        db.productos.reduce(

            (
                total,
                producto
            ) => {

                const cantidadTallas =
                    obtenerTallasProducto(
                        producto
                    )
                    .length;


                const fichas =
                    db.fichasTecnicas.filter(

                        ficha =>
                            ficha.productoId ===
                            producto.id

                    )
                    .length;


                return total
                    +
                    Math.max(
                        0,
                        cantidadTallas -
                        fichas
                    );

            },

            0

        );


    if (
        fichasPendientes > 0
    ) {

        tareas.push({

            nivel:
                "info",

            titulo:
                "Fichas técnicas pendientes",

            detalle:

                fichasPendientes
                +
                " talla(s) todavía no tienen ficha técnica.",

            vista:
                "catalogo"

        });

    }


    return tareas;

}


// ======================================================
// DASHBOARD
// ======================================================

function renderInicio() {

    const mesActual =
        todayStr()
            .slice(
                0,
                7
            );


    const ventasRegistradas =

        db.ventas
            .filter(

                venta =>
                    String(
                        venta.fecha
                    )
                    .startsWith(
                        mesActual
                    )

            )
            .reduce(

                (
                    suma,
                    venta
                ) =>

                    suma
                    +
                    Number(
                        venta.total
                        ||
                        0
                    ),

                0

            );


    const cobradoMes =

        db.pagosVentas
            .filter(

                pago =>
                    String(
                        pago.fecha
                    )
                    .startsWith(
                        mesActual
                    )

            )
            .reduce(

                (
                    suma,
                    pago
                ) =>

                    suma
                    +
                    Number(
                        pago.monto
                        ||
                        0
                    ),

                0

            );


    const gastosMes =

        db.gastos
            .filter(

                gasto =>
                    String(
                        gasto.fecha
                    )
                    .startsWith(
                        mesActual
                    )

            )
            .reduce(

                (
                    suma,
                    gasto
                ) =>

                    suma
                    +
                    Number(
                        gasto.monto
                        ||
                        0
                    ),

                0

            );


    const pagosComprasMes =

        db.pagosCompras
            .filter(

                pago =>
                    String(
                        pago.fecha
                    )
                    .startsWith(
                        mesActual
                    )

            )
            .reduce(

                (
                    suma,
                    pago
                ) =>

                    suma
                    +
                    Number(
                        pago.monto
                        ||
                        0
                    ),

                0

            );


    const egresosCaja =
        gastosMes +
        pagosComprasMes;


    const flujo =
        cobradoMes -
        egresosCaja;


    const porCobrar =
        totalCuentasPorCobrar();


    const porPagar =
        totalCuentasPorPagar();


    const tareas =
        obtenerTareasERP();


    const cards =
        document.getElementById(
            "inicioCards"
        );


    if (
        cards
    ) {

        cards.innerHTML = `

            <div class="card">

                <span class="card-icon">↗</span>

                <div class="num">
                    ${fmtCLP(
                        ventasRegistradas
                    )}
                </div>

                <div class="lbl">
                    Ventas registradas
                </div>

            </div>


            <div class="card good">

                <span class="card-icon">✓</span>

                <div class="num">
                    ${fmtCLP(
                        cobradoMes
                    )}
                </div>

                <div class="lbl">
                    Cobrado este mes
                </div>

            </div>


            <div class="card bad">

                <span class="card-icon">↘</span>

                <div class="num">
                    ${fmtCLP(
                        egresosCaja
                    )}
                </div>

                <div class="lbl">
                    Salidas de caja
                </div>

            </div>


            <div
                class="
                card
                ${
                    flujo >= 0
                    ?
                    "good"
                    :
                    "bad"
                }
                "
            >

                <span class="card-icon">
                    $
                </span>

                <div class="num">
                    ${fmtCLP(
                        flujo
                    )}
                </div>

                <div class="lbl">
                    Flujo neto
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${fmtCLP(
                        porCobrar
                    )}
                </div>

                <div class="lbl">
                    Por cobrar
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${fmtCLP(
                        porPagar
                    )}
                </div>

                <div class="lbl">
                    Por pagar
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${tareas.length}
                </div>

                <div class="lbl">
                    Tareas pendientes
                </div>

            </div>

        `;

    }


    // ==================================================
    // ÚLTIMAS VENTAS
    // ==================================================

    const contVentas =
        document.getElementById(
            "inicioUltimasVentas"
        );


    if (
        contVentas
    ) {

        const ultimas =
            db.ventas
                .slice()
                .reverse()
                .slice(
                    0,
                    5
                );


        contVentas.innerHTML =

            ultimas.length

            ?

            ultimas
                .map(

                    venta => `

                        <div class="activity-row">

                            <div>

                                <strong>
                                    ${venta.producto}
                                </strong>

                                <span>

                                    ${venta.codigo}
                                    · talla ${venta.talla}
                                    · ${venta.cantidad} ud.

                                </span>

                            </div>

                            <div class="activity-money">

                                <strong>
                                    ${fmtCLP(
                                        venta.total
                                    )}
                                </strong>

                                <span
                                    class="
                                    pill
                                    ${claseEstadoGeneral(
                                        venta.estadoPago
                                    )}
                                    "
                                >
                                    ${venta.estadoPago}
                                </span>

                            </div>

                        </div>

                    `

                )
                .join("")

            :

            `

                <div class="empty">
                    Aún no existen ventas.
                </div>

            `;

    }


    // ==================================================
    // TAREAS
    // ==================================================

    const pendientes =
        document.getElementById(
            "inicioPendientes"
        );


    if (
        pendientes
    ) {

        pendientes.innerHTML =

            tareas.length

            ?

            tareas
                .slice(
                    0,
                    8
                )
                .map(

                    tarea => `

                        <button
                            class="
                            task-row
                            task-${tarea.nivel}
                            "
                            onclick="
                            showView(
                                '${tarea.vista}'
                            )
                            "
                        >

                            <div>

                                <strong>
                                    ${tarea.titulo}
                                </strong>

                                <span>
                                    ${tarea.detalle}
                                </span>

                            </div>

                            <b>
                                →
                            </b>

                        </button>

                    `

                )
                .join("")

            :

            `

                <div class="empty">

                    No existen tareas destacadas.

                </div>

            `;

    }


    // ==================================================
    // AUDITORÍA
    // ==================================================

    const actividad =
        document.getElementById(
            "inicioActividad"
        );


    if (
        actividad
    ) {

        actividad.innerHTML =

            db.actividad.length

            ?

            db.actividad
                .slice()
                .reverse()
                .slice(
                    0,
                    8
                )
                .map(

                    item => `

                        <div class="audit-row">

                            <div class="audit-dot"></div>

                            <div class="audit-body">

                                <div class="audit-top">

                                    <strong>
                                        ${item.modulo}
                                    </strong>

                                    <span>
                                        ${item.fecha}
                                    </span>

                                </div>

                                <p>
                                    ${item.descripcion}
                                </p>

                                <small>

                                    ${item.usuario || "Usuario"}

                                    ${
                                        item.rol
                                        ?
                                        " · " + item.rol
                                        :
                                        ""
                                    }

                                </small>

                            </div>

                        </div>

                    `

                )
                .join("")

            :

            `

                <div class="empty">
                    Sin actividad registrada.
                </div>

            `;

    }

}


// ======================================================
// RENDER GENERAL
// ======================================================

function renderAll() {

    renderInicio();

    renderCatalogo();

    renderVentas();

    renderCotizaciones();

    renderInventario();

    renderProduccion();

    renderOrdenes();

    renderCompras();

    renderGastos();

    renderFinanzas();

    renderNotificaciones();

    renderReportes();

    cargarConfiguracion();

    aplicarPermisosUI();

    aplicarBusqueda();

}


// ======================================================
// INICIAR
// ======================================================

cargarUsuario();

aplicarPermisosUI();

cargarSelectProduccion();

renderAll();

showView(
    "inicio"
);