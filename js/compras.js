// ======================================================
// PATYCA ERP V6 - COMPRAS + CUENTAS POR PAGAR
// ======================================================

let proveedorSeleccionado =
    null;


// ======================================================
// CAMPOS PAGO COMPRA
// ======================================================

function asegurarCamposPagoCompra() {

    const modal =

        document.getElementById(
            "modalCompra"
        );


    if (
        !modal
        ||
        document.getElementById(
            "c_monto_pagado"
        )
    ) {

        return;

    }


    const selectEstado =

        document.getElementById(
            "c_estado"
        );


    if (
        selectEstado
        &&
        !Array
            .from(
                selectEstado.options
            )
            .some(

                option =>
                    option.value ===
                    "Parcial"

            )
    ) {

        const opcion =
            document.createElement(
                "option"
            );


        opcion.value =
            "Parcial";


        opcion.textContent =
            "Parcial";


        selectEstado.appendChild(
            opcion
        );

    }


    const vencimiento =

        document
            .getElementById(
                "c_vencimiento"
            )
            ?.closest(
                ".field"
            );


    if (
        !vencimiento
    ) {

        return;

    }


    const bloque =

        document.createElement(
            "div"
        );


    bloque.className =
        "field";


    bloque.innerHTML = `

        <label>
            Monto pagado ahora
        </label>

        <input
            id="c_monto_pagado"
            type="number"
            min="0"
            value="0"
        >

        <small class="helper-text">

            Para compra pendiente
            puede dejarse en $0.

        </small>

    `;


    vencimiento.insertAdjacentElement(
        "afterend",
        bloque
    );

}


// ======================================================
// MODAL ABONO COMPRA
// ======================================================

