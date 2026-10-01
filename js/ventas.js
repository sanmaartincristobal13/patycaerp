// ======================================================
// PATYCA ERP V6 - VENTAS + CUENTAS POR COBRAR
// ======================================================


// ======================================================
// CAMPOS PROFESIONALES MODAL VENTA
// ======================================================

function asegurarCamposPagoVenta() {

    const modal =

        document.getElementById(
            "modalVenta"
        );


    if (
        !modal
        ||
        document.getElementById(
            "v_monto_pagado"
        )
    ) {

        return;

    }


    const acciones =

        modal.querySelector(
            ".modal-actions"
        );


    if (
        !acciones
    ) {

        return;

    }


    const bloque =

        document.createElement(
            "div"
        );


    bloque.innerHTML = `

        <div class="field">

            <label>
                Monto recibido ahora
            </label>

            <input
                id="v_monto_pagado"
                type="number"
                min="0"
                value="0"
            >

            <small class="helper-text">

                Si no se ha pagado todavía,
                deja este valor en $0.

            </small>

        </div>

    `;


    acciones.insertAdjacentElement(
        "beforebegin",
        bloque
    );

}


// ======================================================
// FILTROS
// ======================================================

function asegurarFiltrosVentas() {

    const seccion =

        document.getElementById(
            "view-ventas"
        );


    if (
        !seccion
        ||
        document.getElementById(
            "ventasFiltros"
        )
    ) {

        return;

    }


    const cards =

        document.getElementById(
            "ventasCards"
        );


    const bloque =

        document.createElement(
            "div"
        );


    bloque.id =
        "ventasFiltros";


    bloque.className =
        "panel compact";


    bloque.innerHTML = `

        <div class="field-row">

            <div class="field">

                <label>
                    Buscar
                </label>

                <input
                    id="ven_filtro_texto"
                    placeholder="Código, producto, establecimiento..."
                    oninput="renderVentas()"
                >

            </div>


            <div class="field">

                <label>
                    Estado de pago
                </label>

                <select
                    id="ven_filtro_pago"
                    onchange="renderVentas()"
                >

                    <option value="">
                        Todos
                    </option>

                    <option>
                        Pagada
                    </option>

                    <option>
                        Parcial
                    </option>

                    <option>
                        Pendiente
                    </option>

                    <option>
                        Por revisar
                    </option>

                </select>

            </div>


            <div class="field">

                <label>
                    Mes
                </label>

                <input
                    id="ven_filtro_mes"
                    type="month"
                    oninput="renderVentas()"
                >

            </div>

        </div>

    `;


    cards?.insertAdjacentElement(
        "afterend",
        bloque
    );

}


// ======================================================
// MODAL ABONO VENTA
// ======================================================

function asegurarModalPagoVenta() {

    if (
        document.getElementById(
            "modalPagoVenta"
        )
    ) {

        return;

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "modal-overlay";


    overlay.id =
        "modalPagoVenta";


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-top">

                <h2>
                    Registrar pago
                </h2>

                <button
                    class="icon-close"
                    onclick="
                    closeModal(
                        'modalPagoVenta'
                    )
                    "
                >
                    ×
                </button>

            </div>


            <input
                id="pv_venta_id"
                type="hidden"
            >


            <div
                class="alert-box"
                id="pv_info"
            ></div>


            <div class="field">

                <label>
                    Fecha de pago
                </label>

                <input
                    id="pv_fecha"
                    type="date"
                >

            </div>


            <div class="field">

                <label>
                    Monto recibido
                </label>

                <input
                    id="pv_monto"
                    type="number"
                    min="1"
                >

            </div>


            <div class="field">

                <label>
                    Medio de pago
                </label>

                <select id="pv_medio">

                    <option>
                        Transferencia
                    </option>

                    <option>
                        Efectivo
                    </option>

                    <option>
                        Tarjeta
                    </option>

                    <option>
                        Otro
                    </option>

                </select>

            </div>


            <div class="field">

                <label>
                    Referencia / observación
                </label>

                <input id="pv_observacion">

            </div>


            <div class="modal-actions">

                <button
                    class="btn"
                    onclick="
                    closeModal(
                        'modalPagoVenta'
                    )
                    "
                >
                    Cancelar
                </button>

                <button
                    class="btn btn-primary"
                    onclick="
                    savePagoVenta()
                    "
                >
                    Registrar pago
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );

}


