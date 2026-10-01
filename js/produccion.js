// ======================================================
// PATYCA ERP V6
// PRODUCCIÓN + CONVERSIÓN AUTOMÁTICA DE UNIDADES
// ======================================================

let ultimoCalculoProduccion = null;


// ======================================================
// OBTENER CANTIDAD DE COMPONENTE EN INVENTARIO
// ======================================================

function cantidadInventarioProduccion(
    componente,
    material
) {

    if (
        componente?.cantidadInventario !==
        undefined
        &&
        componente?.cantidadInventario !==
        null
    ) {

        return Number(
            componente.cantidadInventario
        );

    }


    return Number(
        componente?.cantidad
        ||
        0
    );

}


// ======================================================
// CONSUMO CANÓNICO EN KG
// SOLO PARA MATERIALES DE PESO
// ======================================================

function consumoMaterialKg(
    componente,
    material
) {

    const familia =
        familiaUnidadMaterial(
            material
        );


    if (
        familia !== "peso"
    ) {

        return null;

    }


    if (
        componente?.cantidadBase !==
        undefined
        &&
        componente?.cantidadBase !==
        null
        &&
        componente?.unidadBase ===
        "kg"
    ) {

        return Number(
            componente.cantidadBase
        );

    }


    /*
        Compatibilidad con ficha antigua.
    */

    const unidad =
        normalizarUnidadMedida(
            componente?.unidad
            ||
            material?.unidad
        );


    const cantidad =
        Number(
            componente?.cantidad
            ||
            0
        );


    if (
        unidad === "kg"
    ) {

        return cantidad;

    }


    if (
        unidad === "g"
    ) {

        return cantidad / 1000;

    }


    return null;

}


// ======================================================
// CONSUMO EN GRAMOS
// ======================================================

function consumoMaterialEnGramos(
    componente,
    material
) {

    const kg =
        consumoMaterialKg(
            componente,
            material
        );


    if (
        kg === null
    ) {

        return null;

    }


    return kg * 1000;

}


// ======================================================
// IDENTIFICAR TELA
// ======================================================

function materialPareceTela(material) {

    const texto =
        (
            String(
                material?.tipo
                ||
                ""
            )
            +
            " "
            +
            String(
                material?.detalle
                ||
                ""
            )
        )
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );


    return (

        texto.includes("tela")
        ||
        texto.includes("franela")
        ||
        texto.includes("pique")
        ||
        texto.includes("polar")
        ||
        texto.includes("bistretch")
        ||
        texto.includes("crepe")
        ||
        texto.includes("tull")

    );

}


// ======================================================
// CAMPOS AUTOMÁTICOS RENDIMIENTO
// ======================================================

