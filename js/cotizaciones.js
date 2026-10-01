// ======================================================
// PATYCA ERP V6 - COTIZACIONES PROFESIONALES
// ======================================================

let detalleCotizacionActual = [];


// ======================================================
// PREPARAR
// ======================================================

function prepararCotizaciones() {

    if (
        !Array.isArray(
            db.cotizaciones
        )
    ) {

        db.cotizaciones = [];

    }

}


// ======================================================
// ABRIR MODAL
// ======================================================

function openCotizacionModal() {

    prepararCotizaciones();


    detalleCotizacionActual = [];


    document
        .getElementById(
            "cot_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "cot_referencia"
        )
        .value =
        "";


    document
        .getElementById(
            "cot_descuento"
        )
        .value =
        0;


    document
        .getElementById(
            "cot_observacion"
        )
        .value =
        "";


    cargarProductosCotizacion();

    renderDetalleCotizacion();

    openModal(
        "modalCotizacion"
    );

}


// ======================================================
// PRODUCTOS
// ======================================================

function cargarProductosCotizacion() {

    const select =
        document.getElementById(
            "cot_producto"
        );


    if (!select) {
        return;
    }


    select.innerHTML =
        db.productos
            .map(

                producto => `

                    <option
                        value="${producto.id}"
                    >

                        ${producto.establecimiento}
                        ·
                        ${producto.nombre}

                    </option>

                `

            )
            .join("");


    cargarTallasCotizacion();

}


// ======================================================
// TALLAS INDIVIDUALES
// ======================================================

function cargarTallasCotizacion() {

    const producto =
        db.productos.find(

            item =>
                item.id ===
                document
                    .getElementById(
                        "cot_producto"
                    )
                    ?.value

        );


    const select =
        document.getElementById(
            "cot_talla"
        );


    if (
        !producto
        ||
        !select
    ) {
        return;
    }


    select.innerHTML =
        obtenerTallasProducto(
            producto
        )
        .map(

            talla => `

                <option
                    value="${talla}"
                >

                    ${talla}
                    ·
                    ${fmtCLP(
                        precioParaTalla(
                            producto,
                            talla
                        )
                    )}

                </option>

            `

        )
        .join("");


    actualizarPrecioCotizacion();

}


// ======================================================
// PRECIO
// ======================================================

function actualizarPrecioCotizacion() {

    const producto =
        db.productos.find(

            item =>
                item.id ===
                document
                    .getElementById(
                        "cot_producto"
                    )
                    ?.value

        );


    const talla =
        document
            .getElementById(
                "cot_talla"
            )
            ?.value;


    if (
        !producto
    ) {
        return;
    }


    document
        .getElementById(
            "cot_precio"
        )
        .value =
        precioParaTalla(

            producto,

            talla

        );

}


// ======================================================
// EVENTOS
// ======================================================

document
    .getElementById(
        "cot_producto"
    )
    ?.addEventListener(

        "change",

        cargarTallasCotizacion

    );


document
    .getElementById(
        "cot_talla"
    )
    ?.addEventListener(

        "change",

        actualizarPrecioCotizacion

    );


document
    .getElementById(
        "cot_descuento"
    )
    ?.addEventListener(

        "input",

        renderDetalleCotizacion

    );


// ======================================================
// AGREGAR ITEM
// ======================================================