// ======================================================
// PRODUCTOS
// ======================================================

function cargarProductosVenta() {

    const select =

        document.getElementById(
            "v_producto"
        );


    if (
        !select
    ) {

        return;

    }


    select.innerHTML =

        db.productos.map(

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


    cargarTallasVenta();

}


// ======================================================
// TALLAS REALES
// ======================================================

function cargarTallasVenta() {

    const productoId =

        document
            .getElementById(
                "v_producto"
            )
            ?.value;


    const producto =

        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const select =

        document.getElementById(
            "v_talla"
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


    actualizarPrecioVenta();

}


// ======================================================
// PRECIO
// ======================================================

function actualizarPrecioVenta() {

    const producto =

        db.productos.find(

            item =>
                item.id ===
                document
                    .getElementById(
                        "v_producto"
                    )
                    ?.value

        );


    const talla =

        document
            .getElementById(
                "v_talla"
            )
            ?.value;


    const input =

        document.getElementById(
            "v_precio"
        );


    if (
        producto
        &&
        input
    ) {

        input.value =

            precioParaTalla(

                producto,

                talla

            );

    }

}


// ======================================================
// EVENTOS
// ======================================================

document
    .getElementById(
        "v_producto"
    )
    ?.addEventListener(

        "change",

        cargarTallasVenta

    );


document
    .getElementById(
        "v_talla"
    )
    ?.addEventListener(

        "change",

        actualizarPrecioVenta

    );


// ======================================================
// ABRIR VENTA
// ======================================================

function openVentaModal() {

    asegurarCamposPagoVenta();

    cargarProductosVenta();


    document
        .getElementById(
            "v_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "v_cantidad"
        )
        .value =
        1;


    document
        .getElementById(
            "v_descuento"
        )
        .value =
        0;


    document
        .getElementById(
            "v_monto_pagado"
        )
        .value =
        0;


    document
        .getElementById(
            "v_observacion"
        )
        .value =
        "";


    openModal(
        "modalVenta"
    );

}


// ======================================================
// ESTADO PAGO
// ======================================================

function calcularEstadoPago(
    total,
    pagado
) {

    total =
        Number(
            total
            ||
            0
        );


    pagado =
        Number(
            pagado
            ||
            0
        );


    if (
        total > 0
        &&
        pagado >= total
    ) {

        return "Pagada";

    }


    if (
        pagado > 0
    ) {

        return "Parcial";

    }


    return "Pendiente";

}


// ======================================================
// GUARDAR VENTA
// ======================================================

function saveVenta() {

    const productoId =

        document
            .getElementById(
                "v_producto"
            )
            .value;


    const talla =

        document
            .getElementById(
                "v_talla"
            )
            .value;


    const cantidad =

        Number(

            document
                .getElementById(
                    "v_cantidad"
                )
                .value

        );


    const precio =

        Number(

            document
                .getElementById(
                    "v_precio"
                )
                .value

        );


    const descuento =

        Number(

            document
                .getElementById(
                    "v_descuento"
                )
                .value

            ||

            0

        );


    const pagadoInicial =

        Number(

            document
                .getElementById(
                    "v_monto_pagado"
                )
                ?.value

            ||

            0

        );


    if (
        cantidad <= 0
        ||
        precio < 0
        ||
        descuento < 0
        ||
        pagadoInicial < 0
    ) {

        alert(
            "Revisa cantidad, precio, descuento y pago."
        );

        return;

    }


    const producto =

        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const stock =

        db.stockPrendas.find(

            item =>

                item.productoId ===
                productoId

                &&

                String(
                    item.talla
                )
                ===
                String(
                    talla
                )

        );


    if (
        !stock
    ) {

        alert(

            "No existe conteo de stock para "
            +
            producto.nombre
            +
            " talla "
            +
            talla
            +
            "."

        );

        return;

    }


    if (
        Number(
            stock.stock
        )
        <
        cantidad
    ) {

        alert(

            "Stock insuficiente.\n\n"
            +
            "Disponible: "
            +
            stock.stock
            +
            "\nSolicitado: "
            +
            cantidad

        );

        return;

    }


    const subtotal =
        cantidad
        *
        precio;


    const total =

        Math.max(

            0,

            subtotal
            -
            descuento

        );


    if (
        pagadoInicial >
        total
    ) {

        alert(
            "El monto recibido no puede ser mayor que el total de la venta."
        );

        return;

    }


    const stockAnterior =
        Number(
            stock.stock
        );


    stock.stock =
        stockAnterior
        -
        cantidad;


    const venta = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(

                "V",

                db.ventas

            ),

        fecha:

            document
                .getElementById(
                    "v_fecha"
                )
                .value,

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

        subtotal:
            subtotal,

        descuento:
            descuento,

        total:
            total,

        montoPagado:
            pagadoInicial,

        saldoPendiente:
            total
            -
            pagadoInicial,

        estadoPago:
            calcularEstadoPago(

                total,

                pagadoInicial

            ),

        medioPago:

            pagadoInicial > 0

            ?

            document
                .getElementById(
                    "v_medio_pago"
                )
                .value

            :

            "Pendiente",

        observacion:

            document
                .getElementById(
                    "v_observacion"
                )
                .value
                .trim()

    };


    db.ventas.push(
        venta
    );


    if (
        pagadoInicial > 0
    ) {

        db.pagosVentas.push({

            id:
                Date.now()
                +
                Math.random(),

            codigo:
                nextHumanCode(

                    "PV",

                    db.pagosVentas

                ),

            ventaId:
                venta.id,

            ventaCodigo:
                venta.codigo,

            fecha:
                venta.fecha,

            monto:
                pagadoInicial,

            medioPago:
                venta.medioPago,

            observacion:
                "Pago inicial",

            usuario:
                usuarioActivo.nombre

        });

    }


    registrarMovimientoInventario({

        tipo:
            "Salida por venta",

        categoria:
            "Prenda terminada",

        referencia:
            venta.codigo,

        itemCodigo:
            producto.id,

        itemNombre:

            producto.nombre
            +
            " · Talla "
            +
            talla,

        cantidad:
            -cantidad,

        unidad:
            "unidades",

        stockAnterior:
            stockAnterior,

        stockNuevo:
            stock.stock

    });


    registrarActividad(

        "Ventas",

        venta.codigo
        +
        " · "
        +
        producto.nombre
        +
        " talla "
        +
        talla
        +
        " · total "
        +
        fmtCLP(
            total
        )
        +
        " · "
        +
        venta.estadoPago

    );


    persist();

    closeModal(
        "modalVenta"
    );

    renderAll();

}


// ======================================================
// ABRIR ABONO
// ======================================================

function abrirPagoVenta(
    id
) {

    asegurarModalPagoVenta();


    const venta =

        db.ventas.find(

            item =>
                item.id ===
                id

        );


    if (
        !venta
    ) {

        return;

    }


    if (
        Number(
            venta.saldoPendiente
        )
        <=
        0
    ) {

        alert(
            "Esta venta ya está pagada."
        );

        return;

    }


    document
        .getElementById(
            "pv_venta_id"
        )
        .value =
        id;


    document
        .getElementById(
            "pv_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "pv_monto"
        )
        .value =
        venta.saldoPendiente;


    document
        .getElementById(
            "pv_observacion"
        )
        .value =
        "";


    document
        .getElementById(
            "pv_info"
        )
        .innerHTML = `

            <strong>
                ${venta.codigo}
            </strong>

            ·

            ${venta.producto}

            · Saldo pendiente:

            <strong>
                ${fmtCLP(
                    venta.saldoPendiente
                )}
            </strong>

        `;


    openModal(
        "modalPagoVenta"
    );

}


// ======================================================
// GUARDAR ABONO
// ======================================================

function savePagoVenta() {

    const id =

        Number(

            document
                .getElementById(
                    "pv_venta_id"
                )
                .value

        );


    const venta =

        db.ventas.find(

            item =>
                Number(
                    item.id
                )
                ===
                id

        );


    if (
        !venta
    ) {

        return;

    }


    const monto =

        Number(

            document
                .getElementById(
                    "pv_monto"
                )
                .value

        );


    if (
        monto <= 0
    ) {

        alert(
            "Ingresa un monto válido."
        );

        return;

    }


    if (
        monto >
        Number(
            venta.saldoPendiente
        )
    ) {

        alert(
            "El pago supera el saldo pendiente."
        );

        return;

    }


    const pago = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(

                "PV",

                db.pagosVentas

            ),

        ventaId:
            venta.id,

        ventaCodigo:
            venta.codigo,

        fecha:

            document
                .getElementById(
                    "pv_fecha"
                )
                .value,

        monto:
            monto,

        medioPago:

            document
                .getElementById(
                    "pv_medio"
                )
                .value,

        observacion:

            document
                .getElementById(
                    "pv_observacion"
                )
                .value
                .trim(),

        usuario:
            usuarioActivo.nombre

    };


    db.pagosVentas.push(
        pago
    );


    venta.montoPagado =

        Number(
            venta.montoPagado
            ||
            0
        )

        +

        monto;


    venta.saldoPendiente =

        Math.max(

            0,

            Number(
                venta.total
            )
            -
            venta.montoPagado

        );


    venta.estadoPago =

        calcularEstadoPago(

            venta.total,

            venta.montoPagado

        );


    registrarActividad(

        "Cobranza",

        pago.codigo
        +
        " · "
        +
        venta.codigo
        +
        " · "
        +
        fmtCLP(
            monto
        )

    );


    persist();

    closeModal(
        "modalPagoVenta"
    );

    renderAll();

}


