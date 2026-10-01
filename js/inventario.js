// ======================================================
// PATYCA ERP V6 - INVENTARIO PROFESIONAL
// ======================================================


// ======================================================
// CONFIGURACIÓN ALERTA
// ======================================================

function porcentajeAdvertenciaStock() {

    return Number(

        db.configuracion
            .porcentajeAdvertenciaStock

        ||

        20

    );

}


// ======================================================
// ESTADO STOCK
// ======================================================

function estadoStock(
    stock,
    minimo
) {

    if (
        stock === null
        ||
        stock === undefined
    ) {

        return "Sin conteo";

    }


    if (
        minimo === null
        ||
        minimo === undefined
        ||
        minimo === ""
    ) {

        return "Sin mínimo";

    }


    const stockNumero =
        Number(
            stock
        );


    const minimoNumero =
        Number(
            minimo
        );


    if (
        stockNumero <=
        minimoNumero
    ) {

        return "Crítico";

    }


    const limitePreventivo =

        minimoNumero

        *

        (
            1
            +
            porcentajeAdvertenciaStock()
            /
            100
        );


    if (
        stockNumero <=
        limitePreventivo
    ) {

        return "Próximo al mínimo";

    }


    return "Normal";

}


// ======================================================
// CLASES VISUALES
// ======================================================

function claseEstadoStock(
    estado
) {

    switch (
        estado
    ) {

        case "Normal":
            return "pill-green";

        case "Próximo al mínimo":
            return "pill-yellow";

        case "Crítico":
            return "pill-red";

        default:
            return "pill-gray";

    }

}


// ======================================================
// CÓDIGOS
// ======================================================

function nextHumanCode(
    prefix,
    collection,
    field = "codigo"
) {

    const maximo =

        (
            collection
            ||
            []
        )
        .reduce(

            (
                actual,
                item
            ) => {

                const valor =
                    String(
                        item?.[
                            field
                        ]
                        ||
                        ""
                    );


                const regex =
                    new RegExp(

                        "^"
                        +
                        prefix
                        +
                        "-(\\d+)$"

                    );


                const match =
                    valor.match(
                        regex
                    );


                if (
                    !match
                ) {

                    return actual;

                }


                return Math.max(

                    actual,

                    Number(
                        match[1]
                    )

                );

            },

            0

        );


    return (

        prefix

        +

        "-"

        +

        String(
            maximo + 1
        )
        .padStart(
            6,
            "0"
        )

    );

}


// ======================================================
// MOVIMIENTO INVENTARIO
// ======================================================

function registrarMovimientoInventario(
    datos
) {

    db.movimientosInventario.push({

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(

                "MOV",

                db.movimientosInventario

            ),

        fecha:
            todayStr(),

        hora:
            new Date()
                .toLocaleTimeString(

                    "es-CL",

                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit",

                        second:
                            "2-digit"
                    }

                ),

        tipo:
            datos.tipo,

        categoria:
            datos.categoria,

        referencia:
            datos.referencia
            ||
            "",

        itemCodigo:
            datos.itemCodigo
            ||
            "",

        itemNombre:
            datos.itemNombre
            ||
            "",

        cantidad:
            Number(
                datos.cantidad
                ||
                0
            ),

        unidad:
            datos.unidad
            ||
            "",

        stockAnterior:
            datos.stockAnterior,

        stockNuevo:
            datos.stockNuevo,

        usuario:
            usuarioActivo?.nombre
            ||
            "Usuario"

    });

}


// ======================================================
// FILTROS INVENTARIO
// ======================================================

