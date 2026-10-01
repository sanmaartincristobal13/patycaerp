// ======================================================
// PATYCA ERP V6 - UI / NAVEGACIÓN / PERMISOS
// ======================================================

const VISTAS = {

    inicio:
        "Dashboard",

    catalogo:
        "Comercial / Catálogo",

    ventas:
        "Comercial / Ventas",

    cotizaciones:
        "Comercial / Cotizaciones",

    inventario:
        "Inventario / Existencias",

    ordenes:
        "Producción / Órdenes",

    produccion:
        "Producción / Rendimiento y merma",

    compras:
        "Abastecimiento / Compras",

    finanzas:
        "Finanzas / Dashboard",

    reportes:
        "Analítica / Reportes",

    notificaciones:
        "Sistema / Notificaciones",

    configuracion:
        "Sistema / Configuración"

};


// ======================================================
// MAPA VISTA → PERMISO
// ======================================================

const PERMISO_VISTA = {

    inicio:
        "dashboard",

    catalogo:
        "catalogo",

    ventas:
        "ventas",

    cotizaciones:
        "cotizaciones",

    inventario:
        "inventario",

    ordenes:
        "produccion",

    produccion:
        "produccion",

    compras:
        "compras",

    finanzas:
        "finanzas",

    reportes:
        "reportes",

    notificaciones:
        "dashboard",

    configuracion:
        "configuracion"

};


// ======================================================
// PERMISOS
// ======================================================

function rolActivo() {

    return usuarioActivo?.rol
        ||
        "Administradora";

}


function permisosUsuario() {

    const rol =
        rolActivo();


    return (

        db?.roles?.[
            rol
        ]

        ||

        db?.roles?.Administradora

        ||

        {}

    );

}


function tienePermiso(
    permiso
) {

    const permisos =
        permisosUsuario();


    return Boolean(
        permisos?.[
            permiso
        ]
    );

}


function tienePermisoVista(
    vista
) {

    const permiso =
        PERMISO_VISTA[
            vista
        ];


    if (
        !permiso
    ) {

        return true;

    }


    return tienePermiso(
        permiso
    );

}


// ======================================================
// APLICAR PERMISOS VISUALES
// ======================================================

function aplicarPermisosUI() {

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(

            boton => {

                const vista =
                    boton.dataset.view;


                boton.style.display =

                    tienePermisoVista(
                        vista
                    )

                    ?

                    ""

                    :

                    "none";

            }

        );


    // Ocultar grupos vacíos

    document
        .querySelectorAll(
            ".nav-group"
        )
        .forEach(

            grupo => {

                const botonesVisibles =

                    Array
                        .from(
                            grupo.querySelectorAll(
                                "[data-view]"
                            )
                        )
                        .some(

                            boton =>
                                boton.style.display !==
                                "none"

                        );


                grupo.style.display =

                    botonesVisibles

                    ?

                    ""

                    :

                    "none";

            }

        );


    // Botón + Nuevo según permisos

    const quick =
        document.getElementById(
            "quickActionWrapper"
        );


    if (
        quick
    ) {

        const puedeCrearAlgo =

            tienePermiso(
                "ventas"
            )

            ||

            tienePermiso(
                "cotizaciones"
            )

            ||

            tienePermiso(
                "compras"
            )

            ||

            tienePermiso(
                "inventario"
            )

            ||

            tienePermiso(
                "produccion"
            )

            ||

            tienePermiso(
                "finanzas"
            );


        quick.style.display =

            puedeCrearAlgo
            ?
            ""
            :
            "none";

    }

}


// ======================================================
// CAMBIAR VISTA
// ======================================================

function showView(
    nombre
) {

    if (
        !tienePermisoVista(
            nombre
        )
    ) {

        alert(
            "Tu usuario no tiene permiso para acceder a este módulo."
        );

        return;

    }


    Object
        .keys(
            VISTAS
        )
        .forEach(

            vista => {

                const seccion =
                    document.getElementById(
                        "view-" +
                        vista
                    );


                if (
                    seccion
                ) {

                    seccion.style.display =

                        vista ===
                        nombre

                        ?

                        ""

                        :

                        "none";

                }

            }

        );


    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(

            boton => {

                boton.classList.toggle(

                    "active",

                    boton.dataset.view ===
                    nombre

                );

            }

        );


    const breadcrumb =
        document.getElementById(
            "breadcrumb"
        );


    if (
        breadcrumb
    ) {

        breadcrumb.textContent =
            VISTAS[
                nombre
            ]
            ||
            nombre;

    }


    document
        .getElementById(
            "sidebar"
        )
        ?.classList
        .remove(
            "open"
        );


    aplicarBusqueda();

}


// ======================================================
// NAVEGACIÓN
// ======================================================

document
    .getElementById(
        "nav"
    )
    ?.addEventListener(

        "click",

        event => {

            const boton =
                event.target.closest(
                    "[data-view]"
                );


            if (
                !boton
            ) {

                return;

            }


            showView(
                boton.dataset.view
            );

        }

    );


// ======================================================
// SIDEBAR MÓVIL
// ======================================================