function asegurarCamposFichaProduccion() {

    const pesoInput =
        document.getElementById(
            "prod_peso"
        );


    if (
        !pesoInput
        ||
        document.getElementById(
            "prodFichaInfo"
        )
    ) {

        return;

    }


    const fieldPeso =
        pesoInput.closest(
            ".field"
        );


    if (
        !fieldPeso
    ) {

        return;

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "prodFichaInfo";


    panel.className =
        "panel compact";


    panel.style.marginBottom =
        "16px";


    panel.innerHTML = `

        <div class="panel-title-row">

            <div>

                <span class="eyebrow">
                    FICHA TÉCNICA
                </span>

                <h3>
                    Datos automáticos de la talla
                </h3>

            </div>

            <span
                id="prodFichaEstado"
                class="pill pill-gray"
            >
                Sin seleccionar
            </span>

        </div>


        <div
            id="prodFichaDatos"
            class="results-grid"
        ></div>

    `;


    fieldPeso.insertAdjacentElement(
        "beforebegin",
        panel
    );


    const materialField =
        document.createElement(
            "div"
        );


    materialField.className =
        "field";


    materialField.innerHTML = `

        <label>
            Material analizado
        </label>

        <select
            id="prod_material_ficha"
            onchange="
            actualizarConsumoMaterialProduccion()
            "
        >

            <option value="">
                Selecciona producto y talla
            </option>

        </select>

        <small class="helper-text">

            El consumo se recupera automáticamente
            desde la ficha técnica.

        </small>

    `;


    fieldPeso.insertAdjacentElement(
        "beforebegin",
        materialField
    );


    pesoInput.readOnly =
        true;


    const labelPeso =
        fieldPeso.querySelector(
            "label"
        );


    if (
        labelPeso
    ) {

        labelPeso.textContent =
            "Consumo automático (g/prenda)";

    }


    const fieldPrecio =
        document
            .getElementById(
                "prod_precio"
            )
            ?.closest(
                ".field"
            );


    const labelPrecio =
        fieldPrecio?.querySelector(
            "label"
        );


    if (
        labelPrecio
    ) {

        labelPrecio.textContent =
            "Precio del material ($/kg)";

    }

}


// ======================================================
// CARGAR ESTABLECIMIENTOS
// ======================================================

function cargarSelectProduccion() {

    asegurarCamposFichaProduccion();


    const select =
        document.getElementById(
            "prod_establecimiento"
        );


    if (
        !select
    ) {

        return;

    }


    select.innerHTML =
        db.establecimientos
            .map(

                establecimiento => `

                    <option
                        value="${establecimiento.nombre}"
                    >
                        ${establecimiento.nombre}
                    </option>

                `

            )
            .join("");


    cargarPrendasProduccion();

}


// ======================================================
// CARGAR PRODUCTOS
// ======================================================

function cargarPrendasProduccion() {

    const establecimiento =
        document
            .getElementById(
                "prod_establecimiento"
            )
            ?.value;


    const select =
        document.getElementById(
            "prod_prenda"
        );


    if (
        !select
    ) {

        return;

    }


    const productos =
        db.productos.filter(

            producto =>
                producto.establecimiento ===
                establecimiento

        );


    select.innerHTML =
        productos
            .map(

                producto => `

                    <option
                        value="${producto.id}"
                    >
                        ${producto.nombre}
                    </option>

                `

            )
            .join("");


    cargarTallasProduccion();

}


// ======================================================
// TALLAS
// ======================================================

function cargarTallasProduccion() {

    const producto =
        db.productos.find(

            item =>
                item.id ===
                document
                    .getElementById(
                        "prod_prenda"
                    )
                    ?.value

        );


    const select =
        document.getElementById(
            "prod_talla"
        );


    if (
        !select
    ) {

        return;

    }


    if (
        !producto
    ) {

        select.innerHTML =
            "";

        return;

    }


    select.innerHTML =
        obtenerTallasProducto(
            producto
        )
        .map(

            talla => `

                <option value="${talla}">
                    ${talla}
                </option>

            `

        )
        .join("");


    actualizarDatosFichaProduccion();

}


// ======================================================
// FICHA SELECCIONADA
// ======================================================

function obtenerFichaProduccionSeleccionada() {

    return buscarFichaTecnica(

        document
            .getElementById(
                "prod_prenda"
            )
            ?.value,

        document
            .getElementById(
                "prod_talla"
            )
            ?.value

    );

}


// ======================================================
// MATERIALES DE PESO
// ======================================================

function obtenerMaterialesPesoFicha(ficha) {

    if (
        !ficha
    ) {

        return [];

    }


    return (
        ficha.materiales
        ||
        []
    )
    .map(

        componenteOriginal => {

            const componente =
                normalizarComponenteExistente(
                    componenteOriginal
                );


            const material =
                db.materiales.find(

                    item =>
                        item.codigo ===
                        componente.materialCodigo

                );


            return {

                componente:
                    componente,

                material:
                    material,

                gramos:
                    consumoMaterialEnGramos(
                        componente,
                        material
                    )

            };

        }

    )
    .filter(

        item =>
            item.material
            &&
            item.gramos !==
            null

    )
    .sort(

        (
            a,
            b
        ) =>

            Number(
                !materialPareceTela(
                    a.material
                )
            )

            -

            Number(
                !materialPareceTela(
                    b.material
                )
            )

    );

}


// ======================================================
// ACTUALIZAR FICHA
// ======================================================

function actualizarDatosFichaProduccion() {

    asegurarCamposFichaProduccion();


    ultimoCalculoProduccion =
        null;


    const productoId =
        document
            .getElementById(
                "prod_prenda"
            )
            ?.value;


    const talla =
        document
            .getElementById(
                "prod_talla"
            )
            ?.value;


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const ficha =
        obtenerFichaProduccionSeleccionada();


    const estado =
        document.getElementById(
            "prodFichaEstado"
        );


    const datos =
        document.getElementById(
            "prodFichaDatos"
        );


    const selectMaterial =
        document.getElementById(
            "prod_material_ficha"
        );


    const peso =
        document.getElementById(
            "prod_peso"
        );


    if (
        !producto
        ||
        !ficha
    ) {

        if (
            estado
        ) {

            estado.className =
                "pill pill-red";


            estado.textContent =
                "Ficha faltante";

        }


        if (
            datos
        ) {

            datos.innerHTML = `

                <div class="result-card">

                    <span>
                        Producto
                    </span>

                    <strong>
                        ${producto?.nombre || "—"}
                    </strong>

                </div>

                <div class="result-card">

                    <span>
                        Talla
                    </span>

                    <strong>
                        ${talla || "—"}
                    </strong>

                </div>

                <div class="result-card">

                    <span>
                        Estado
                    </span>

                    <strong>
                        Completar ficha técnica
                    </strong>

                </div>

            `;

        }


        if (
            selectMaterial
        ) {

            selectMaterial.innerHTML = `

                <option value="">
                    Sin ficha técnica
                </option>

            `;

        }


        if (
            peso
        ) {

            peso.value =
                "";

        }


        return;

    }


    const materiales =
        obtenerMaterialesPesoFicha(
            ficha
        );


    estado.className =
        materiales.length
        ?
        "pill pill-green"
        :
        "pill pill-yellow";


    estado.textContent =
        materiales.length
        ?
        "Ficha vinculada"
        :
        "Sin consumo por peso";


    datos.innerHTML = `

        <div class="result-card">

            <span>
                Peso total prenda
            </span>

            <strong>

                ${
                    ficha.pesoUnitario

                    ?

                    Number(
                        ficha.pesoUnitario
                    )
                    .toFixed(0)
                    +
                    " g"

                    :

                    "Sin registrar"
                }

            </strong>

        </div>


        <div class="result-card">

            <span>
                Tela principal
            </span>

            <strong>
                ${ficha.tipoTela || "—"}
            </strong>

        </div>


        <div class="result-card">

            <span>
                Color
            </span>

            <strong>
                ${ficha.colorTela || "—"}
            </strong>

        </div>


        <div class="result-card">

            <span>
                Materiales pesables
            </span>

            <strong>
                ${materiales.length}
            </strong>

        </div>

    `;


    if (
        materiales.length
    ) {

        selectMaterial.innerHTML =
            materiales
                .map(

                    item => `

                        <option
                            value="${item.material.codigo}"
                        >

                            ${item.material.detalle}

                            ·

                            ${item.gramos.toFixed(2)}
                            g/prenda

                        </option>

                    `

                )
                .join("");

    }

    else {

        selectMaterial.innerHTML = `

            <option value="">

                No existen consumos en g/kg

            </option>

        `;

    }


    actualizarConsumoMaterialProduccion();

}


// ======================================================
// ACTUALIZAR CONSUMO
// ======================================================

function actualizarConsumoMaterialProduccion() {

    const ficha =
        obtenerFichaProduccionSeleccionada();


    const codigo =
        document
            .getElementById(
                "prod_material_ficha"
            )
            ?.value;


    const pesoInput =
        document.getElementById(
            "prod_peso"
        );


    const precioInput =
        document.getElementById(
            "prod_precio"
        );


    if (
        !ficha
        ||
        !codigo
    ) {

        pesoInput.value =
            "";

        return;

    }


    const componenteOriginal =
        ficha.materiales.find(

            item =>
                item.materialCodigo ===
                codigo

        );


    const componente =
        normalizarComponenteExistente(
            componenteOriginal
        );


    const material =
        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    const gramos =
        consumoMaterialEnGramos(
            componente,
            material
        );


    if (
        gramos === null
    ) {

        pesoInput.value =
            "";

        return;

    }


    pesoInput.value =
        gramos.toFixed(4);


    /*
        Convertimos el precio a $/kg
        para el cálculo de merma.
    */

    const unidadInventario =
        normalizarUnidadMedida(
            material.unidad
        );


    let precioKg =
        null;


    if (
        unidadInventario === "kg"
    ) {

        precioKg =
            Number(
                material.ultimoPrecio
                ||
                0
            );

    }


    if (
        unidadInventario === "g"
    ) {

        precioKg =
            Number(
                material.ultimoPrecio
                ||
                0
            )
            *
            1000;

    }


    precioInput.value =
        precioKg
        ||
        "";

}


// ======================================================
// EVENTOS
// ======================================================

document
    .getElementById(
        "prod_establecimiento"
    )
    ?.addEventListener(

        "change",

        cargarPrendasProduccion

    );


document
    .getElementById(
        "prod_prenda"
    )
    ?.addEventListener(

        "change",

        cargarTallasProduccion

    );


document
    .getElementById(
        "prod_talla"
    )
    ?.addEventListener(

        "change",

        actualizarDatosFichaProduccion

    );


// ======================================================
// CALCULAR RENDIMIENTO
// ======================================================

function calcularProduccion() {

    const productoId =
        document
            .getElementById(
                "prod_prenda"
            )
            .value;


    const talla =
        document
            .getElementById(
                "prod_talla"
            )
            .value;


    const ficha =
        buscarFichaTecnica(
            productoId,
            talla
        );


    if (
        !ficha
    ) {

        alert(
            "Esta talla no tiene ficha técnica."
        );

        return;

    }


    const codigo =
        document
            .getElementById(
                "prod_material_ficha"
            )
            .value;


    const componenteOriginal =
        ficha.materiales.find(

            item =>
                item.materialCodigo ===
                codigo

        );


    const componente =
        normalizarComponenteExistente(
            componenteOriginal
        );


    const material =
        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    const consumoKg =
        consumoMaterialKg(
            componente,
            material
        );


    if (
        consumoKg === null
        ||
        consumoKg <= 0
    ) {

        alert(
            "El material debe tener un consumo registrado en gramos o kilogramos."
        );

        return;

    }


    const consumoGramos =
        consumoKg * 1000;


    const inicial =
        Number(
            document
                .getElementById(
                    "prod_inicial"
                )
                .value
        );


    const sobrante =
        Number(
            document
                .getElementById(
                    "prod_sobrante"
                )
                .value
        );


    const cantidad =
        Number(
            document
                .getElementById(
                    "prod_cantidad"
                )
                .value
        );


    const precioRaw =
        document
            .getElementById(
                "prod_precio"
            )
            .value;


    const precioKg =
        precioRaw === ""
        ?
        null
        :
        Number(precioRaw);


    if (
        inicial <= 0
        ||
        sobrante < 0
        ||
        sobrante > inicial
        ||
        cantidad <= 0
    ) {

        alert(
            "Revisa tela inicial, sobrante y cantidad."
        );

        return;

    }


    const telaUtilizada =
        inicial
        -
        sobrante;


    const telaIncorporada =
        cantidad
        *
        consumoKg;


    if (
        telaIncorporada >
        telaUtilizada
    ) {

        alert(

            "Los datos no son consistentes.\n\n"
            +
            "Consumo ficha: "
            +
            consumoGramos.toFixed(2)
            +
            " g/prenda\n"
            +
            "Tela incorporada: "
            +
            telaIncorporada.toFixed(4)
            +
            " kg\n"
            +
            "Tela utilizada: "
            +
            telaUtilizada.toFixed(4)
            +
            " kg"

        );

        return;

    }


    const merma =
        telaUtilizada
        -
        telaIncorporada;


    const mermaPct =
        merma
        /
        telaUtilizada
        *
        100;


    const aprovechamiento =
        telaIncorporada
        /
        telaUtilizada
        *
        100;


    const rendimiento =
        cantidad
        /
        telaUtilizada;


    const consumoRealKg =
        telaUtilizada
        /
        cantidad;


    const consumoRealGramos =
        consumoRealKg
        *
        1000;


    const diferencia =
        consumoRealGramos
        -
        consumoGramos;


    const costoMerma =
        precioKg !== null
        ?
        merma
        *
        precioKg
        :
        null;


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    ultimoCalculoProduccion = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(
                "PROD",
                db.produccion
            ),

        fecha:
            todayStr(),

        establecimiento:
            producto.establecimiento,

        productoId:
            producto.id,

        prenda:
            producto.nombre,

        talla:
            talla,

        materialCodigo:
            material.codigo,

        material:
            material.detalle,

        cantidad:
            cantidad,

        consumoFichaKg:
            consumoKg,

        consumoFichaGramos:
            consumoGramos,

        telaInicial:
            inicial,

        sobrante:
            sobrante,

        telaUtilizada:
            telaUtilizada,

        pesoProduccion:
            telaIncorporada,

        perdida:
            merma,

        perdidaPct:
            mermaPct,

        aprovechamiento:
            aprovechamiento,

        rendimiento:
            rendimiento,

        consumoRealUnitarioGramos:
            consumoRealGramos,

        diferenciaConsumoGramos:
            diferencia,

        precioTela:
            precioKg,

        costoPerdida:
            costoMerma

    };


    document
        .getElementById(
            "resultadoProduccion"
        )
        .innerHTML = `

            <div class="result-card">

                <span>
                    Consumo ficha
                </span>

                <strong>

                    ${consumoGramos.toFixed(2)}
                    g/prenda

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Equivalencia
                </span>

                <strong>

                    ${consumoKg.toFixed(4)}
                    kg/prenda

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Tela utilizada
                </span>

                <strong>

                    ${telaUtilizada.toFixed(4)}
                    kg

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Tela incorporada
                </span>

                <strong>

                    ${telaIncorporada.toFixed(4)}
                    kg

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Merma
                </span>

                <strong>

                    ${merma.toFixed(4)}
                    kg

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Merma %
                </span>

                <strong>

                    ${mermaPct.toFixed(4)}
                    %

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Aprovechamiento
                </span>

                <strong>

                    ${aprovechamiento.toFixed(4)}
                    %

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Rendimiento
                </span>

                <strong>

                    ${rendimiento.toFixed(4)}
                    prendas/kg

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Consumo real
                </span>

                <strong>

                    ${consumoRealGramos.toFixed(2)}
                    g/prenda

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Diferencia vs ficha
                </span>

                <strong>

                    ${
                        diferencia >= 0
                        ?
                        "+"
                        :
                        ""
                    }

                    ${diferencia.toFixed(2)}
                    g/prenda

                </strong>

            </div>


            <div class="result-card">

                <span>
                    Costo merma
                </span>

                <strong>

                    ${
                        costoMerma === null

                        ?

                        "Sin precio"

                        :

                        fmtCLP(
                            costoMerma
                        )
                    }

                </strong>

            </div>

        `;

}