function agregarItemCotizacion() {

    const productoId =
        document
            .getElementById(
                "cot_producto"
            )
            .value;


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const talla =
        document
            .getElementById(
                "cot_talla"
            )
            .value;


    const cantidad =
        Number(
            document
                .getElementById(
                    "cot_cantidad"
                )
                .value
        );


    const precio =
        Number(
            document
                .getElementById(
                    "cot_precio"
                )
                .value
        );


    if (
        !producto
        ||
        !talla
        ||
        cantidad <= 0
        ||
        precio < 0
    ) {

        alert(
            "Revisa producto, talla, cantidad y precio."
        );

        return;

    }


    const existente =
        detalleCotizacionActual.find(

            item =>

                item.productoId ===
                producto.id

                &&

                item.talla ===
                talla

                &&

                Number(
                    item.precioUnitario
                )
                ===
                precio

        );


    if (
        existente
    ) {

        existente.cantidad +=
            cantidad;


        existente.total =

            existente.cantidad *
            existente.precioUnitario;

    }

    else {

        detalleCotizacionActual.push({

            id:
                Date.now() +
                Math.random(),

            productoId:
                producto.id,

            establecimiento:
                producto.establecimiento,

            producto:
                producto.nombre,

            talla:
                talla,

            cantidad:
                cantidad,

            precioUnitario:
                precio,

            total:
                cantidad *
                precio

        });

    }


    document
        .getElementById(
            "cot_cantidad"
        )
        .value =
        1;


    renderDetalleCotizacion();

}


// ======================================================
// ELIMINAR ITEM
// ======================================================

function eliminarItemCotizacion(
    id
) {

    detalleCotizacionActual =
        detalleCotizacionActual.filter(

            item =>
                item.id !==
                id

        );


    renderDetalleCotizacion();

}


// ======================================================
// TOTALES
// ======================================================

function calcularTotalesCotizacion() {

    const subtotal =
        detalleCotizacionActual.reduce(

            (
                suma,
                item
            ) =>

                suma +
                Number(
                    item.total
                ),

            0

        );


    const descuento =
        Number(
            document
                .getElementById(
                    "cot_descuento"
                )
                ?.value
            ||
            0
        );


    return {

        subtotal:
            subtotal,

        descuento:
            descuento,

        total:
            Math.max(
                0,
                subtotal -
                descuento
            )

    };

}


// ======================================================
// RENDER TEMPORAL
// ======================================================

function renderDetalleCotizacion() {

    const tbody =
        document.getElementById(
            "cot_detalle"
        );


    const resumen =
        document.getElementById(
            "cot_resumen"
        );


    if (
        !tbody
        ||
        !resumen
    ) {
        return;
    }


    tbody.innerHTML =

        detalleCotizacionActual.length

        ?

        detalleCotizacionActual
            .map(

                item => `

                    <tr>

                        <td>
                            ${item.producto}
                        </td>

                        <td>
                            ${item.talla}
                        </td>

                        <td>
                            ${item.cantidad}
                        </td>

                        <td>
                            ${fmtCLP(
                                item.precioUnitario
                            )}
                        </td>

                        <td>
                            ${fmtCLP(
                                item.total
                            )}
                        </td>

                        <td>

                            <button
                                class="
                                btn
                                btn-small
                                btn-danger
                                "
                                onclick="
                                eliminarItemCotizacion(
                                    ${item.id}
                                )
                                "
                            >
                                Quitar
                            </button>

                        </td>

                    </tr>

                `

            )
            .join("")

        :

        `

            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    Agrega productos a la cotización.
                </td>
            </tr>

        `;


    const totales =
        calcularTotalesCotizacion();


    resumen.innerHTML = `

        <div class="definition-list">

            <div>
                <span>Subtotal</span>
                <strong>
                    ${fmtCLP(
                        totales.subtotal
                    )}
                </strong>
            </div>

            <div>
                <span>Descuento</span>
                <strong>
                    ${fmtCLP(
                        totales.descuento
                    )}
                </strong>
            </div>

            <div>
                <span>Total</span>
                <strong>
                    ${fmtCLP(
                        totales.total
                    )}
                </strong>
            </div>

        </div>

    `;

}


// ======================================================
// GUARDAR
// ======================================================

