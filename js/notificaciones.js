// ======================================================
// PATYCA ERP V6 - CENTRO DE NOTIFICACIONES
// ======================================================

function generarNotificaciones() {

    const lista =
        [];


    // ==================================================
    // STOCK MATERIALES
    // ==================================================

    db.materiales.forEach(

        material => {

            const estado =
                estadoStock(

                    material.stock,

                    material.stockMinimo

                );


            if (
                estado ===
                "Sin conteo"
            ) {

                lista.push({

                    id:
                        "MAT-CONTEO-"
                        +
                        material.codigo,

                    nivel:
                        "info",

                    titulo:
                        "Conteo físico pendiente",

                    mensaje:

                        material.detalle
                        +
                        " todavía no tiene stock físico registrado.",

                    vista:
                        "inventario"

                });

            }


            if (
                estado ===
                "Crítico"
            ) {

                lista.push({

                    id:
                        "MAT-CRITICO-"
                        +
                        material.codigo,

                    nivel:
                        "critica",

                    titulo:
                        "Material en stock crítico",

                    mensaje:

                        material.detalle
                        +
                        " tiene "
                        +
                        material.stock
                        +
                        " "
                        +
                        material.unidad
                        +
                        ".",

                    vista:
                        "inventario"

                });

            }


            if (
                estado ===
                "Próximo al mínimo"
            ) {

                lista.push({

                    id:
                        "MAT-PREV-"
                        +
                        material.codigo,

                    nivel:
                        "advertencia",

                    titulo:
                        "Material próximo al mínimo",

                    mensaje:

                        material.detalle
                        +
                        " requiere seguimiento.",

                    vista:
                        "inventario"

                });

            }

        }

    );


    // ==================================================
    // PRENDAS
    // ==================================================

    db.stockPrendas.forEach(

        stock => {

            const estado =
                estadoStock(

                    stock.stock,

                    stock.stockMinimo

                );


            if (
                estado !==
                "Crítico"

                &&

                estado !==
                "Próximo al mínimo"
            ) {

                return;

            }


            const producto =
                db.productos.find(

                    item =>
                        item.id ===
                        stock.productoId

                );


            lista.push({

                id:
                    "PRENDA-"
                    +
                    stock.id
                    +
                    "-"
                    +
                    estado,

                nivel:

                    estado ===
                    "Crítico"

                    ?

                    "critica"

                    :

                    "advertencia",

                titulo:
                    estado,

                mensaje:

                    (
                        producto?.nombre
                        ||
                        "Prenda"
                    )

                    +
                    " talla "
                    +
                    stock.talla
                    +
                    ": "
                    +
                    stock.stock
                    +
                    " unidad(es).",

                vista:
                    "inventario"

            });

        }

    );


    // ==================================================
    // FICHAS TÉCNICAS
    // ==================================================

    db.productos.forEach(

        producto => {

            const tallas =
                obtenerTallasProducto(
                    producto
                );


            const faltantes =
                tallas.filter(

                    talla =>

                        !buscarFichaTecnica(

                            producto.id,

                            talla

                        )

                );


            if (
                faltantes.length
            ) {

                lista.push({

                    id:
                        "FT-"
                        +
                        producto.id,

                    nivel:
                        "info",

                    titulo:
                        "Ficha técnica incompleta",

                    mensaje:

                        producto.nombre
                        +
                        " tiene "
                        +
                        faltantes.length
                        +
                        " talla(s) sin ficha técnica.",

                    vista:
                        "catalogo"

                });

            }

        }

    );


    // ==================================================
    // CUENTAS POR COBRAR
    // ==================================================

    db.ventas
        .filter(

            venta =>
                Number(
                    venta.saldoPendiente
                    ||
                    0
                )
                >
                0

        )
        .forEach(

            venta => {

                lista.push({

                    id:
                        "COBRAR-"
                        +
                        venta.id,

                    nivel:
                        "advertencia",

                    titulo:
                        "Venta pendiente de cobro",

                    mensaje:

                        venta.codigo
                        +
                        " mantiene un saldo de "
                        +
                        fmtCLP(
                            venta.saldoPendiente
                        )
                        +
                        ".",

                    vista:
                        "ventas"

                });

            }

        );


    // ==================================================
    // CUENTAS POR PAGAR / VENCIMIENTO
    // ==================================================

    const hoy =
        new Date(
            todayStr()
            +
            "T00:00:00"
        );


    db.compras
        .filter(

            compra =>
                Number(
                    compra.saldoPendiente
                    ||
                    0
                )
                >
                0

        )
        .forEach(

            compra => {

                let nivel =
                    "advertencia";


                let titulo =
                    "Compra pendiente de pago";


                let extra =
                    "";


                if (
                    compra.vencimiento
                ) {

                    const vencimiento =
                        new Date(

                            compra.vencimiento
                            +
                            "T00:00:00"

                        );


                    const dias =
                        Math.ceil(

                            (
                                vencimiento
                                -
                                hoy
                            )

                            /

                            86400000

                        );


                    if (
                        dias < 0
                    ) {

                        nivel =
                            "critica";


                        titulo =
                            "Pago vencido";


                        extra =

                            " Venció hace "
                            +
                            Math.abs(
                                dias
                            )
                            +
                            " día(s).";

                    }

                    else if (
                        dias <=
                        Number(
                            db.configuracion
                                .diasAvisoVencimiento
                            ||
                            5
                        )
                    ) {

                        extra =

                            " Vence en "
                            +
                            dias
                            +
                            " día(s).";

                    }

                }


                lista.push({

                    id:
                        "PAGAR-"
                        +
                        compra.id,

                    nivel:
                        nivel,

                    titulo:
                        titulo,

                    mensaje:

                        compra.codigo
                        +
                        " · "
                        +
                        compra.proveedor
                        +
                        " · saldo "
                        +
                        fmtCLP(
                            compra.saldoPendiente
                        )
                        +
                        "."
                        +
                        extra,

                    vista:
                        "compras"

                });

            }

        );


    // ==================================================
    // COTIZACIONES
    // ==================================================

    db.cotizaciones
        .filter(

            item =>
                item.estado ===
                "Borrador"

        )
        .forEach(

            cotizacion => {

                lista.push({

                    id:
                        "COT-BORRADOR-"
                        +
                        cotizacion.id,

                    nivel:
                        "info",

                    titulo:
                        "Cotización en borrador",

                    mensaje:

                        cotizacion.codigo
                        +
                        " todavía no ha sido enviada.",

                    vista:
                        "cotizaciones"

                });

            }

        );


    // ==================================================
    // ÓRDENES
    // ==================================================

    db.ordenesProduccion
        .filter(

            orden =>
                orden.estado !==
                "Finalizado"

        )
        .forEach(

            orden => {

                lista.push({

                    id:
                        "OP-"
                        +
                        orden.id,

                    nivel:
                        "info",

                    titulo:
                        "Orden de producción abierta",

                    mensaje:

                        orden.codigo
                        +
                        " · "
                        +
                        orden.producto
                        +
                        " · "
                        +
                        orden.estado
                        +
                        ".",

                    vista:
                        "ordenes"

                });

            }

        );


    return lista;

}