document
    .getElementById(
        "menuBtn"
    )
    ?.addEventListener(

        "click",

        () => {

            document
                .getElementById(
                    "sidebar"
                )
                ?.classList
                .toggle(
                    "open"
                );

        }

    );


// ======================================================
// GRUPOS
// ======================================================

function toggleNavGroup(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList
        .toggle(
            "collapsed"
        );

}


// ======================================================
// MODALES
// ======================================================

function openModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList
        .add(
            "open"
        );


    document.body
        .classList
        .add(
            "modal-open"
        );

}


function closeModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList
        .remove(
            "open"
        );


    const hayOtroModal =

        document
            .querySelector(
                ".modal-overlay.open"
            );


    if (
        !hayOtroModal
    ) {

        document.body
            .classList
            .remove(
                "modal-open"
            );

    }

}


document.addEventListener(

    "click",

    event => {

        const overlay =
            event.target.closest(
                ".modal-overlay"
            );


        if (
            overlay
            &&
            event.target ===
            overlay
        ) {

            overlay.classList.remove(
                "open"
            );


            document.body
                .classList
                .remove(
                    "modal-open"
                );

        }

    }

);


document.addEventListener(

    "keydown",

    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        const abiertos =

            document
                .querySelectorAll(
                    ".modal-overlay.open"
                );


        abiertos.forEach(

            modal =>
                modal.classList.remove(
                    "open"
                )

        );


        document.body
            .classList
            .remove(
                "modal-open"
            );

    }

);


// ======================================================
// BUSCADOR GLOBAL
// ======================================================

function aplicarBusqueda() {

    const texto =

        document
            .getElementById(
                "globalSearch"
            )
            ?.value
            .trim()
            .toLowerCase()

        ||

        "";


    document
        .querySelectorAll(
            "[data-searchable]"
        )
        .forEach(

            elemento => {

                if (
                    !texto
                ) {

                    elemento.style.display =
                        "";

                    return;

                }


                const contenido =

                    elemento
                        .textContent
                        .toLowerCase();


                elemento.style.display =

                    contenido.includes(
                        texto
                    )

                    ?

                    ""

                    :

                    "none";

            }

        );

}


document
    .getElementById(
        "globalSearch"
    )
    ?.addEventListener(

        "input",

        aplicarBusqueda

    );


// ======================================================
// MENÚ + NUEVO
// ======================================================

function toggleQuickMenu() {

    document
        .getElementById(
            "quickMenu"
        )
        ?.classList
        .toggle(
            "open"
        );

}


document.addEventListener(

    "click",

    event => {

        const wrapper =
            document.getElementById(
                "quickActionWrapper"
            );


        if (
            wrapper
            &&
            !wrapper.contains(
                event.target
            )
        ) {

            document
                .getElementById(
                    "quickMenu"
                )
                ?.classList
                .remove(
                    "open"
                );

        }

    }

);


// ======================================================
// ACCIONES RÁPIDAS
// ======================================================

function ejecutarAccionRapida(
    tipo
) {

    document
        .getElementById(
            "quickMenu"
        )
        ?.classList
        .remove(
            "open"
        );


    const acciones = {

        venta: {

            permiso:
                "ventas",

            accion:
                () =>
                    openVentaModal()

        },


        cotizacion: {

            permiso:
                "cotizaciones",

            accion:
                () => {

                    showView(
                        "cotizaciones"
                    );

                    openCotizacionModal();

                }

        },


        compra: {

            permiso:
                "compras",

            accion:
                () =>
                    openCompraModal()

        },


        gasto: {

            permiso:
                "finanzas",

            accion:
                () =>
                    openGastoModal()

        },


        material: {

            permiso:
                "inventario",

            accion:
                () =>
                    openMaterialModal()

        },


        stock: {

            permiso:
                "inventario",

            accion:
                () =>
                    openStockModal()

        },


        orden: {

            permiso:
                "produccion",

            accion:
                () => {

                    showView(
                        "ordenes"
                    );

                    openOrdenModal();

                }

        }

    };


    const seleccion =
        acciones[
            tipo
        ];


    if (
        !seleccion
    ) {

        return;

    }


    if (
        !tienePermiso(
            seleccion.permiso
        )
    ) {

        alert(
            "Tu usuario no tiene permiso para realizar esta acción."
        );

        return;

    }


    seleccion.accion();

}


// ======================================================
// ESTADOS VISUALES GENERALES
// ======================================================

function claseEstadoGeneral(
    estado
) {

    const texto =
        String(
            estado
            ||
            ""
        )
        .toLowerCase();


    if (
        [
            "pagada",
            "finalizado",
            "aceptada",
            "normal"
        ]
        .includes(
            texto
        )
    ) {

        return "pill-green";

    }


    if (
        [
            "parcial",
            "pendiente",
            "enviada",
            "próximo al mínimo",
            "corte",
            "confección",
            "terminación"
        ]
        .includes(
            texto
        )
    ) {

        return "pill-yellow";

    }


    if (
        [
            "crítico",
            "rechazada",
            "vencida"
        ]
        .includes(
            texto
        )
    ) {

        return "pill-red";

    }


    return "pill-gray";

}