function saveCotizacion() {

    if (
        !detalleCotizacionActual.length
    ) {

        alert(
            "Agrega al menos una prenda."
        );

        return;

    }


    const referencia =
        document
            .getElementById(
                "cot_referencia"
            )
            .value
            .trim();


    if (
        !referencia
    ) {

        alert(
            "Ingresa una referencia."
        );

        return;

    }


    const totales =
        calcularTotalesCotizacion();


    const cotizacion = {

        id:
            Date.now() +
            Math.random(),

        codigo:
            nextHumanCode(
                "COT",
                db.cotizaciones
            ),

        fecha:
            document
                .getElementById(
                    "cot_fecha"
                )
                .value,

        referencia:
            referencia,

        items:
            detalleCotizacionActual.map(

                item => ({
                    ...item
                })

            ),

        subtotal:
            totales.subtotal,

        descuento:
            totales.descuento,

        total:
            totales.total,

        estado:
            "Borrador",

        observacion:
            document
                .getElementById(
                    "cot_observacion"
                )
                .value
                .trim(),

        ventaGenerada:
            null,

        fechaAceptacion:
            null

    };


    db.cotizaciones.push(
        cotizacion
    );


    registrarActividad(

        "Cotizaciones",

        "Creada "
        +
        cotizacion.codigo
        +
        " · "
        +
        referencia
        +
        " · "
        +
        fmtCLP(
            cotizacion.total
        )

    );


    persist();

    closeModal(
        "modalCotizacion"
    );

    renderAll();

}


// ======================================================
// ESTADO
// ======================================================

function cambiarEstadoCotizacion(
    id,
    nuevoEstado
) {

    const cotizacion =
        db.cotizaciones.find(

            item =>
                item.id ===
                id

        );


    if (!cotizacion) {
        return;
    }


    if (
        cotizacion.ventaGenerada
    ) {

        alert(
            "Esta cotización ya fue convertida en venta y queda bloqueada."
        );

        renderAll();

        return;

    }


    const anterior =
        cotizacion.estado;


    cotizacion.estado =
        nuevoEstado;


    if (
        nuevoEstado ===
        "Aceptada"
    ) {

        cotizacion.fechaAceptacion =
            todayStr();

    }


    registrarActividad(

        "Cotizaciones",

        cotizacion.codigo
        +
        ": "
        +
        anterior
        +
        " → "
        +
        nuevoEstado

    );


    persist();

    renderAll();

}


// ======================================================
// VALIDAR STOCK
// ======================================================

function validarStockCotizacion(
    cotizacion
) {

    const problemas =
        [];


    cotizacion.items.forEach(

        item => {

            const stock =
                db.stockPrendas.find(

                    registro =>

                        registro.productoId ===
                        item.productoId

                        &&

                        String(
                            registro.talla
                        )
                        ===
                        String(
                            item.talla
                        )

                );


            if (
                !stock
            ) {

                problemas.push(

                    item.producto
                    +
                    " talla "
                    +
                    item.talla
                    +
                    ": sin conteo de stock"

                );

                return;

            }


            if (
                Number(
                    stock.stock
                )
                <
                Number(
                    item.cantidad
                )
            ) {

                problemas.push(

                    item.producto
                    +
                    " talla "
                    +
                    item.talla
                    +
                    ": disponibles "
                    +
                    stock.stock
                    +
                    ", solicitadas "
                    +
                    item.cantidad

                );

            }

        }

    );


    return problemas;

}


// ======================================================
// CONVERTIR A VENTAS
// ======================================================