// ======================================================
// ELIMINAR VENTA
// ======================================================

function deleteVenta(
    id
) {

    const venta =

        db.ventas.find(

            item =>
                item.id ===
                id

        );


    if (
        !venta
    ) {

        return;

    }


    const pagos =

        db.pagosVentas.filter(

            pago =>
                pago.ventaId ===
                venta.id

        );


    if (
        pagos.length > 0
    ) {

        alert(

            "Esta venta tiene pagos registrados.\n\n"
            +
            "Por seguridad contable no se puede eliminar directamente."

        );

        return;

    }


    if (
        !confirm(

            "¿Eliminar "
            +
            venta.codigo
            +
            "?\n\n"
            +
            "El stock será devuelto al inventario."

        )
    ) {

        return;

    }


    const stock =

        db.stockPrendas.find(

            item =>

                item.productoId ===
                venta.productoId

                &&

                String(
                    item.talla
                )
                ===
                String(
                    venta.talla
                )

        );


    if (
        stock
    ) {

        const anterior =
            Number(
                stock.stock
            );


        stock.stock =
            anterior
            +
            Number(
                venta.cantidad
            );


        registrarMovimientoInventario({

            tipo:
                "Reverso de venta",

            categoria:
                "Prenda terminada",

            referencia:
                venta.codigo,

            itemCodigo:
                venta.productoId,

            itemNombre:

                venta.producto
                +
                " · Talla "
                +
                venta.talla,

            cantidad:
                Number(
                    venta.cantidad
                ),

            unidad:
                "unidades",

            stockAnterior:
                anterior,

            stockNuevo:
                stock.stock

        });

    }


    db.ventas =

        db.ventas.filter(

            item =>
                item.id !==
                id

        );


    registrarActividad(

        "Ventas",

        "Venta eliminada: "
        +
        venta.codigo

    );


    persist();

    renderAll();

}