function asegurarModalPagoCompra() {

    if (
        document.getElementById(
            "modalPagoCompra"
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
        "modalPagoCompra";


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-top">

                <h2>
                    Registrar pago a proveedor
                </h2>

                <button
                    class="icon-close"
                    onclick="
                    closeModal(
                        'modalPagoCompra'
                    )
                    "
                >
                    ×
                </button>

            </div>


            <input
                id="pc_compra_id"
                type="hidden"
            >


            <div
                class="alert-box"
                id="pc_info"
            ></div>


            <div class="field">

                <label>
                    Fecha de pago
                </label>

                <input
                    id="pc_fecha"
                    type="date"
                >

            </div>


            <div class="field">

                <label>
                    Monto pagado
                </label>

                <input
                    id="pc_monto"
                    type="number"
                    min="1"
                >

            </div>


            <div class="field">

                <label>
                    Medio de pago
                </label>

                <select id="pc_medio">

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
                    Observación
                </label>

                <input id="pc_observacion">

            </div>


            <div class="modal-actions">

                <button
                    class="btn"
                    onclick="
                    closeModal(
                        'modalPagoCompra'
                    )
                    "
                >
                    Cancelar
                </button>

                <button
                    class="btn btn-primary"
                    onclick="
                    savePagoCompra()
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
// FILTROS
// ======================================================

function asegurarFiltrosCompras() {

    const seccion =

        document.getElementById(
            "view-compras"
        );


    if (
        !seccion
        ||
        document.getElementById(
            "comprasFiltros"
        )
    ) {

        return;

    }


    const titulo =

        Array
            .from(
                seccion.querySelectorAll(
                    ".section-title"
                )
            )
            .find(

                item =>
                    item.textContent
                        .includes(
                            "Compras registradas"
                        )

            );


    if (
        !titulo
    ) {

        return;

    }


    const bloque =

        document.createElement(
            "div"
        );


    bloque.id =
        "comprasFiltros";


    bloque.className =
        "panel compact";


    bloque.innerHTML = `

        <div class="field-row">

            <div class="field">

                <label>
                    Buscar
                </label>

                <input
                    id="com_filtro_texto"
                    placeholder="Proveedor, material, factura..."
                    oninput="renderCompras()"
                >

            </div>


            <div class="field">

                <label>
                    Estado de pago
                </label>

                <select
                    id="com_filtro_estado"
                    onchange="renderCompras()"
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

                </select>

            </div>


            <div class="field">

                <label>
                    Mes
                </label>

                <input
                    id="com_filtro_mes"
                    type="month"
                    oninput="renderCompras()"
                >

            </div>

        </div>

    `;


    titulo.insertAdjacentElement(
        "afterend",
        bloque
    );

}


// ======================================================
// PROVEEDORES
// ======================================================

function seleccionarProveedor(
    nombre
) {

    proveedorSeleccionado =
        nombre;

    renderCompras();

}


function limpiarSeleccionProveedor() {

    proveedorSeleccionado =
        null;

    renderCompras();

}


// ======================================================
// SELECT PROVEEDORES
// ======================================================

function cargarSelectProveedores(
    selectId
) {

    const select =

        document.getElementById(
            selectId
        );


    if (
        !select
    ) {

        return;

    }


    select.innerHTML =

        db.proveedores.map(

            proveedor => `

                <option
                    value="${proveedor.nombre}"
                >
                    ${proveedor.nombre}
                </option>

            `

        )
        .join("");

}


// ======================================================
// MATERIAL COMPRA
// ======================================================

function cargarSelectMaterialCompra() {

    const select =

        document.getElementById(
            "c_material"
        );


    if (
        !select
    ) {

        return;

    }


    select.innerHTML =

        db.materiales.map(

            material => `

                <option
                    value="${material.codigo}"
                >

                    ${material.codigo}
                    ·
                    ${material.detalle}

                </option>

            `

        )
        .join("");

}


// ======================================================
// ABRIR COMPRA
// ======================================================

function openCompraModal() {

    asegurarCamposPagoCompra();

    cargarSelectProveedores(
        "c_proveedor"
    );

    cargarSelectMaterialCompra();


    document
        .getElementById(
            "c_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "c_cantidad"
        )
        .value =
        "";


    document
        .getElementById(
            "c_precio"
        )
        .value =
        "";


    document
        .getElementById(
            "c_documento"
        )
        .value =
        "";


    document
        .getElementById(
            "c_estado"
        )
        .value =
        "Pendiente";


    document
        .getElementById(
            "c_vencimiento"
        )
        .value =
        "";


    document
        .getElementById(
            "c_monto_pagado"
        )
        .value =
        0;


    openModal(
        "modalCompra"
    );

}


// ======================================================
// GUARDAR COMPRA
// ======================================================

function saveCompra() {

    const material =

        db.materiales.find(

            item =>
                item.codigo ===
                document
                    .getElementById(
                        "c_material"
                    )
                    .value

        );


    if (
        !material
    ) {

        alert(
            "No se encontró el material."
        );

        return;

    }


    const cantidad =

        Number(

            document
                .getElementById(
                    "c_cantidad"
                )
                .value

        );


    const precio =

        Number(

            document
                .getElementById(
                    "c_precio"
                )
                .value

        );


    if (
        cantidad <= 0
        ||
        precio < 0
    ) {

        alert(
            "Revisa cantidad y precio."
        );

        return;

    }


    const total =
        cantidad
        *
        precio;


    const estadoElegido =

        document
            .getElementById(
                "c_estado"
            )
            .value;


    let pagado =

        Number(

            document
                .getElementById(
                    "c_monto_pagado"
                )
                .value

            ||

            0

        );


    if (
        estadoElegido ===
        "Pagada"
    ) {

        pagado =
            total;

    }


    if (
        pagado >
        total
    ) {

        alert(
            "El monto pagado no puede superar el total de la compra."
        );

        return;

    }


    const estadoPago =

        calcularEstadoPago(

            total,

            pagado

        );


    const stockAnterior =

        material.stock ===
        null

        ?

        0

        :

        Number(
            material.stock
        );


    const compra = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:

            nextHumanCode(

                "C",

                db.compras

            ),

        fecha:

            document
                .getElementById(
                    "c_fecha"
                )
                .value,

        proveedor:

            document
                .getElementById(
                    "c_proveedor"
                )
                .value,

        materialCodigo:
            material.codigo,

        material:
            material.detalle,

        cantidad:
            cantidad,

        unidad:
            material.unidad,

        precioUnitario:
            precio,

        total:
            total,

        montoPagado:
            pagado,

        saldoPendiente:
            total
            -
            pagado,

        estadoPago:
            estadoPago,

        documento:

            document
                .getElementById(
                    "c_documento"
                )
                .value
                .trim(),

        vencimiento:

            document
                .getElementById(
                    "c_vencimiento"
                )
                .value

    };


    db.compras.push(
        compra
    );


    if (
        pagado > 0
    ) {

        db.pagosCompras.push({

            id:
                Date.now()
                +
                Math.random(),

            codigo:

                nextHumanCode(

                    "PC",

                    db.pagosCompras

                ),

            compraId:
                compra.id,

            compraCodigo:
                compra.codigo,

            fecha:
                compra.fecha,

            monto:
                pagado,

            medioPago:
                "Por definir",

            observacion:
                "Pago inicial",

            usuario:
                usuarioActivo.nombre

        });

    }


    material.stock =
        stockAnterior
        +
        cantidad;


    material.ultimoPrecio =
        precio;


    material.proveedor =
        compra.proveedor;


    registrarMovimientoInventario({

        tipo:
            "Entrada por compra",

        categoria:
            "Material",

        referencia:
            compra.codigo,

        itemCodigo:
            material.codigo,

        itemNombre:
            material.detalle,

        cantidad:
            cantidad,

        unidad:
            material.unidad,

        stockAnterior:
            stockAnterior,

        stockNuevo:
            material.stock

    });


    registrarActividad(

        "Compras",

        compra.codigo
        +
        " · "
        +
        material.detalle
        +
        " · "
        +
        fmtCLP(
            total
        )
        +
        " · "
        +
        estadoPago

    );


    persist();

    closeModal(
        "modalCompra"
    );

    renderAll();

}


// ======================================================
// ABRIR PAGO COMPRA
// ======================================================

function abrirPagoCompra(
    id
) {

    asegurarModalPagoCompra();


    const compra =

        db.compras.find(

            item =>
                item.id ===
                id

        );


    if (
        !compra
    ) {

        return;

    }


    if (
        Number(
            compra.saldoPendiente
        )
        <=
        0
    ) {

        alert(
            "Esta compra ya está totalmente pagada."
        );

        return;

    }


    document
        .getElementById(
            "pc_compra_id"
        )
        .value =
        id;


    document
        .getElementById(
            "pc_fecha"
        )
        .value =
        todayStr();


    document
        .getElementById(
            "pc_monto"
        )
        .value =
        compra.saldoPendiente;


    document
        .getElementById(
            "pc_observacion"
        )
        .value =
        "";


    document
        .getElementById(
            "pc_info"
        )
        .innerHTML = `

            <strong>
                ${compra.codigo}
            </strong>

            ·

            ${compra.proveedor}

            · Saldo:

            <strong>
                ${fmtCLP(
                    compra.saldoPendiente
                )}
            </strong>

        `;


    openModal(
        "modalPagoCompra"
    );

}


// ======================================================
// GUARDAR PAGO COMPRA
// ======================================================

function savePagoCompra() {

    const id =

        Number(

            document
                .getElementById(
                    "pc_compra_id"
                )
                .value

        );


    const compra =

        db.compras.find(

            item =>
                Number(
                    item.id
                )
                ===
                id

        );


    if (
        !compra
    ) {

        return;

    }


    const monto =

        Number(

            document
                .getElementById(
                    "pc_monto"
                )
                .value

        );


    if (
        monto <= 0
        ||
        monto >
        Number(
            compra.saldoPendiente
        )
    ) {

        alert(
            "Revisa el monto a pagar."
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

                "PC",

                db.pagosCompras

            ),

        compraId:
            compra.id,

        compraCodigo:
            compra.codigo,

        fecha:

            document
                .getElementById(
                    "pc_fecha"
                )
                .value,

        monto:
            monto,

        medioPago:

            document
                .getElementById(
                    "pc_medio"
                )
                .value,

        observacion:

            document
                .getElementById(
                    "pc_observacion"
                )
                .value
                .trim(),

        usuario:
            usuarioActivo.nombre

    };


    db.pagosCompras.push(
        pago
    );


    compra.montoPagado =

        Number(
            compra.montoPagado
            ||
            0
        )

        +

        monto;


    compra.saldoPendiente =

        Math.max(

            0,

            Number(
                compra.total
            )
            -
            compra.montoPagado

        );


    compra.estadoPago =

        calcularEstadoPago(

            compra.total,

            compra.montoPagado

        );


    registrarActividad(

        "Pagos proveedores",

        pago.codigo
        +
        " · "
        +
        compra.codigo
        +
        " · "
        +
        fmtCLP(
            monto
        )

    );


    persist();

    closeModal(
        "modalPagoCompra"
    );

    renderAll();

}


// ======================================================
// COMPATIBILIDAD BOTÓN ANTIGUO
// ======================================================

function marcarCompraPagada(
    id
) {

    abrirPagoCompra(
        id
    );

}


// ======================================================
// RENDER
// ======================================================

function renderCompras() {

    asegurarFiltrosCompras();


    const proveedoresGrid =

        document.getElementById(
            "proveedoresGrid"
        );


    const seleccion =

        document.getElementById(
            "proveedorSeleccionActual"
        );


    const tablaCompras =

        document.getElementById(
            "tablaCompras"
        );


    const tablaReferencia =

        document.getElementById(
            "tablaComprasReferencia"
        );


    const proveedorDetalle =

        document.getElementById(
            "proveedorDetalle"
        );


    if (
        !proveedoresGrid
        ||
        !tablaCompras
        ||
        !tablaReferencia
    ) {

        return;

    }


    proveedoresGrid.innerHTML =

        db.proveedores.map(

            proveedor => `

                <button

                    class="
                    selector-card
                    ${
                        proveedorSeleccionado ===
                        proveedor.nombre

                        ?

                        "active"

                        :

                        ""
                    }
                    "

                    onclick='
                    seleccionarProveedor(
                        ${JSON.stringify(
                            proveedor.nombre
                        )}
                    )
                    '

                    data-searchable

                >

                    <strong>
                        ${proveedor.nombre}
                    </strong>

                    <span>
                        ${proveedor.categoria}
                    </span>

                </button>

            `

        )
        .join("");


    const texto =

        document
            .getElementById(
                "com_filtro_texto"
            )
            ?.value
            .trim()
            .toLowerCase()

        ||

        "";


    const estado =

        document
            .getElementById(
                "com_filtro_estado"
            )
            ?.value

        ||

        "";


    const mes =

        document
            .getElementById(
                "com_filtro_mes"
            )
            ?.value

        ||

        "";


    let compras =

        db.compras.filter(

            compra => {

                const textoCompra =

                    [

                        compra.codigo,
                        compra.proveedor,
                        compra.material,
                        compra.documento

                    ]
                    .join(
                        " "
                    )
                    .toLowerCase();


                return (

                    (
                        !proveedorSeleccionado
                        ||
                        compra.proveedor ===
                        proveedorSeleccionado
                    )

                    &&

                    (
                        !texto
                        ||
                        textoCompra.includes(
                            texto
                        )
                    )

                    &&

                    (
                        !estado
                        ||
                        compra.estadoPago ===
                        estado
                    )

                    &&

                    (
                        !mes
                        ||
                        String(
                            compra.fecha
                        )
                        .startsWith(
                            mes
                        )
                    )

                );

            }

        );


    let referencias =

        db.comprasReferencia.filter(

            item =>

                !proveedorSeleccionado

                ||

                item.proveedor ===
                proveedorSeleccionado

        );


    if (
        seleccion
    ) {

        seleccion.innerHTML =

            proveedorSeleccionado

            ?

            `

                <div class="selection-box">

                    <div>

                        <strong>
                            Proveedor seleccionado
                        </strong>

                        <span>
                            ${proveedorSeleccionado}
                        </span>

                    </div>

                    <button
                        class="btn"
                        onclick="
                        limpiarSeleccionProveedor()
                        "
                    >
                        Ver todos
                    </button>

                </div>

            `

            :

            `

                <div class="selection-box">

                    <div>

                        <strong>
                            Vista general
                        </strong>

                        <span>
                            Selecciona un proveedor
                            para ver su historial.
                        </span>

                    </div>

                </div>

            `;

    }


    if (
        proveedorDetalle
    ) {

        if (
            proveedorSeleccionado
        ) {

            const total =

                db.compras
                    .filter(

                        compra =>
                            compra.proveedor ===
                            proveedorSeleccionado

                    )
                    .reduce(

                        (
                            suma,
                            compra
                        ) =>

                            suma
                            +
                            Number(
                                compra.total
                            ),

                        0

                    );


            const pendiente =

                db.compras
                    .filter(

                        compra =>
                            compra.proveedor ===
                            proveedorSeleccionado

                    )
                    .reduce(

                        (
                            suma,
                            compra
                        ) =>

                            suma
                            +
                            Number(
                                compra.saldoPendiente
                                ||
                                0
                            ),

                        0

                    );


            proveedorDetalle.innerHTML = `

                <div class="
                    panel
                    provider-profile
                ">

                    <div>

                        <span class="eyebrow">
                            PROVEEDOR
                        </span>

                        <h2>
                            ${proveedorSeleccionado}
                        </h2>

                    </div>


                    <div class="detail-kpis">

                        <div>

                            <strong>
                                ${fmtCLP(
                                    total
                                )}
                            </strong>

                            <span>
                                Compras registradas
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${fmtCLP(
                                    pendiente
                                )}
                            </strong>

                            <span>
                                Saldo por pagar
                            </span>

                        </div>

                    </div>

                </div>

            `;

        }

        else {

            proveedorDetalle.innerHTML =
                "";

        }

    }


    tablaCompras.innerHTML =

        compras.length

        ?

        compras
            .slice()
            .reverse()
            .map(

                compra => `

                    <tr data-searchable>

                        <td>
                            ${compra.codigo}
                        </td>

                        <td>
                            ${compra.fecha}
                        </td>

                        <td>
                            ${compra.proveedor}
                        </td>

                        <td>
                            ${compra.material}
                        </td>

                        <td>

                            ${compra.cantidad}
                            ${compra.unidad}

                        </td>

                        <td>

                            ${fmtCLP(
                                compra.precioUnitario
                            )}

                        </td>

                        <td>

                            ${fmtCLP(
                                compra.total
                            )}

                        </td>

                        <td>

                            ${
                                compra.documento
                                ||
                                "—"
                            }

                        </td>

                        <td>

                            <span
                                class="
                                pill
                                ${
                                    compra.estadoPago ===
                                    "Pagada"

                                    ?

                                    "pill-green"

                                    :

                                    compra.estadoPago ===
                                    "Parcial"

                                    ?

                                    "pill-yellow"

                                    :

                                    "pill-red"
                                }
                                "
                            >

                                ${compra.estadoPago}

                            </span>


                            <small
                                style="
                                display:block;
                                margin-top:4px;
                                "
                            >

                                Pagado:
                                ${fmtCLP(
                                    compra.montoPagado
                                )}

                                <br>

                                Saldo:
                                ${fmtCLP(
                                    compra.saldoPendiente
                                )}

                            </small>

                        </td>

                        <td>

                            ${
                                Number(
                                    compra.saldoPendiente
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
                                    abrirPagoCompra(
                                        ${compra.id}
                                    )
                                    "
                                >
                                    Registrar pago
                                </button>

                                `

                                :

                                "—"
                            }

                        </td>

                    </tr>

                `

            )
            .join("")

        :

        `

            <tr>

                <td
                    colspan="10"
                    class="empty"
                >

                    No existen compras
                    para los filtros seleccionados.

                </td>

            </tr>

        `;


    tablaReferencia.innerHTML =

        referencias.length

        ?

        referencias.map(

            compra => `

                <tr data-searchable>

                    <td>
                        ${compra.proveedor}
                    </td>

                    <td>
                        ${compra.material}
                    </td>

                    <td>

                        ${compra.cantidad}
                        ${compra.unidad}

                    </td>

                    <td>

                        ${fmtCLP(
                            compra.precioUnitario
                        )}

                    </td>

                    <td>

                        ${fmtCLP(
                            compra.total
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
                    Sin referencias.
                </td>

            </tr>

        `;

}