function asegurarFiltrosInventario() {

    const seccion =
        document.getElementById(
            "view-inventario"
        );


    if (
        !seccion
        ||
        document.getElementById(
            "inventarioFiltros"
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
                            "Telas e insumos"
                        )

            );


    if (
        !titulo
    ) {

        return;

    }


    const filtros =
        document.createElement(
            "div"
        );


    filtros.id =
        "inventarioFiltros";


    filtros.className =
        "panel compact";


    filtros.style.marginBottom =
        "12px";


    filtros.innerHTML = `

        <div class="field-row">

            <div class="field">

                <label>
                    Buscar material
                </label>

                <input
                    id="inv_filtro_texto"
                    placeholder="Tela, código, proveedor..."
                    oninput="renderInventario()"
                >

            </div>


            <div class="field">

                <label>
                    Bodega
                </label>

                <select
                    id="inv_filtro_bodega"
                    onchange="renderInventario()"
                >

                    <option value="">
                        Todas
                    </option>

                </select>

            </div>


            <div class="field">

                <label>
                    Estado
                </label>

                <select
                    id="inv_filtro_estado"
                    onchange="renderInventario()"
                >

                    <option value="">
                        Todos
                    </option>

                    <option>
                        Normal
                    </option>

                    <option>
                        Próximo al mínimo
                    </option>

                    <option>
                        Crítico
                    </option>

                    <option>
                        Sin conteo
                    </option>

                    <option>
                        Sin mínimo
                    </option>

                </select>

            </div>

        </div>

    `;


    titulo.insertAdjacentElement(
        "afterend",
        filtros
    );

}


// ======================================================
// SELECT BODEGA FILTRO
// ======================================================

function actualizarFiltroBodegas() {

    const select =
        document.getElementById(
            "inv_filtro_bodega"
        );


    if (
        !select
    ) {

        return;

    }


    const actual =
        select.value;


    select.innerHTML = `

        <option value="">
            Todas
        </option>

        ${
            db.configuracion.bodegas
                .map(

                    bodega => `

                        <option value="${bodega}">
                            ${bodega}
                        </option>

                    `

                )
                .join("")
        }

        <option value="Por definir">
            Por definir
        </option>

    `;


    select.value =
        actual;

}


// ======================================================
// SELECT MATERIAL
// ======================================================