// ======================================================
// RENDER
// ======================================================

function renderVentas() {

    asegurarFiltrosVentas();


    const texto =

        document
            .getElementById(
                "ven_filtro_texto"
            )
            ?.value
            .trim()
            .toLowerCase()

        ||

        "";


    const estadoFiltro =

        document
            .getElementById(
                "ven_filtro_pago"
            )
            ?.value

        ||

        "";


    const mesFiltro =

        document
            .getElementById(
                "ven_filtro_mes"
            )
            ?.value

        ||

        "";


    const ventasFiltradas =

        db.ventas.filter(

            venta => {

                const textoVenta =

                    [

                        venta.codigo,
                        venta.establecimiento,
                        venta.producto,
                        venta.talla,
                        venta.estadoPago

                    ]
                    .join(
                        " "
                    )
                    .toLowerCase();


                return (

                    (
                        !texto
                        ||
                        textoVenta.includes(
                            texto
                        )
                    )

                    &&

                    (
                        !estadoFiltro
                        ||
                        venta.estadoPago ===
                        estadoFiltro
                    )

                    &&

                    (
                        !mesFiltro
                        ||
                        String(
                            venta.fecha
                        )
                        .startsWith(
                            mesFiltro
                        )
                    )

                );

            }

        );


    const mesActual =
        todayStr()
            .slice(
                0,
                7
            );


    const ventasMes =

        db.ventas.filter(

            venta =>
                String(
                    venta.fecha
                )
                .startsWith(
                    mesActual
                )

        );


    const ventasRegistradas =

        ventasMes.reduce(

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


    const porCobrar =

        db.ventas.reduce(

            (
                suma,
                venta
            ) =>

                suma
                +
                Number(
                    venta.saldoPendiente
                    ||
                    0
                ),

            0

        );


    const unidadesMes =

        ventasMes.reduce(

            (
                suma,
                venta
            ) =>

                suma
                +
                Number(
                    venta.cantidad
                    ||
                    0
                ),

            0

        );


    document
        .getElementById(
            "ventasCards"
        )
        .innerHTML = `

            <div class="card">

                <div class="num">

                    ${fmtCLP(
                        ventasRegistradas
                    )}

                </div>

                <div class="lbl">
                    Ventas registradas mes
                </div>

            </div>


            <div class="card good">

                <div class="num">

                    ${fmtCLP(
                        cobradoMes
                    )}

                </div>

                <div class="lbl">
                    Cobrado este mes
                </div>

            </div>


            <div class="card warning">

                <div class="num">

                    ${fmtCLP(
                        porCobrar
                    )}

                </div>

                <div class="lbl">
                    Cuentas por cobrar
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${unidadesMes}
                </div>

                <div class="lbl">
                    Unidades vendidas mes
                </div>

            </div>

        `;


    document
        .getElementById(
            "tablaVentas"
        )
        .innerHTML =

        ventasFiltradas.length

        ?

        ventasFiltradas
            .slice()
            .reverse()
            .map(

                venta => `

                    <tr data-searchable>

                        <td>
                            ${venta.fecha}
                        </td>

                        <td>
                            ${venta.codigo}
                        </td>

                        <td>
                            ${venta.establecimiento}
                        </td>

                        <td>
                            ${venta.producto}
                        </td>

                        <td>
                            ${venta.talla}
                        </td>

                        <td>
                            ${venta.cantidad}
                        </td>

                        <td>

                            ${fmtCLP(
                                venta.total
                            )}

                        </td>

                        <td>

                            <div>

                                <span
                                    class="
                                    pill
                                    ${
                                        venta.estadoPago ===
                                        "Pagada"

                                        ?

                                        "pill-green"

                                        :

                                        venta.estadoPago ===
                                        "Parcial"

                                        ?

                                        "pill-yellow"

                                        :

                                        "pill-red"
                                    }
                                    "
                                >
                                    ${venta.estadoPago}
                                </span>

                                <small
                                    style="
                                    display:block;
                                    margin-top:4px;
                                    "
                                >

                                    Cobrado:
                                    ${fmtCLP(
                                        venta.montoPagado
                                    )}

                                    <br>

                                    Saldo:
                                    ${fmtCLP(
                                        venta.saldoPendiente
                                    )}

                                </small>

                            </div>

                        </td>

                        <td>

                            <div class="actions">

                                ${
                                    Number(
                                        venta.saldoPendiente
                                    )
                                    > 0

                                    ?

                                    `
                                    <button
                                        class="
                                        btn
                                        btn-small
                                        btn-primary
                                        "
                                        onclick="
                                        abrirPagoVenta(
                                            ${venta.id}
                                        )
                                        "
                                    >
                                        Registrar pago
                                    </button>
                                    `

                                    :

                                    ""
                                }


                                <button
                                    class="
                                    btn
                                    btn-small
                                    btn-danger
                                    "
                                    onclick="
                                    deleteVenta(
                                        ${venta.id}
                                    )
                                    "
                                >
                                    Eliminar
                                </button>

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
                    colspan="9"
                    class="empty"
                >
                    No hay ventas
                    para los filtros seleccionados.
                </td>

            </tr>

        `;

}