// ======================================================
// ABRIR NOTIFICACIÓN
// ======================================================

function abrirNotificacion(
    id
) {

    const notificacion =
        generarNotificaciones()
            .find(

                item =>
                    item.id ===
                    id

            );


    if (
        !notificacion
    ) {

        return;

    }


    marcarNotificacionLeida(
        id,
        false
    );


    showView(
        notificacion.vista
    );

}


// ======================================================
// MARCAR LEÍDA
// ======================================================

function marcarNotificacionLeida(
    id,
    rerender = true
) {

    if (
        !db.notificacionesLeidas.includes(
            id
        )
    ) {

        db.notificacionesLeidas.push(
            id
        );

    }


    persist();


    if (
        rerender
    ) {

        renderNotificaciones();

    }

}


// ======================================================
// MARCAR TODAS
// ======================================================

function marcarTodasNotificaciones() {

    generarNotificaciones()
        .forEach(

            item => {

                if (
                    !db.notificacionesLeidas.includes(
                        item.id
                    )
                ) {

                    db.notificacionesLeidas.push(
                        item.id
                    );

                }

            }

        );


    persist();

    renderNotificaciones();

}


// ======================================================
// RENDER
// ======================================================

function renderNotificaciones() {

    const lista =
        generarNotificaciones();


    const pendientes =
        lista.filter(

            item =>

                !db.notificacionesLeidas.includes(
                    item.id
                )

        );


    const contador =
        document.getElementById(
            "notificationCount"
        );


    if (
        contador
    ) {

        contador.textContent =
            pendientes.length;


        contador.style.display =

            pendientes.length > 0

            ?

            ""

            :

            "none";

    }


    const resumen =
        document.getElementById(
            "notificationSummary"
        );


    if (
        resumen
    ) {

        const criticas =
            lista.filter(
                item =>
                    item.nivel ===
                    "critica"
            )
            .length;


        const advertencias =
            lista.filter(
                item =>
                    item.nivel ===
                    "advertencia"
            )
            .length;


        const info =
            lista.filter(
                item =>
                    item.nivel ===
                    "info"
            )
            .length;


        resumen.innerHTML = `

            <div class="card bad">

                <div class="num">
                    ${criticas}
                </div>

                <div class="lbl">
                    Críticas
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${advertencias}
                </div>

                <div class="lbl">
                    Advertencias
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${info}
                </div>

                <div class="lbl">
                    Informativas
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${pendientes.length}
                </div>

                <div class="lbl">
                    Sin revisar
                </div>

            </div>

        `;

    }


    const contenedor =
        document.getElementById(
            "notificacionesLista"
        );


    if (
        !contenedor
    ) {

        return;

    }


    contenedor.innerHTML = `

        <div class="notification-toolbar">

            <strong>
                ${lista.length}
                alerta(s) activas
            </strong>

            <button
                class="btn btn-small"
                onclick="
                marcarTodasNotificaciones()
                "
            >
                Marcar todas revisadas
            </button>

        </div>


        ${
            lista.length

            ?

            lista
                .map(

                    item => {

                        const leida =
                            db.notificacionesLeidas.includes(
                                item.id
                            );


                        return `

                            <div
                                class="
                                notification-item
                                ${item.nivel}
                                ${
                                    leida
                                    ?
                                    "leida"
                                    :
                                    ""
                                }
                                "
                            >

                                <div class="notification-icon">

                                    ${
                                        item.nivel ===
                                        "critica"

                                        ?

                                        "!"

                                        :

                                        item.nivel ===
                                        "advertencia"

                                        ?

                                        "△"

                                        :

                                        "i"
                                    }

                                </div>


                                <div class="notification-content">

                                    <strong>
                                        ${item.titulo}
                                    </strong>

                                    <p>
                                        ${item.mensaje}
                                    </p>

                                </div>


                                <div class="notification-actions">

                                    <button
                                        class="
                                        btn
                                        btn-small
                                        "
                                        onclick="
                                        abrirNotificacion(
                                            '${item.id}'
                                        )
                                        "
                                    >
                                        Revisar
                                    </button>

                                    ${
                                        leida

                                        ?

                                        `
                                        <span class="pill pill-gray">
                                            Revisada
                                        </span>
                                        `

                                        :

                                        `
                                        <button
                                            class="
                                            btn
                                            btn-small
                                            "
                                            onclick="
                                            marcarNotificacionLeida(
                                                '${item.id}'
                                            )
                                            "
                                        >
                                            Marcar revisada
                                        </button>
                                        `
                                    }

                                </div>

                            </div>

                        `;

                    }

                )
                .join("")

            :

            `

                <div class="empty">

                    No existen alertas activas.

                </div>

            `
        }

    `;

}


// ======================================================
// ABRIR CENTRO
// ======================================================

function abrirNotificaciones() {

    showView(
        "notificaciones"
    );

}