function convertirCotizacionAVenta(
    id
) {

    const cotizacion =
        db.cotizaciones.find(

            item =>
                item.id ===
                id

        );


    if (
        !cotizacion
    ) {
        return;
    }


    if (
        cotizacion.estado !==
        "Aceptada"
    ) {

        alert(
            "La cotización debe estar Aceptada."
        );

        return;

    }


    if (
        cotizacion.ventaGenerada
    ) {

        alert(
            "Esta cotización ya fue convertida."
        );

        return;

    }


    const problemas =
        validarStockCotizacion(
            cotizacion
        );


    if (
        problemas.length
    ) {

        alert(

            "Stock insuficiente:\n\n"
            +
            problemas.join(
                "\n"
            )

        );

        return;

    }


    if (
        !confirm(

            "¿Convertir "
            +
            cotizacion.codigo
            +
            " en venta?\n\n"
            +
            "Las ventas quedarán inicialmente Pendientes de pago y se descontará el inventario."

        )
    ) {

        return;

    }


    const ventasGeneradas =
        [];


    cotizacion.items.forEach(

        (
            item,
            indice
        ) => {

            const stock =
                db.stockPrendas.find(

                    registro =>

                        registro.productoId ===
                        item.productoId

                        &&

                        String(
                            registro.talla
                        )
                        ===
                        String(
                            item.talla
                        )

                );


            const anterior =
                Number(
                    stock.stock
                );


            stock.stock =
                anterior -
                Number(
                    item.cantidad
                );


            const descuentoProporcional =

                cotizacion.subtotal > 0

                ?

                cotizacion.descuento *
                (
                    item.total /
                    cotizacion.subtotal
                )

                :

                0;


            const total =
                Math.max(

                    0,

                    item.total -
                    descuentoProporcional

                );


            const venta = {

                id:
                    Date.now()
                    +
                    indice
                    +
                    Math.random(),

                codigo:
                    nextHumanCode(
                        "V",
                        db.ventas
                    ),

                fecha:
                    todayStr(),

                productoId:
                    item.productoId,

                establecimiento:
                    item.establecimiento,

                producto:
                    item.producto,

                talla:
                    item.talla,

                cantidad:
                    item.cantidad,

                precioUnitario:
                    item.precioUnitario,

                subtotal:
                    item.total,

                descuento:
                    descuentoProporcional,

                total:
                    total,

                montoPagado:
                    0,

                saldoPendiente:
                    total,

                estadoPago:
                    "Pendiente",

                medioPago:
                    "Pendiente",

                origen:
                    cotizacion.codigo,

                observacion:
                    "Generada desde "
                    +
                    cotizacion.codigo

            };


            db.ventas.push(
                venta
            );


            ventasGeneradas.push(
                venta.codigo
            );


            registrarMovimientoInventario({

                tipo:
                    "Salida por venta",

                categoria:
                    "Prenda terminada",

                referencia:
                    venta.codigo,

                itemCodigo:
                    item.productoId,

                itemNombre:

                    item.producto
                    +
                    " · Talla "
                    +
                    item.talla,

                cantidad:
                    -Number(
                        item.cantidad
                    ),

                unidad:
                    "unidades",

                stockAnterior:
                    anterior,

                stockNuevo:
                    stock.stock

            });

        }

    );


    cotizacion.ventaGenerada =
        ventasGeneradas;


    registrarActividad(

        "Cotizaciones",

        cotizacion.codigo
        +
        " convertida en venta"

    );


    persist();

    renderAll();


    alert(
        "Cotización convertida correctamente."
    );

}


// ======================================================
// DETALLE
// ======================================================

function verCotizacion(
    id
) {

    const cotizacion =
        db.cotizaciones.find(

            item =>
                item.id ===
                id

        );


    if (!cotizacion) {
        return;
    }


    const filas =
        cotizacion.items
            .map(

                item => `

                    <tr>

                        <td>
                            ${item.establecimiento}
                        </td>

                        <td>
                            ${item.producto}
                        </td>

                        <td>
                            ${item.talla}
                        </td>

                        <td>
                            ${item.cantidad}
                        </td>

                        <td>
                            ${fmtCLP(
                                item.precioUnitario
                            )}
                        </td>

                        <td>
                            ${fmtCLP(
                                item.total
                            )}
                        </td>

                    </tr>

                `

            )
            .join("");


    document
        .getElementById(
            "cotizacionDetailContent"
        )
        .innerHTML = `

            <div class="page-head">

                <div>

                    <span class="eyebrow">
                        ${cotizacion.codigo}
                    </span>

                    <h2>
                        ${cotizacion.referencia}
                    </h2>

                    <p>
                        ${cotizacion.fecha}
                        ·
                        ${cotizacion.estado}
                    </p>

                </div>


                <button
                    class="btn btn-primary"
                    onclick="
                    imprimirCotizacion(
                        ${cotizacion.id}
                    )
                    "
                >
                    Imprimir / PDF
                </button>

            </div>


            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>
                            <th>Línea</th>
                            <th>Producto</th>
                            <th>Talla</th>
                            <th>Cantidad</th>
                            <th>Unitario</th>
                            <th>Total</th>
                        </tr>

                    </thead>

                    <tbody>
                        ${filas}
                    </tbody>

                </table>

            </div>


            <div
                class="panel compact"
                style="
                margin-top:16px;
                max-width:420px;
                margin-left:auto;
                "
            >

                <div class="definition-list">

                    <div>
                        <span>Subtotal</span>
                        <strong>
                            ${fmtCLP(
                                cotizacion.subtotal
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Descuento</span>
                        <strong>
                            ${fmtCLP(
                                cotizacion.descuento
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Total</span>
                        <strong>
                            ${fmtCLP(
                                cotizacion.total
                            )}
                        </strong>
                    </div>

                </div>

            </div>

        `;


    openModal(
        "modalCotizacionDetail"
    );

}