// ======================================================
// GUARDAR RENDIMIENTO
// ======================================================

function guardarCalculoProduccion() {

    if (
        !ultimoCalculoProduccion
    ) {

        alert(
            "Primero realiza un cálculo válido."
        );

        return;

    }


    db.produccion.push(
        ultimoCalculoProduccion
    );


    registrarActividad(

        "Producción",

        ultimoCalculoProduccion.codigo
        +
        " · "
        +
        ultimoCalculoProduccion.prenda
        +
        " · "
        +
        ultimoCalculoProduccion.material
        +
        " · merma "
        +
        ultimoCalculoProduccion.perdidaPct.toFixed(2)
        +
        "%",

        {
            referencia:
                ultimoCalculoProduccion.codigo,

            accion:
                "Guardar rendimiento y merma"
        }

    );


    persist();


    ultimoCalculoProduccion =
        null;


    renderAll();

}


// ======================================================
// ======================================================
// ÓRDENES DE PRODUCCIÓN
// ======================================================
// ======================================================


// ======================================================
// PRODUCTOS ORDEN
// ======================================================

function cargarProductosOrden() {

    const select =
        document.getElementById(
            "op_producto"
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


    cargarTallasOrden();

}


// ======================================================
// TALLAS ORDEN
// ======================================================

function cargarTallasOrden() {

    const producto =
        db.productos.find(

            item =>
                item.id ===
                document
                    .getElementById(
                        "op_producto"
                    )
                    ?.value

        );


    const select =
        document.getElementById(
            "op_talla"
        );


    if (
        !select
        ||
        !producto
    ) {

        return;

    }


    select.innerHTML =
        obtenerTallasProducto(
            producto
        )
        .map(

            talla => `

                <option value="${talla}">

                    ${talla}

                </option>

            `

        )
        .join("");

}


// ======================================================
// EVENTO ORDEN
// ======================================================

document
    .getElementById(
        "op_producto"
    )
    ?.addEventListener(

        "change",

        cargarTallasOrden

    );


// ======================================================
// ABRIR ORDEN
// ======================================================

function openOrdenModal() {

    cargarProductosOrden();


    document.getElementById(
        "op_fecha"
    ).value =
        todayStr();


    document.getElementById(
        "op_cantidad"
    ).value =
        "";


    document.getElementById(
        "op_observacion"
    ).value =
        "";


    openModal(
        "modalOrden"
    );

}


// ======================================================
// GUARDAR ORDEN
// ======================================================

function saveOrden() {

    const productoId =
        document
            .getElementById(
                "op_producto"
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
                "op_talla"
            )
            .value;


    const cantidad =
        Number(
            document
                .getElementById(
                    "op_cantidad"
                )
                .value
        );


    if (
        !producto
        ||
        !talla
        ||
        cantidad <= 0
    ) {

        alert(
            "Revisa producto, talla y cantidad."
        );

        return;

    }


    const orden = {

        id:
            Date.now()
            +
            Math.random(),

        codigo:
            nextHumanCode(
                "OP",
                db.ordenesProduccion
            ),

        fecha:
            document
                .getElementById(
                    "op_fecha"
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

        estado:
            "Pendiente",

        observacion:
            document
                .getElementById(
                    "op_observacion"
                )
                .value
                .trim(),

        materialesDescontados:
            false,

        stockIngresado:
            false,

        fechaFinalizacion:
            null

    };


    db.ordenesProduccion.push(
        orden
    );


    persist();

    closeModal(
        "modalOrden"
    );

    renderAll();

}


// ======================================================
// BUSCAR FICHA
// ======================================================

function buscarFichaTecnica(
    productoId,
    talla
) {

    return db.fichasTecnicas.find(

        ficha =>
            ficha.productoId ===
            productoId

            &&

            String(ficha.talla)
            ===
            String(talla)

    );

}


// ======================================================
// REQUERIMIENTOS ORDEN
// ======================================================

function obtenerMaterialesRequeridosOrden(
    orden
) {

    const ficha =
        buscarFichaTecnica(

            orden.productoId,

            orden.talla

        );


    if (
        !ficha
    ) {

        return [];

    }


    return (
        ficha.materiales
        ||
        []
    )
    .map(

        componenteOriginal => {

            const componente =
                normalizarComponenteExistente(
                    componenteOriginal
                );


            const material =
                db.materiales.find(

                    item =>
                        item.codigo ===
                        componente.materialCodigo

                );


            const unitario =
                cantidadInventarioProduccion(

                    componente,

                    material

                );


            const total =
                unitario
                *
                Number(
                    orden.cantidad
                );


            return {

                materialCodigo:
                    componente.materialCodigo,

                materialNombre:
                    material?.detalle
                    ||
                    componente.materialCodigo,

                cantidadUnitario:
                    unitario,

                cantidadTotal:
                    total,

                unidad:
                    material?.unidad
                    ||
                    "",

                ultimoPrecio:
                    Number(
                        material?.ultimoPrecio
                        ||
                        0
                    ),

                costoEstimado:
                    total
                    *
                    Number(
                        material?.ultimoPrecio
                        ||
                        0
                    ),

                entradaTexto:

                    componente.cantidadEntrada !==
                    undefined

                    ?

                    componente.cantidadEntrada
                    +
                    " "
                    +
                    componente.unidadEntrada

                    :

                    unitario
                    +
                    " "
                    +
                    material?.unidad

            };

        }

    );

}


// ======================================================
// VALIDAR MATERIALES
// ======================================================

function validarMaterialesOrden(
    orden
) {

    const materiales =
        obtenerMaterialesRequeridosOrden(
            orden
        );


    if (
        !materiales.length
    ) {

        return {

            ok:
                false,

            mensaje:
                "La ficha técnica no tiene materiales definidos."

        };

    }


    const problemas =
        [];


    materiales.forEach(

        requerido => {

            const material =
                db.materiales.find(

                    item =>
                        item.codigo ===
                        requerido.materialCodigo

                );


            if (
                !material
            ) {

                problemas.push(
                    requerido.materialNombre
                    +
                    ": no encontrado"
                );

                return;

            }


            if (
                material.stock ===
                null
                ||
                material.stock ===
                undefined
            ) {

                problemas.push(
                    material.detalle
                    +
                    ": sin conteo físico"
                );

                return;

            }


            if (
                Number(material.stock)
                <
                requerido.cantidadTotal
            ) {

                problemas.push(

                    material.detalle
                    +
                    ": requiere "
                    +
                    requerido.cantidadTotal.toFixed(4)
                    +
                    " "
                    +
                    material.unidad
                    +
                    " y existen "
                    +
                    Number(material.stock).toFixed(4)

                );

            }

        }

    );


    return {

        ok:
            problemas.length ===
            0,

        mensaje:
            problemas.join(
                "\n"
            )

    };

}


// ======================================================
// DESCONTAR MATERIALES
// ======================================================

function descontarMaterialesOrden(
    orden
) {

    const materiales =
        obtenerMaterialesRequeridosOrden(
            orden
        );


    materiales.forEach(

        requerido => {

            const material =
                db.materiales.find(

                    item =>
                        item.codigo ===
                        requerido.materialCodigo

                );


            const anterior =
                Number(
                    material.stock
                );


            material.stock =
                anterior
                -
                requerido.cantidadTotal;


            registrarMovimientoInventario({

                tipo:
                    "Consumo producción",

                categoria:
                    "Material",

                referencia:
                    orden.codigo,

                itemCodigo:
                    material.codigo,

                itemNombre:
                    material.detalle,

                cantidad:
                    -requerido.cantidadTotal,

                unidad:
                    material.unidad,

                stockAnterior:
                    anterior,

                stockNuevo:
                    material.stock

            });

        }

    );


    orden.materialesDescontados =
        true;

}


// ======================================================
// INGRESAR PRENDA
// ======================================================

function ingresarStockOrden(
    orden
) {

    let stock =
        obtenerRegistroStockPrenda(

            orden.productoId,

            orden.talla

        );


    if (
        !stock
    ) {

        stock = {

            id:
                "STP-"
                +
                Date.now(),

            productoId:
                orden.productoId,

            talla:
                orden.talla,

            stock:
                0,

            stockMinimo:
                null,

            stockObjetivo:
                null

        };


        db.stockPrendas.push(
            stock
        );

    }


    stock.stock =
        Number(
            stock.stock
            ||
            0
        )
        +
        Number(
            orden.cantidad
        );


    orden.stockIngresado =
        true;

}


// ======================================================
// CAMBIAR ESTADO
// ======================================================

function cambiarEstadoOrden(
    id,
    estadoNuevo
) {

    const orden =
        db.ordenesProduccion.find(

            item =>
                item.id === id

        );


    if (
        !orden
    ) {

        return;

    }


    if (
        orden.estado ===
        "Finalizado"
    ) {

        alert(
            "La orden ya se encuentra finalizada."
        );

        renderAll();

        return;

    }


    if (
        estadoNuevo !==
        "Finalizado"
    ) {

        orden.estado =
            estadoNuevo;


        persist();

        renderAll();

        return;

    }


    const validacion =
        validarMaterialesOrden(
            orden
        );


    if (
        !validacion.ok
    ) {

        alert(

            "No se puede finalizar.\n\n"
            +
            validacion.mensaje

        );

        renderAll();

        return;

    }


    const materiales =
        obtenerMaterialesRequeridosOrden(
            orden
        );


    const resumen =
        materiales
            .map(

                item =>

                    "• "
                    +
                    item.materialNombre
                    +
                    ": "
                    +
                    item.cantidadTotal.toFixed(4)
                    +
                    " "
                    +
                    item.unidad

            )
            .join(
                "\n"
            );


    if (
        !confirm(

            "¿Finalizar "
            +
            orden.codigo
            +
            "?\n\n"
            +
            resumen

        )
    ) {

        renderAll();

        return;

    }


    if (
        !orden.materialesDescontados
    ) {

        descontarMaterialesOrden(
            orden
        );

    }


    if (
        !orden.stockIngresado
    ) {

        ingresarStockOrden(
            orden
        );

    }


    orden.estado =
        "Finalizado";


    orden.fechaFinalizacion =
        todayStr();


    persist();

    renderAll();

}


// ======================================================
// SLUG ESTADO
// ======================================================

function slugEstado(texto) {

    return String(
        texto || ""
    )
    .toLowerCase()
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .replace(
        /\s+/g,
        "-"
    );

}


// ======================================================
// IMPRIMIR ORDEN
// ======================================================

function imprimirOrdenProduccion(id) {

    const orden =
        db.ordenesProduccion.find(

            item =>
                item.id === id

        );


    if (
        !orden
    ) {

        return;

    }


    const ficha =
        buscarFichaTecnica(
            orden.productoId,
            orden.talla
        );


    const materiales =
        obtenerMaterialesRequeridosOrden(
            orden
        );


    const filas =
        materiales
            .map(

                item => `

                    <tr>

                        <td>
                            ${item.materialNombre}
                        </td>

                        <td>
                            ${item.entradaTexto}
                        </td>

                        <td>

                            ${item.cantidadUnitario.toFixed(4)}
                            ${item.unidad}

                        </td>

                        <td>

                            ${item.cantidadTotal.toFixed(4)}
                            ${item.unidad}

                        </td>

                        <td>
                            ${fmtCLP(
                                item.costoEstimado
                            )}
                        </td>

                    </tr>

                `

            )
            .join("");


    const ventana =
        window.open(
            "",
            "_blank"
        );


    if (
        !ventana
    ) {

        alert(
            "El navegador bloqueó la impresión."
        );

        return;

    }


    ventana.document.write(`

        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                ${orden.codigo}
            </title>

            <style>

                body {
                    padding: 35px;
                    font-family: Arial, sans-serif;
                    color: #172033;
                }

                .header {
                    display:flex;
                    justify-content:space-between;
                    border-bottom:3px solid #172033;
                }

                table {
                    width:100%;
                    border-collapse:collapse;
                    margin-top:20px;
                }

                th,
                td {
                    padding:8px;
                    border-bottom:1px solid #ddd;
                    text-align:left;
                }

                th {
                    background:#f3f4f6;
                }

                .datos {
                    display:grid;
                    grid-template-columns:repeat(4,1fr);
                    gap:10px;
                    margin-top:20px;
                }

                .dato {
                    border:1px solid #ddd;
                    padding:12px;
                    border-radius:8px;
                }

                .dato span {
                    display:block;
                    color:#667085;
                    font-size:10px;
                }

                @page {
                    size:A4;
                    margin:12mm;
                }

            </style>

        </head>

        <body>

            <div class="header">

                <div>

                    <h1>
                        PATYCA Confecciones
                    </h1>

                    <p>
                        Orden de producción
                    </p>

                </div>

                <h2>
                    ${orden.codigo}
                </h2>

            </div>


            <h2>
                ${orden.producto}
            </h2>


            <div class="datos">

                <div class="dato">

                    <span>Talla</span>

                    <strong>
                        ${orden.talla}
                    </strong>

                </div>

                <div class="dato">

                    <span>Cantidad</span>

                    <strong>
                        ${orden.cantidad}
                    </strong>

                </div>

                <div class="dato">

                    <span>Peso prenda</span>

                    <strong>

                        ${
                            ficha?.pesoUnitario

                            ?

                            Number(
                                ficha.pesoUnitario
                            )
                            .toFixed(0)
                            +
                            " g"

                            :

                            "—"
                        }

                    </strong>

                </div>

                <div class="dato">

                    <span>Estado</span>

                    <strong>
                        ${orden.estado}
                    </strong>

                </div>

            </div>


            <h3>
                Materiales
            </h3>


            <table>

                <thead>

                    <tr>

                        <th>
                            Material
                        </th>

                        <th>
                            Ingreso ficha
                        </th>

                        <th>
                            Consumo inventario
                        </th>

                        <th>
                            Total orden
                        </th>

                        <th>
                            Costo
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${filas}

                </tbody>

            </table>


            <script>

                window.onload = function() {

                    window.print();

                };

            <\/script>

        </body>

        </html>

    `);


    ventana.document.close();

}


// ======================================================
// RENDER ÓRDENES
// ======================================================

function renderOrdenes() {

    const tbody =
        document.getElementById(
            "tablaOrdenes"
        );


    const cards =
        document.getElementById(
            "ordenesCards"
        );


    if (
        !tbody
        ||
        !cards
    ) {

        return;

    }


    const abiertas =
        db.ordenesProduccion.filter(

            item =>
                item.estado !==
                "Finalizado"

        );


    const terminadas =
        db.ordenesProduccion.filter(

            item =>
                item.estado ===
                "Finalizado"

        );


    cards.innerHTML = `

        <div class="card">

            <div class="num">
                ${db.ordenesProduccion.length}
            </div>

            <div class="lbl">
                Órdenes totales
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
                ${terminadas.length}
            </div>

            <div class="lbl">
                Finalizadas
            </div>

        </div>

    `;


    tbody.innerHTML =
        db.ordenesProduccion.length

        ?

        db.ordenesProduccion
            .slice()
            .reverse()
            .map(

                orden => `

                    <tr>

                        <td>
                            ${orden.codigo}
                        </td>

                        <td>
                            ${orden.fecha}
                        </td>

                        <td>
                            ${orden.establecimiento}
                        </td>

                        <td>
                            ${orden.producto}
                        </td>

                        <td>
                            ${orden.talla}
                        </td>

                        <td>
                            ${orden.cantidad}
                        </td>

                        <td>

                            <span
                                class="
                                status-badge
                                status-${slugEstado(
                                    orden.estado
                                )}
                                "
                            >

                                ${orden.estado}

                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                ${
                                    orden.estado !==
                                    "Finalizado"

                                    ?

                                    `

                                    <select

                                        class="inline-select"

                                        onchange="
                                        cambiarEstadoOrden(
                                            ${orden.id},
                                            this.value
                                        )
                                        "

                                    >

                                        ${
                                            [
                                                "Pendiente",
                                                "Corte",
                                                "Confección",
                                                "Terminación",
                                                "Finalizado"
                                            ]
                                            .map(

                                                estado => `

                                                    <option

                                                        value="${estado}"

                                                        ${
                                                            orden.estado === estado
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

                                    :

                                    `

                                    <span class="
                                        pill
                                        pill-green
                                    ">
                                        Cerrada
                                    </span>

                                    `
                                }


                                <button

                                    class="
                                    btn
                                    btn-small
                                    "

                                    onclick="
                                    imprimirOrdenProduccion(
                                        ${orden.id}
                                    )
                                    "

                                >
                                    Imprimir
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
                    colspan="8"
                    class="empty"
                >
                    No existen órdenes.
                </td>

            </tr>

        `;

}


// ======================================================
// RENDER HISTORIAL RENDIMIENTO
// ======================================================

function renderProduccion() {

    asegurarCamposFichaProduccion();


    const tbody =
        document.getElementById(
            "tablaProduccion"
        );


    if (
        !tbody
    ) {

        return;

    }


    tbody.innerHTML =
        db.produccion.length

        ?

        db.produccion
            .slice()
            .reverse()
            .map(

                registro => `

                    <tr>

                        <td>
                            ${registro.codigo || "—"}
                        </td>

                        <td>
                            ${registro.fecha}
                        </td>

                        <td>
                            ${registro.establecimiento}
                        </td>

                        <td>

                            ${registro.prenda}

                            ${
                                registro.material

                                ?

                                `
                                <br>
                                <small>
                                    ${registro.material}
                                </small>
                                `

                                :

                                ""
                            }

                        </td>

                        <td>
                            ${registro.talla}
                        </td>

                        <td>
                            ${registro.cantidad}
                        </td>

                        <td>

                            ${Number(
                                registro.perdidaPct
                                ||
                                0
                            ).toFixed(2)}
                            %

                        </td>

                        <td>

                            ${Number(
                                registro.aprovechamiento
                                ||
                                0
                            ).toFixed(2)}
                            %

                        </td>

                        <td>

                            ${Number(
                                registro.rendimiento
                                ||
                                0
                            ).toFixed(4)}

                        </td>

                        <td>

                            ${
                                registro.costoPerdida ===
                                null
                                ||
                                registro.costoPerdida ===
                                undefined

                                ?

                                "Sin precio"

                                :

                                fmtCLP(
                                    registro.costoPerdida
                                )
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
                    Sin registros.
                </td>

            </tr>

        `;

}