function cargarSelectMaterialStock() {

    const select =
        document.getElementById(
            "f_stock_material"
        );


    if (
        !select
    ) {

        return;

    }


    select.innerHTML =

        db.materiales
            .map(

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
// DATOS STOCK MATERIAL
// ======================================================

function cargarDatosMaterialStock() {

    const codigo =

        document
            .getElementById(
                "f_stock_material"
            )
            ?.value;


    const material =

        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    if (
        !material
    ) {

        return;

    }


    document
        .getElementById(
            "f_stock_cantidad"
        )
        .value =

        material.stock
        ??
        "";


    document
        .getElementById(
            "f_stock_minimo"
        )
        .value =

        material.stockMinimo
        ??
        "";


    document
        .getElementById(
            "f_stock_objetivo"
        )
        .value =

        material.stockObjetivo
        ??
        "";


    cargarSelectBodegas(
        "f_stock_bodega"
    );


    document
        .getElementById(
            "f_stock_bodega"
        )
        .value =

        db.configuracion.bodegas.includes(
            material.bodega
        )

        ?

        material.bodega

        :

        db.configuracion.bodegas[0];

}


// ======================================================
// EVENTO SELECT MATERIAL
// ======================================================

document
    .getElementById(
        "f_stock_material"
    )
    ?.addEventListener(

        "change",

        cargarDatosMaterialStock

    );


// ======================================================
// ABRIR STOCK MATERIAL
// ======================================================

function openStockModal(
    codigo = null
) {

    cargarSelectMaterialStock();


    if (
        codigo
    ) {

        document
            .getElementById(
                "f_stock_material"
            )
            .value =
            codigo;

    }


    cargarDatosMaterialStock();


    openModal(
        "modalStock"
    );

}


// ======================================================
// GUARDAR STOCK MATERIAL
// ======================================================

function saveStock() {

    const codigo =

        document
            .getElementById(
                "f_stock_material"
            )
            .value;


    const material =

        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    if (
        !material
    ) {

        return;

    }


    const stockRaw =

        document
            .getElementById(
                "f_stock_cantidad"
            )
            .value;


    if (
        stockRaw === ""
    ) {

        alert(
            "Ingresa el conteo físico del material."
        );

        return;

    }


    const stock =
        Number(
            stockRaw
        );


    if (
        !Number.isFinite(
            stock
        )
        ||
        stock < 0
    ) {

        alert(
            "El stock debe ser un número válido mayor o igual que cero."
        );

        return;

    }


    const minimoRaw =

        document
            .getElementById(
                "f_stock_minimo"
            )
            .value;


    const objetivoRaw =

        document
            .getElementById(
                "f_stock_objetivo"
            )
            .value;


    const minimo =

        minimoRaw === ""

        ?

        null

        :

        Number(
            minimoRaw
        );


    const objetivo =

        objetivoRaw === ""

        ?

        null

        :

        Number(
            objetivoRaw
        );


    if (
        minimo !== null
        &&
        minimo < 0
    ) {

        alert(
            "El stock mínimo no puede ser negativo."
        );

        return;

    }


    if (
        objetivo !== null
        &&
        objetivo < 0
    ) {

        alert(
            "El stock objetivo no puede ser negativo."
        );

        return;

    }


    if (
        minimo !== null
        &&
        objetivo !== null
        &&
        objetivo < minimo
    ) {

        alert(
            "El stock objetivo no debería ser menor que el stock mínimo."
        );

        return;

    }


    const anterior =
        material.stock;


    material.stock =
        stock;


    material.stockMinimo =
        minimo;


    material.stockObjetivo =
        objetivo;


    material.bodega =

        document
            .getElementById(
                "f_stock_bodega"
            )
            .value;


    registrarMovimientoInventario({

        tipo:
            "Ajuste manual",

        categoria:
            "Material",

        referencia:
            "Conteo / ajuste",

        itemCodigo:
            material.codigo,

        itemNombre:
            material.detalle,

        cantidad:

            anterior === null

            ?

            stock

            :

            stock
            -
            Number(
                anterior
            ),

        unidad:
            material.unidad,

        stockAnterior:
            anterior,

        stockNuevo:
            stock

    });


    registrarActividad(

        "Inventario",

        "Stock de "
        +
        material.detalle
        +
        " actualizado de "
        +
        (
            anterior
            ??
            "sin conteo"
        )
        +
        " a "
        +
        stock
        +
        " "
        +
        material.unidad

    );


    persist();

    closeModal(
        "modalStock"
    );

    renderAll();

}


// ======================================================
// NUEVO MATERIAL
// ======================================================

function openMaterialModal() {

    cargarSelectProveedores(
        "f_mat_proveedor"
    );


    document
        .getElementById(
            "f_mat_detalle"
        )
        .value =
        "";


    document
        .getElementById(
            "f_mat_precio"
        )
        .value =
        "";


    openModal(
        "modalMaterial"
    );

}


// ======================================================
// GUARDAR MATERIAL
// ======================================================

function saveMaterial() {

    const detalle =

        document
            .getElementById(
                "f_mat_detalle"
            )
            .value
            .trim();


    if (
        !detalle
    ) {

        alert(
            "Ingresa el nombre del material."
        );

        return;

    }


    const siguiente =

        db.materiales
            .reduce(

                (
                    maximo,
                    item
                ) => {

                    const match =
                        String(
                            item.codigo
                        )
                        .match(
                            /^MAT-(\d+)$/
                        );


                    return match

                    ?

                    Math.max(
                        maximo,
                        Number(
                            match[1]
                        )
                    )

                    :

                    maximo;

                },

                0

            )
        +
        1;


    const material = {

        codigo:

            "MAT-"

            +

            String(
                siguiente
            )
            .padStart(
                4,
                "0"
            ),

        tipo:

            document
                .getElementById(
                    "f_mat_tipo"
                )
                .value,

        detalle:
            detalle,

        proveedor:

            document
                .getElementById(
                    "f_mat_proveedor"
                )
                .value,

        unidad:

            document
                .getElementById(
                    "f_mat_unidad"
                )
                .value,

        ultimoPrecio:

            Number(

                document
                    .getElementById(
                        "f_mat_precio"
                    )
                    .value

                ||

                0

            ),

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"

    };


    db.materiales.push(
        material
    );


    registrarActividad(

        "Inventario",

        "Material creado: "
        +
        material.codigo
        +
        " · "
        +
        material.detalle

    );


    persist();

    closeModal(
        "modalMaterial"
    );

    renderAll();

}


// ======================================================
// SELECT PRODUCTO PRENDA
// ======================================================

function cargarSelectProductoStockPrenda() {

    const select =

        document
            .getElementById(
                "f_prenda_producto"
            );


    if (
        !select
    ) {

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


    cargarTallasStockPrenda();

}


// ======================================================
// TALLAS INDIVIDUALES
// ======================================================

function cargarTallasStockPrenda() {

    const productoId =

        document
            .getElementById(
                "f_prenda_producto"
            )
            ?.value;


    const producto =

        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const select =

        document
            .getElementById(
                "f_prenda_talla"
            );


    if (
        !producto
        ||
        !select
    ) {

        return;

    }


    const tallas =
        obtenerTallasProducto(
            producto
        );


    select.innerHTML =

        tallas
            .map(

                talla => `

                    <option
                        value="${talla}"
                    >

                        ${talla}

                    </option>

                `

            )
            .join("");


    cargarStockPrendaExistente();

}


// ======================================================
// CARGAR STOCK EXISTENTE
// ======================================================

function cargarStockPrendaExistente() {

    const productoId =

        document
            .getElementById(
                "f_prenda_producto"
            )
            ?.value;


    const talla =

        document
            .getElementById(
                "f_prenda_talla"
            )
            ?.value;


    const registro =

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


    document
        .getElementById(
            "f_prenda_stock"
        )
        .value =

        registro?.stock
        ??
        "";


    document
        .getElementById(
            "f_prenda_minimo"
        )
        .value =

        registro?.stockMinimo
        ??
        "";


    document
        .getElementById(
            "f_prenda_objetivo"
        )
        .value =

        registro?.stockObjetivo
        ??
        "";

}


// ======================================================
// EVENTOS PRENDA
// ======================================================

document
    .getElementById(
        "f_prenda_producto"
    )
    ?.addEventListener(

        "change",

        cargarTallasStockPrenda

    );


document
    .getElementById(
        "f_prenda_talla"
    )
    ?.addEventListener(

        "change",

        cargarStockPrendaExistente

    );


// ======================================================
// ABRIR MODAL PRENDA
// ======================================================

function openStockPrendaModal() {

    cargarSelectProductoStockPrenda();

    openModal(
        "modalStockPrenda"
    );

}


// ======================================================
// GUARDAR STOCK PRENDA
// ======================================================

function saveStockPrenda() {

    const productoId =

        document
            .getElementById(
                "f_prenda_producto"
            )
            .value;


    const talla =

        document
            .getElementById(
                "f_prenda_talla"
            )
            .value;


    const stockRaw =

        document
            .getElementById(
                "f_prenda_stock"
            )
            .value;


    if (
        stockRaw === ""
    ) {

        alert(
            "Ingresa el stock de la talla."
        );

        return;

    }


    const stock =
        Number(
            stockRaw
        );


    const minimoRaw =

        document
            .getElementById(
                "f_prenda_minimo"
            )
            .value;


    const objetivoRaw =

        document
            .getElementById(
                "f_prenda_objetivo"
            )
            .value;


    const minimo =

        minimoRaw === ""

        ?

        null

        :

        Number(
            minimoRaw
        );


    const objetivo =

        objetivoRaw === ""

        ?

        null

        :

        Number(
            objetivoRaw
        );


    if (
        !Number.isFinite(
            stock
        )
        ||
        stock < 0
    ) {

        alert(
            "El stock debe ser válido."
        );

        return;

    }


    let registro =

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


    const anterior =

        registro

        ?

        Number(
            registro.stock
            ||
            0
        )

        :

        null;


    if (
        !registro
    ) {

        registro = {

            id:
                "STP-"
                +
                Date.now(),

            productoId:
                productoId,

            talla:
                talla,

            stock:
                stock,

            stockMinimo:
                minimo,

            stockObjetivo:
                objetivo

        };


        db.stockPrendas.push(
            registro
        );

    }

    else {

        registro.stock =
            stock;

        registro.stockMinimo =
            minimo;

        registro.stockObjetivo =
            objetivo;

    }


    const producto =

        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    registrarMovimientoInventario({

        tipo:
            "Ajuste manual",

        categoria:
            "Prenda terminada",

        referencia:
            "Conteo / ajuste",

        itemCodigo:
            productoId,

        itemNombre:

            (
                producto?.nombre
                ||
                productoId
            )

            +
            " · Talla "
            +
            talla,

        cantidad:

            anterior === null

            ?

            stock

            :

            stock
            -
            anterior,

        unidad:
            "unidades",

        stockAnterior:
            anterior,

        stockNuevo:
            stock

    });


    registrarActividad(

        "Inventario",

        (
            producto?.nombre
            ||
            productoId
        )

        +
        " talla "
        +
        talla
        +
        ": "
        +
        (
            anterior
            ??
            "sin conteo"
        )
        +
        " → "
        +
        stock

    );


    persist();

    closeModal(
        "modalStockPrenda"
    );

    renderAll();

}


// ======================================================
// REPOSICIÓN
// ======================================================

function sugerenciaReposicion(
    stock,
    objetivo
) {

    if (
        stock === null
        ||
        stock === undefined
        ||
        objetivo === null
        ||
        objetivo === undefined
        ||
        objetivo === ""
    ) {

        return null;

    }


    return Math.max(

        0,

        Number(
            objetivo
        )
        -
        Number(
            stock
        )

    );

}


// ======================================================
// DETECTAR REGISTRO ANTIGUO AGRUPADO
// ======================================================

function tallaPareceAgrupada(
    talla
) {

    return String(
        talla
    )
    .includes(
        "-"
    );

}


// ======================================================
// RENDER INVENTARIO
// ======================================================

function renderInventario() {

    asegurarFiltrosInventario();

    actualizarFiltroBodegas();


    const texto =

        document
            .getElementById(
                "inv_filtro_texto"
            )
            ?.value
            .trim()
            .toLowerCase()

        ||

        "";


    const bodegaFiltro =

        document
            .getElementById(
                "inv_filtro_bodega"
            )
            ?.value

        ||

        "";


    const estadoFiltro =

        document
            .getElementById(
                "inv_filtro_estado"
            )
            ?.value

        ||

        "";


    const materialesFiltrados =

        db.materiales.filter(

            material => {

                const estado =
                    estadoStock(

                        material.stock,

                        material.stockMinimo

                    );


                const textoMaterial =

                    [

                        material.codigo,
                        material.tipo,
                        material.detalle,
                        material.proveedor,
                        material.bodega

                    ]
                    .join(
                        " "
                    )
                    .toLowerCase();


                return (

                    (
                        !texto
                        ||
                        textoMaterial.includes(
                            texto
                        )
                    )

                    &&

                    (
                        !bodegaFiltro
                        ||
                        material.bodega ===
                        bodegaFiltro
                    )

                    &&

                    (
                        !estadoFiltro
                        ||
                        estado ===
                        estadoFiltro
                    )

                );

            }

        );


    const materialesConStock =

        db.materiales.filter(

            material =>
                material.stock !==
                null

        );


    const valorMateriales =

        materialesConStock.reduce(

            (
                suma,
                material
            ) =>

                suma

                +

                Number(
                    material.stock
                    ||
                    0
                )

                *

                Number(
                    material.ultimoPrecio
                    ||
                    0
                ),

            0

        );


    const alertas =

        [

            ...db.materiales.map(

                item =>
                    estadoStock(

                        item.stock,

                        item.stockMinimo

                    )

            ),

            ...db.stockPrendas.map(

                item =>
                    estadoStock(

                        item.stock,

                        item.stockMinimo

                    )

            )

        ]
        .filter(

            estado =>

                estado ===
                "Crítico"

                ||

                estado ===
                "Próximo al mínimo"

        )
        .length;


    const sinConteo =

        db.materiales.filter(

            item =>
                item.stock ===
                null

        )
        .length;


    document
        .getElementById(
            "inventarioCards"
        )
        .innerHTML = `

            <div class="card">

                <div class="num">
                    ${db.materiales.length}
                </div>

                <div class="lbl">
                    Materiales
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${db.stockPrendas.length}
                </div>

                <div class="lbl">
                    SKU de prendas
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${alertas}
                </div>

                <div class="lbl">
                    Alertas de stock
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${sinConteo}
                </div>

                <div class="lbl">
                    Materiales sin conteo
                </div>

            </div>


            <div class="card">

                <div class="num">

                    ${fmtCLP(
                        valorMateriales
                    )}

                </div>

                <div class="lbl">
                    Valor inventario conocido
                </div>

            </div>

        `;


    document
        .getElementById(
            "tablaMateriales"
        )
        .innerHTML =

        materialesFiltrados.length

        ?

        materialesFiltrados
            .map(

                material => {

                    const estado =
                        estadoStock(

                            material.stock,

                            material.stockMinimo

                        );


                    const sugerencia =
                        sugerenciaReposicion(

                            material.stock,

                            material.stockObjetivo

                        );


                    return `

                        <tr data-searchable>

                            <td>
                                ${material.codigo}
                            </td>

                            <td>
                                ${material.tipo}
                            </td>

                            <td>
                                ${material.detalle}
                            </td>

                            <td>
                                ${material.proveedor}
                            </td>

                            <td>

                                ${
                                    material.stock ===
                                    null

                                    ?

                                    "Por levantar"

                                    :

                                    material.stock
                                    +
                                    " "
                                    +
                                    material.unidad
                                }

                            </td>

                            <td>

                                ${
                                    material.stockMinimo
                                    ??
                                    "—"
                                }

                            </td>

                            <td>

                                ${
                                    material.stockObjetivo
                                    ??
                                    "—"
                                }

                            </td>

                            <td>
                                ${material.bodega}
                            </td>

                            <td>

                                <span
                                    class="
                                    pill
                                    ${claseEstadoStock(
                                        estado
                                    )}
                                    "
                                >
                                    ${estado}
                                </span>

                            </td>

                            <td>

                                ${
                                    sugerencia ===
                                    null

                                    ?

                                    "—"

                                    :

                                    sugerencia ===
                                    0

                                    ?

                                    "No requiere"

                                    :

                                    sugerencia
                                    +
                                    " "
                                    +
                                    material.unidad
                                }

                            </td>

                            <td>

                                <button
                                    class="
                                    btn
                                    btn-small
                                    "
                                    onclick="
                                    openStockModal(
                                        '${material.codigo}'
                                    )
                                    "
                                >
                                    Editar
                                </button>

                            </td>

                        </tr>

                    `;

                }

            )
            .join("")

        :

        `

            <tr>

                <td
                    colspan="11"
                    class="empty"
                >
                    No existen materiales
                    para los filtros seleccionados.
                </td>

            </tr>

        `;


    renderStockPrendas();

    renderBodegas();

    renderMovimientosInventario();

}


// ======================================================
// STOCK PRENDAS
// ======================================================

function renderStockPrendas() {

    const tbody =

        document.getElementById(
            "tablaStockPrendas"
        );


    if (
        !tbody
    ) {

        return;

    }


    tbody.innerHTML =

        db.stockPrendas.length

        ?

        db.stockPrendas
            .map(

                item => {

                    const producto =

                        db.productos.find(

                            producto =>
                                producto.id ===
                                item.productoId

                        );


                    const estado =

                        estadoStock(

                            item.stock,

                            item.stockMinimo

                        );


                    const sugerencia =

                        sugerenciaReposicion(

                            item.stock,

                            item.stockObjetivo

                        );


                    const legado =
                        tallaPareceAgrupada(
                            item.talla
                        );


                    return `

                        <tr data-searchable>

                            <td>

                                ${
                                    producto?.establecimiento
                                    ||
                                    "—"
                                }

                            </td>

                            <td>

                                ${
                                    producto?.nombre
                                    ||
                                    item.productoId
                                }

                            </td>

                            <td>

                                ${item.talla}

                                ${
                                    legado

                                    ?

                                    `
                                    <span
                                        class="pill pill-yellow"
                                        title="Registro antiguo con talla agrupada"
                                    >
                                        Revisar
                                    </span>
                                    `

                                    :

                                    ""
                                }

                            </td>

                            <td>
                                ${item.stock}
                            </td>

                            <td>

                                ${
                                    item.stockMinimo
                                    ??
                                    "—"
                                }

                            </td>

                            <td>

                                ${
                                    item.stockObjetivo
                                    ??
                                    "—"
                                }

                            </td>

                            <td>

                                <span
                                    class="
                                    pill
                                    ${claseEstadoStock(
                                        estado
                                    )}
                                    "
                                >

                                    ${estado}

                                </span>

                            </td>

                            <td>

                                ${
                                    sugerencia ===
                                    null

                                    ?

                                    "—"

                                    :

                                    sugerencia ===
                                    0

                                    ?

                                    "No requiere"

                                    :

                                    sugerencia
                                }

                            </td>

                        </tr>

                    `;

                }

            )
            .join("")

        :

        `

            <tr>

                <td
                    colspan="8"
                    class="empty"
                >

                    Todavía no existe
                    un conteo de prendas terminadas.

                </td>

            </tr>

        `;

}


// ======================================================
// BODEGAS
// ======================================================

function renderBodegas() {

    const grid =

        document.getElementById(
            "bodegasGrid"
        );


    if (
        !grid
    ) {

        return;

    }


    grid.innerHTML =

        db.configuracion.bodegas
            .map(

                bodega => {

                    const materiales =

                        db.materiales.filter(

                            item =>
                                item.bodega ===
                                bodega

                        );


                    const conConteo =

                        materiales.filter(

                            item =>
                                item.stock !==
                                null

                        )
                        .length;


                    const alertas =

                        materiales.filter(

                            item => {

                                const estado =

                                    estadoStock(

                                        item.stock,

                                        item.stockMinimo

                                    );


                                return (

                                    estado ===
                                    "Crítico"

                                    ||

                                    estado ===
                                    "Próximo al mínimo"

                                );

                            }

                        )
                        .length;


                    return `

                        <div
                            class="warehouse-card"
                            data-searchable
                        >

                            <h3>
                                ${bodega}
                            </h3>

                            <strong>
                                ${materiales.length}
                            </strong>

                            <span>
                                materiales asignados
                            </span>

                            <div class="warehouse-meta">

                                ${conConteo}
                                con conteo

                                ·

                                ${alertas}
                                alerta(s)

                            </div>

                        </div>

                    `;

                }

            )
            .join("");

}


// ======================================================
// MOVIMIENTOS
// ======================================================

function renderMovimientosInventario() {

    const tbody =

        document.getElementById(
            "tablaMovimientosInventario"
        );


    if (
        !tbody
    ) {

        return;

    }


    tbody.innerHTML =

        db.movimientosInventario.length

        ?

        db.movimientosInventario
            .slice()
            .reverse()
            .slice(
                0,
                150
            )
            .map(

                movimiento => `

                    <tr data-searchable>

                        <td>
                            ${movimiento.codigo}
                        </td>

                        <td>

                            ${movimiento.fecha}

                            ${
                                movimiento.hora
                                ?
                                " · "
                                +
                                movimiento.hora
                                :
                                ""
                            }

                        </td>

                        <td>
                            ${movimiento.tipo}
                        </td>

                        <td>
                            ${movimiento.itemNombre}
                        </td>

                        <td>

                            ${
                                movimiento.cantidad > 0
                                ?
                                "+"
                                :
                                ""
                            }

                            ${movimiento.cantidad}

                            ${movimiento.unidad || ""}

                        </td>

                        <td>

                            ${
                                movimiento.stockAnterior
                                ??
                                "—"
                            }

                        </td>

                        <td>

                            ${
                                movimiento.stockNuevo
                                ??
                                "—"
                            }

                        </td>

                        <td>

                            ${
                                movimiento.referencia
                                ||
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
                    colspan="8"
                    class="empty"
                >
                    Sin movimientos registrados.
                </td>

            </tr>

        `;

}