// ======================================================
// IMPRIMIR
// ======================================================

function imprimirCotizacion(
    id
) {

    const cotizacion =
        db.cotizaciones.find(

            item =>
                item.id ===
                id

        );


    if (!cotizacion) {
        return;
    }


    const ventana =
        window.open(
            "",
            "_blank"
        );


    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana de impresión."
        );

        return;

    }


    const filas =
        cotizacion.items
            .map(

                item => `

                    <tr>
                        <td>${item.producto}</td>
                        <td>${item.talla}</td>
                        <td>${item.cantidad}</td>
                        <td>${fmtCLP(item.precioUnitario)}</td>
                        <td>${fmtCLP(item.total)}</td>
                    </tr>

                `

            )
            .join("");


    ventana.document.write(`

        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                ${cotizacion.codigo}
            </title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #172033;
                }

                .head {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 3px solid #172033;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }

                h1 {
                    margin: 0;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 25px;
                }

                th,
                td {
                    border-bottom: 1px solid #ccc;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #f4f5f7;
                }

                .totales {
                    margin-top: 25px;
                    margin-left: auto;
                    width: 320px;
                }

                .fila {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px;
                }

                .total {
                    font-weight: bold;
                    font-size: 18px;
                    border-top: 2px solid #172033;
                }

                .nota {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #666;
                }

            </style>

        </head>

        <body>

            <div class="head">

                <div>
                    <h1>PATYCA Confecciones</h1>
                    <p>Cotización comercial</p>
                </div>

                <div>
                    <strong>${cotizacion.codigo}</strong>
                    <br>
                    ${cotizacion.fecha}
                </div>

            </div>


            <h2>
                ${cotizacion.referencia}
            </h2>


            <table>

                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Talla</th>
                        <th>Cantidad</th>
                        <th>Unitario</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${filas}
                </tbody>

            </table>


            <div class="totales">

                <div class="fila">
                    <span>Subtotal</span>
                    <strong>
                        ${fmtCLP(
                            cotizacion.subtotal
                        )}
                    </strong>
                </div>

                <div class="fila">
                    <span>Descuento</span>
                    <strong>
                        ${fmtCLP(
                            cotizacion.descuento
                        )}
                    </strong>
                </div>

                <div class="fila total">
                    <span>Total</span>
                    <strong>
                        ${fmtCLP(
                            cotizacion.total
                        )}
                    </strong>
                </div>

            </div>


            <div class="nota">

                ${
                    cotizacion.observacion
                    ?
                    cotizacion.observacion
                    :
                    ""
                }

            </div>

            <script>
                window.onload = () => {
                    window.print();
                };
            <\/script>

        </body>

        </html>

    `);


    ventana.document.close();

}


// ======================================================
// RENDER
// ======================================================

function renderCotizaciones() {

    prepararCotizaciones();


    const cards =
        document.getElementById(
            "cotizacionesCards"
        );


    const tbody =
        document.getElementById(
            "tablaCotizaciones"
        );


    if (
        !cards
        ||
        !tbody
    ) {
        return;
    }


    const abiertas =
        db.cotizaciones.filter(

            item =>

                item.estado ===
                "Borrador"

                ||

                item.estado ===
                "Enviada"

        );


    const aceptadas =
        db.cotizaciones.filter(

            item =>
                item.estado ===
                "Aceptada"

        );


    cards.innerHTML = `

        <div class="card">

            <div class="num">
                ${db.cotizaciones.length}
            </div>

            <div class="lbl">
                Cotizaciones
            </div>

        </div>

        <div class="card warning">

            <div class="num">
                ${abiertas.length}
            </div>

            <div class="lbl">
                Abiertas
            </div>

        </div>

        <div class="card good">

            <div class="num">
                ${aceptadas.length}
            </div>

            <div class="lbl">
                Aceptadas
            </div>

        </div>

        <div class="card good">

            <div class="num">

                ${fmtCLP(

                    aceptadas.reduce(

                        (
                            suma,
                            item
                        ) =>

                            suma +
                            Number(
                                item.total
                            ),

                        0

                    )

                )}

            </div>

            <div class="lbl">
                Valor aceptado
            </div>

        </div>

    `;


    tbody.innerHTML =

        db.cotizaciones.length

        ?

        db.cotizaciones
            .slice()
            .reverse()
            .map(

                cotizacion => `

                    <tr data-searchable>

                        <td>
                            ${cotizacion.fecha}
                        </td>

                        <td>
                            ${cotizacion.codigo}
                        </td>

                        <td>
                            ${cotizacion.referencia}
                        </td>

                        <td>
                            ${cotizacion.items.length}
                        </td>

                        <td>
                            ${fmtCLP(
                                cotizacion.total
                            )}
                        </td>

                        <td>

                            <span
                                class="
                                status-badge
                                status-${slugEstado(
                                    cotizacion.estado
                                )}
                                "
                            >
                                ${cotizacion.estado}
                            </span>

                        </td>

                        <td>

                            ${
                                cotizacion.ventaGenerada

                                ?

                                "Bloqueada"

                                :

                                `

                                <select

                                    class="inline-select"

                                    onchange="
                                    cambiarEstadoCotizacion(
                                        ${cotizacion.id},
                                        this.value
                                    )
                                    "

                                >

                                    ${
                                        [
                                            "Borrador",
                                            "Enviada",
                                            "Aceptada",
                                            "Rechazada"
                                        ]
                                        .map(

                                            estado => `

                                                <option
                                                    value="${estado}"
                                                    ${
                                                        cotizacion.estado ===
                                                        estado
                                                        ?
                                                        "selected"
                                                        :
                                                        ""
                                                    }
                                                >
                                                    ${estado}
                                                </option>

                                            `

                                        )
                                        .join("")
                                    }

                                </select>

                                `
                            }

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-small"
                                    onclick="
                                    verCotizacion(
                                        ${cotizacion.id}
                                    )
                                    "
                                >
                                    Ver
                                </button>


                                <button
                                    class="btn btn-small"
                                    onclick="
                                    imprimirCotizacion(
                                        ${cotizacion.id}
                                    )
                                    "
                                >
                                    Imprimir
                                </button>


                                ${
                                    cotizacion.estado ===
                                    "Aceptada"

                                    &&

                                    !cotizacion.ventaGenerada

                                    ?

                                    `

                                    <button
                                        class="
                                        btn
                                        btn-small
                                        btn-primary
                                        "
                                        onclick="
                                        convertirCotizacionAVenta(
                                            ${cotizacion.id}
                                        )
                                        "
                                    >
                                        Convertir a venta
                                    </button>

                                    `

                                    :

                                    ""
                                }

                            </div>

                        </td>

                    </tr>

                `

            )
            .join("")

        :

        `

            <tr>
                <td
                    colspan="8"
                    class="empty"
                >
                    Todavía no existen cotizaciones.
                </td>
            </tr>

        `;

}