// ======================================================
// PATYCA ERP V6
// CATÁLOGO + FICHA TÉCNICA + CONVERSIÓN AUTOMÁTICA
// ======================================================

let establecimientoSeleccionado = null;
let tipoCatalogoActivo = null;
let productoCatalogoActivoId = null;

let productoDetalleActual = null;
let fichaTecnicaTemporal = null;


// ======================================================
// PERMISOS
// ======================================================

function puedeEditarFichaTecnica() {

    return (
        usuarioActivo?.rol === "Administradora"
        &&
        typeof tienePermiso === "function"
        &&
        tienePermiso("catalogo")
    );

}


// ======================================================
// NORMALIZAR UNIDADES
// ======================================================

function normalizarUnidadMedida(unidad) {

    const texto =
        String(unidad || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );


    if (
        [
            "kg",
            "kilo",
            "kilos",
            "kilogramo",
            "kilogramos"
        ].includes(texto)
    ) {

        return "kg";

    }


    if (
        [
            "g",
            "gr",
            "gramo",
            "gramos"
        ].includes(texto)
    ) {

        return "g";

    }


    if (
        [
            "m",
            "metro",
            "metros"
        ].includes(texto)
    ) {

        return "m";

    }


    if (
        [
            "cm",
            "centimetro",
            "centimetros"
        ].includes(texto)
    ) {

        return "cm";

    }


    if (
        [
            "unidad",
            "unidades",
            "un",
            "u",
            "pieza",
            "piezas",
            "pza"
        ].includes(texto)
    ) {

        return "unidad";

    }


    return texto;

}


// ======================================================
// FAMILIA DE UNIDAD
// ======================================================

function familiaUnidadMaterial(material) {

    const unidad =
        normalizarUnidadMedida(
            material?.unidad
        );


    if (
        unidad === "kg"
        ||
        unidad === "g"
    ) {

        return "peso";

    }


    if (
        unidad === "m"
        ||
        unidad === "cm"
    ) {

        return "longitud";

    }


    return "unidad";

}


// ======================================================
// UNIDAD BASE DEL ERP
// ======================================================

function unidadBaseMaterial(material) {

    const familia =
        familiaUnidadMaterial(
            material
        );


    if (
        familia === "peso"
    ) {

        return "kg";

    }


    if (
        familia === "longitud"
    ) {

        return "m";

    }


    return "unidad";

}


// ======================================================
// UNIDADES PERMITIDAS
// ======================================================

function unidadesPermitidasMaterial(material) {

    const familia =
        familiaUnidadMaterial(
            material
        );


    if (
        familia === "peso"
    ) {

        return [
            "g",
            "kg"
        ];

    }


    if (
        familia === "longitud"
    ) {

        return [
            "cm",
            "m"
        ];

    }


    return [
        "unidad"
    ];

}


// ======================================================
// ETIQUETA UNIDAD
// ======================================================

function etiquetaUnidad(unidad) {

    const normalizada =
        normalizarUnidadMedida(
            unidad
        );


    const etiquetas = {

        g:
            "gramos",

        kg:
            "kilogramos",

        cm:
            "centímetros",

        m:
            "metros",

        unidad:
            "unidad"

    };


    return etiquetas[normalizada]
        ||
        unidad;

}


// ======================================================
// CONVERTIR A UNIDAD BASE
//
// PESO       -> kg
// LONGITUD   -> m
// CONTEO     -> unidad
// ======================================================

function convertirAUnidadBase(
    valor,
    unidad
) {

    const numero =
        Number(valor);


    const u =
        normalizarUnidadMedida(
            unidad
        );


    if (
        !Number.isFinite(numero)
    ) {

        return null;

    }


    if (
        u === "g"
    ) {

        return numero / 1000;

    }


    if (
        u === "kg"
    ) {

        return numero;

    }


    if (
        u === "cm"
    ) {

        return numero / 100;

    }


    if (
        u === "m"
    ) {

        return numero;

    }


    if (
        u === "unidad"
    ) {

        return numero;

    }


    return null;

}


// ======================================================
// CONVERTIR DESDE UNIDAD BASE
// ======================================================

function convertirDesdeUnidadBase(
    valorBase,
    unidadDestino
) {

    const numero =
        Number(valorBase);


    const u =
        normalizarUnidadMedida(
            unidadDestino
        );


    if (
        !Number.isFinite(numero)
    ) {

        return null;

    }


    if (
        u === "g"
    ) {

        return numero * 1000;

    }


    if (
        u === "kg"
    ) {

        return numero;

    }


    if (
        u === "cm"
    ) {

        return numero * 100;

    }


    if (
        u === "m"
    ) {

        return numero;

    }


    if (
        u === "unidad"
    ) {

        return numero;

    }


    return null;

}


// ======================================================
// CONVERTIR ENTRE UNIDADES
// ======================================================

function convertirUnidad(
    valor,
    unidadOrigen,
    unidadDestino
) {

    const base =
        convertirAUnidadBase(
            valor,
            unidadOrigen
        );


    if (
        base === null
    ) {

        return null;

    }


    return convertirDesdeUnidadBase(
        base,
        unidadDestino
    );

}


// ======================================================
// CANTIDAD EQUIVALENTE EN UNIDAD DE INVENTARIO
// ======================================================

function convertirAUnidadInventario(
    valor,
    unidadEntrada,
    material
) {

    const base =
        convertirAUnidadBase(
            valor,
            unidadEntrada
        );


    if (
        base === null
    ) {

        return null;

    }


    const unidadInventario =
        normalizarUnidadMedida(
            material?.unidad
        );


    return convertirDesdeUnidadBase(

        base,

        unidadInventario

    );

}


// ======================================================
// COMPONENTE NORMALIZADO
// ======================================================

function crearComponenteNormalizado(
    material,
    valor,
    unidadEntrada
) {

    const cantidad =
        Number(valor);


    const unidad =
        normalizarUnidadMedida(
            unidadEntrada
        );


    const cantidadBase =
        convertirAUnidadBase(
            cantidad,
            unidad
        );


    const unidadBase =
        unidadBaseMaterial(
            material
        );


    const cantidadInventario =
        convertirAUnidadInventario(

            cantidad,
            unidad,
            material

        );


    return {

        materialCodigo:
            material.codigo,

        // Lo que escribió Patricia
        cantidadEntrada:
            cantidad,

        unidadEntrada:
            unidad,

        // Cantidad normalizada
        cantidadBase:
            cantidadBase,

        unidadBase:
            unidadBase,

        // Cantidad compatible con inventario
        cantidadInventario:
            cantidadInventario,

        unidadInventario:
            normalizarUnidadMedida(
                material.unidad
            ),

        // Compatibilidad con fichas anteriores
        cantidad:
            cantidadInventario,

        unidad:
            material.unidad

    };

}


// ======================================================
// LEER COMPONENTES ANTIGUOS Y NUEVOS
// ======================================================

function normalizarComponenteExistente(
    componente
) {

    const material =
        db.materiales.find(

            item =>
                item.codigo ===
                componente.materialCodigo

        );


    if (
        !material
    ) {

        return componente;

    }


    if (
        componente.cantidadBase !== undefined
        &&
        componente.cantidadInventario !== undefined
    ) {

        return componente;

    }


    const unidadAnterior =
        componente.unidad
        ||
        material.unidad;


    return crearComponenteNormalizado(

        material,

        Number(
            componente.cantidad
            ||
            0
        ),

        unidadAnterior

    );

}


// ======================================================
// CANTIDAD DE INVENTARIO POR PRENDA
// ======================================================

function cantidadInventarioComponente(
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
// PESO A GRAMOS
// ======================================================

function pesoAGramos(
    valor,
    unidad
) {

    const baseKg =
        convertirAUnidadBase(
            valor,
            unidad
        );


    if (
        baseKg === null
    ) {

        return null;

    }


    return baseKg * 1000;

}


// ======================================================
// TEXTO EQUIVALENCIA
// ======================================================

function textoEquivalencia(
    valor,
    unidad
) {

    const u =
        normalizarUnidadMedida(
            unidad
        );


    const base =
        convertirAUnidadBase(
            valor,
            u
        );


    if (
        base === null
        ||
        !Number.isFinite(base)
    ) {

        return "—";

    }


    if (
        u === "g"
    ) {

        return (
            base.toFixed(4)
            +
            " kg"
        );

    }


    if (
        u === "kg"
    ) {

        return (
            (
                base * 1000
            )
            .toFixed(2)
            +
            " g"
        );

    }


    if (
        u === "cm"
    ) {

        return (
            base.toFixed(4)
            +
            " m"
        );

    }


    if (
        u === "m"
    ) {

        return (
            (
                base * 100
            )
            .toFixed(2)
            +
            " cm"
        );

    }


    return (
        base
        +
        " unidad"
    );

}


// ======================================================
// UTILIDADES CATÁLOGO
// ======================================================

function normalizarTextoCatalogo(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );

}


function valorFicha(
    valor,
    sufijo = ""
) {

    if (
        valor === null
        ||
        valor === undefined
        ||
        valor === ""
    ) {

        return "—";

    }


    return `${valor}${sufijo}`;

}


// ======================================================
// TIPO PRODUCTO
// ======================================================

function tipoProductoCatalogo(producto) {

    const nombre =
        normalizarTextoCatalogo(
            producto?.nombre
        );


    if (
        nombre.includes("polera")
        ||
        nombre.includes("polo")
        ||
        nombre.includes("pique")
    ) {

        return "Polera";

    }


    if (
        nombre.includes("poleron")
        ||
        nombre.includes("polar")
        ||
        nombre.includes("sweater")
        ||
        nombre.includes("buzo")
        ||
        nombre.includes("veston")
        ||
        nombre.includes("blazer")
    ) {

        return "Polerón";

    }


    if (
        nombre.includes("pantalon")
        ||
        nombre.includes("falda")
        ||
        nombre.includes("calza")
        ||
        nombre.includes("short")
    ) {

        return "Pantalón";

    }


    return "Otros";

}


function ordenTipoCatalogo(tipo) {

    const orden = {

        Polera: 1,
        "Polerón": 2,
        "Pantalón": 3,
        Otros: 4

    };


    return orden[tipo]
        ||
        99;

}


// ======================================================
// PRODUCTOS ESTABLECIMIENTO
// ======================================================

function productosDeEstablecimiento(nombre) {

    return db.productos.filter(

        producto =>
            producto.establecimiento ===
            nombre

    );

}


function tiposDisponiblesEstablecimiento(nombre) {

    return [

        ...new Set(

            productosDeEstablecimiento(nombre)
                .map(

                    producto =>
                        tipoProductoCatalogo(
                            producto
                        )

                )

        )

    ]
    .sort(

        (
            a,
            b
        ) =>

            ordenTipoCatalogo(a)
            -
            ordenTipoCatalogo(b)

    );

}


// ======================================================
// STOCK
// ======================================================

function obtenerRegistroStockPrenda(
    productoId,
    talla
) {

    return db.stockPrendas.find(

        item =>
            item.productoId ===
            productoId

            &&

            String(item.talla)
            ===
            String(talla)

    );

}


function totalUnidadesProducto(producto) {

    return db.stockPrendas
        .filter(

            item =>
                item.productoId ===
                producto.id

        )
        .reduce(

            (
                suma,
                item
            ) =>

                suma
                +
                Number(
                    item.stock
                    ||
                    0
                ),

            0

        );

}


function totalPrendasEstablecimiento(nombre) {

    const ids =
        productosDeEstablecimiento(nombre)
            .map(
                producto =>
                    producto.id
            );


    return db.stockPrendas
        .filter(
            item =>
                ids.includes(
                    item.productoId
                )
        )
        .reduce(

            (
                suma,
                item
            ) =>

                suma
                +
                Number(
                    item.stock
                    ||
                    0
                ),

            0

        );

}


// ======================================================
// PRECIO
// ======================================================

function precioDesdeProducto(producto) {

    const precios =
        obtenerTallasProducto(producto)
            .map(

                talla =>
                    Number(

                        precioParaTalla(
                            producto,
                            talla
                        )

                        ||

                        0

                    )

            )
            .filter(
                precio =>
                    precio > 0
            );


    return precios.length
        ?
        Math.min(...precios)
        :
        0;

}


// ======================================================
// BADGES
// ======================================================

function claseBadgeStockCatalogo(
    stock,
    minimo
) {

    const valor =
        Number(
            stock
            ||
            0
        );


    if (
        valor <= 0
    ) {

        return "bad";

    }


    if (
        minimo !== null
        &&
        minimo !== undefined
        &&
        valor <= Number(minimo)
    ) {

        return "warn";

    }


    if (
        valor <= 10
    ) {

        return "warn";

    }


    return "good";

}


function textoBadgeStockCatalogo(
    stock,
    minimo
) {

    const valor =
        Number(
            stock
            ||
            0
        );


    if (
        valor <= 0
    ) {

        return "Sin stock";

    }


    if (
        (
            minimo !== null
            &&
            minimo !== undefined
            &&
            valor <= Number(minimo)
        )
        ||
        valor <= 10
    ) {

        return `Quedan ${valor}`;

    }


    return `${valor} disponibles`;

}


// ======================================================
// SELECCIÓN
// ======================================================

function asegurarSeleccionCatalogo() {

    if (
        !db.establecimientos.length
    ) {

        establecimientoSeleccionado =
            null;

        tipoCatalogoActivo =
            null;

        productoCatalogoActivoId =
            null;

        return;

    }


    if (
        !establecimientoSeleccionado
        ||
        !db.establecimientos.some(

            item =>
                item.nombre ===
                establecimientoSeleccionado

        )
    ) {

        establecimientoSeleccionado =
            db.establecimientos[0]
                .nombre;

    }


    const tipos =
        tiposDisponiblesEstablecimiento(
            establecimientoSeleccionado
        );


    if (
        !tipos.length
    ) {

        return;

    }


    if (
        !tipos.includes(
            tipoCatalogoActivo
        )
    ) {

        tipoCatalogoActivo =
            tipos[0];

    }


    const productos =
        productosDeEstablecimiento(
            establecimientoSeleccionado
        )
        .filter(

            producto =>
                tipoProductoCatalogo(
                    producto
                )
                ===
                tipoCatalogoActivo

        );


    if (
        !productos.some(
            producto =>
                producto.id ===
                productoCatalogoActivoId
        )
    ) {

        productoCatalogoActivoId =
            productos[0]?.id
            ||
            null;

    }

}


function seleccionarEstablecimiento(nombre) {

    establecimientoSeleccionado =
        nombre;


    const tipos =
        tiposDisponiblesEstablecimiento(
            nombre
        );


    tipoCatalogoActivo =
        tipos[0]
        ||
        null;


    const productos =
        productosDeEstablecimiento(nombre)
            .filter(

                producto =>
                    tipoProductoCatalogo(
                        producto
                    )
                    ===
                    tipoCatalogoActivo

            );


    productoCatalogoActivoId =
        productos[0]?.id
        ||
        null;


    renderCatalogo();

}


function seleccionarTipoCatalogo(tipo) {

    tipoCatalogoActivo =
        tipo;


    const productos =
        productosDeEstablecimiento(
            establecimientoSeleccionado
        )
        .filter(

            producto =>
                tipoProductoCatalogo(
                    producto
                )
                ===
                tipo

        );


    productoCatalogoActivoId =
        productos[0]?.id
        ||
        null;


    renderCatalogo();

}


function seleccionarProductoCatalogo(productoId) {

    productoCatalogoActivoId =
        productoId;


    renderCatalogo();

}


// ======================================================
// IMAGEN
// ======================================================

function renderImagenCatalogo(producto) {

    if (
        producto.imagen
    ) {

        return `

            <img

                src="${producto.imagen}"

                class="catalog-main-image"

                alt="${producto.nombre}"

            >

        `;

    }


    return `

        <div class="catalog-empty-image">

            <div class="catalog-empty-garment">
                ◇
            </div>

            <strong>
                Sin imagen
            </strong>

            <span>
                Sube una fotografía de la prenda
            </span>

        </div>

    `;

}


// ======================================================
// RENDER CATÁLOGO
// ======================================================

function renderCatalogo() {

    const lineas =
        document.getElementById(
            "catalogoLineasGrid"
        );


    const seleccion =
        document.getElementById(
            "catalogoSeleccionActual"
        );


    const grid =
        document.getElementById(
            "catalogoGrid"
        );


    if (
        !lineas
        ||
        !seleccion
        ||
        !grid
    ) {

        return;

    }


    grid.classList.add(
        "catalog-showcase-container"
    );


    asegurarSeleccionCatalogo();


    lineas.innerHTML =
        db.establecimientos
            .map(

                establecimiento => `

                    <button

                        class="
                        selector-card
                        ${
                            establecimientoSeleccionado ===
                            establecimiento.nombre
                            ?
                            "active"
                            :
                            ""
                        }
                        "

                        onclick='
                        seleccionarEstablecimiento(
                            ${JSON.stringify(
                                establecimiento.nombre
                            )}
                        )
                        '

                    >

                        <strong>
                            ${establecimiento.nombre}
                        </strong>

                        <span>

                            ${
                                totalPrendasEstablecimiento(
                                    establecimiento.nombre
                                )
                            }

                            prendas

                        </span>

                    </button>

                `

            )
            .join("");


    seleccion.innerHTML = `

        <div class="selection-box">

            <div>

                <strong>
                    ${establecimientoSeleccionado || "Catálogo"}
                </strong>

                <small>

                    Inventario, precios y ficha técnica por talla

                </small>

            </div>

        </div>

    `;


    const tipos =
        tiposDisponiblesEstablecimiento(
            establecimientoSeleccionado
        );


    const productosTipo =
        productosDeEstablecimiento(
            establecimientoSeleccionado
        )
        .filter(

            producto =>
                tipoProductoCatalogo(producto)
                ===
                tipoCatalogoActivo

        );


    if (
        !productosTipo.length
    ) {

        grid.innerHTML = `

            <div class="empty">

                No hay productos en esta categoría.

            </div>

        `;

        return;

    }


    const producto =
        productosTipo.find(

            item =>
                item.id ===
                productoCatalogoActivoId

        )

        ||

        productosTipo[0];


    productoCatalogoActivoId =
        producto.id;


    const tallas =
        obtenerTallasProducto(
            producto
        );


    const tallasHTML =
        tallas
            .map(

                talla => {

                    const registro =
                        obtenerRegistroStockPrenda(
                            producto.id,
                            talla
                        );


                    const stock =
                        Number(
                            registro?.stock
                            ||
                            0
                        );


                    const precio =
                        precioParaTalla(
                            producto,
                            talla
                        );


                    const ficha =
                        buscarFichaTecnica(
                            producto.id,
                            talla
                        );


                    return `

                        <article class="catalog-size-card">

                            <h3>
                                Talla ${talla}
                            </h3>

                            <div class="catalog-size-price">

                                ${fmtCLP(precio)}

                            </div>


                            <span
                                class="
                                catalog-stock-badge
                                ${
                                    claseBadgeStockCatalogo(
                                        stock,
                                        registro?.stockMinimo ?? null
                                    )
                                }
                                "
                            >

                                ${
                                    textoBadgeStockCatalogo(
                                        stock,
                                        registro?.stockMinimo ?? null
                                    )
                                }

                            </span>


                            <div class="catalog-size-mini-data">

                                <div>

                                    <span>
                                        Peso
                                    </span>

                                    <strong>

                                        ${
                                            ficha?.pesoUnitario

                                            ?

                                            Number(
                                                ficha.pesoUnitario
                                            ).toFixed(0)
                                            +
                                            " g"

                                            :

                                            "—"
                                        }

                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Tela
                                    </span>

                                    <strong>
                                        ${ficha?.tipoTela || "—"}
                                    </strong>

                                </div>

                            </div>


                            <div class="catalog-size-actions">

                                <button

                                    class="catalog-step-btn"

                                    onclick='
                                    ajustarStockRapido(
                                        ${JSON.stringify(producto.id)},
                                        ${JSON.stringify(talla)},
                                        -1
                                    )
                                    '

                                >
                                    −
                                </button>


                                <strong class="catalog-step-value">

                                    ${stock}

                                </strong>


                                <button

                                    class="catalog-step-btn"

                                    onclick='
                                    ajustarStockRapido(
                                        ${JSON.stringify(producto.id)},
                                        ${JSON.stringify(talla)},
                                        1
                                    )
                                    '

                                >
                                    +
                                </button>


                                ${
                                    puedeEditarFichaTecnica()

                                    ?

                                    `

                                    <button

                                        class="
                                        catalog-step-btn
                                        edit
                                        "

                                        title="Editar ficha técnica"

                                        onclick='
                                        abrirEditorFichaTecnica(
                                            ${JSON.stringify(producto.id)},
                                            ${JSON.stringify(talla)}
                                        )
                                        '

                                    >
                                        ✎
                                    </button>

                                    `

                                    :

                                    ""
                                }

                            </div>

                        </article>

                    `;

                }

            )
            .join("");


    const modelosHTML =

        productosTipo.length > 1

        ?

        `

            <div class="catalog-model-section">

                <span class="catalog-section-label">
                    Modelo
                </span>

                <div class="catalog-model-row">

                    ${

                        productosTipo
                            .map(

                                item => `

                                    <button

                                        class="
                                        catalog-model-chip
                                        ${
                                            item.id === producto.id
                                            ?
                                            "active"
                                            :
                                            ""
                                        }
                                        "

                                        onclick='
                                        seleccionarProductoCatalogo(
                                            ${JSON.stringify(item.id)}
                                        )
                                        '

                                    >
                                        ${item.nombre}
                                    </button>

                                `

                            )
                            .join("")

                    }

                </div>

            </div>

        `

        :

        "";


    grid.innerHTML = `

        <div class="catalog-showcase">


            <aside class="catalog-product-panel">

                <div class="catalog-image-wrap">

                    ${renderImagenCatalogo(producto)}

                </div>


                <div class="catalog-product-name">

                    <h2>
                        ${establecimientoSeleccionado}
                    </h2>

                    <p>
                        ${producto.nombre}
                    </p>

                </div>


                <div class="catalog-image-controls">

                    ${
                        puedeEditarFichaTecnica()

                        ?

                        `

                        <label
                            class="
                            btn
                            btn-primary
                            catalog-file-button
                            "
                        >

                            Subir / cambiar imagen

                            <input

                                type="file"

                                accept="
                                image/png,
                                image/jpeg,
                                image/webp
                                "

                                onchange='
                                cargarImagenProductoCatalogo(
                                    event,
                                    ${JSON.stringify(producto.id)}
                                )
                                '

                            >

                        </label>

                        `

                        :

                        ""
                    }


                    <button

                        class="btn"

                        onclick='
                        abrirFichaProducto(
                            ${JSON.stringify(producto.id)}
                        )
                        '

                    >
                        Ver ficha completa
                    </button>

                </div>

            </aside>


            <section class="catalog-data-panel">


                <nav class="catalog-tabs">

                    ${

                        tipos
                            .map(

                                tipo => `

                                    <button

                                        class="
                                        catalog-tab
                                        ${
                                            tipo === tipoCatalogoActivo
                                            ?
                                            "active"
                                            :
                                            ""
                                        }
                                        "

                                        onclick='
                                        seleccionarTipoCatalogo(
                                            ${JSON.stringify(tipo)}
                                        )
                                        '

                                    >

                                        ${tipo}

                                    </button>

                                `

                            )
                            .join("")

                    }

                </nav>


                ${modelosHTML}


                <div class="catalog-summary">


                    <div class="catalog-stat-card">

                        <span>
                            Unidades disponibles
                        </span>

                        <strong>

                            ${totalUnidadesProducto(producto)}

                        </strong>

                    </div>


                    <div class="catalog-stat-card">

                        <span>
                            Precio desde
                        </span>

                        <strong>

                            ${fmtCLP(
                                precioDesdeProducto(producto)
                            )}

                        </strong>

                    </div>


                </div>


                <div class="catalog-sizes-grid">

                    ${tallasHTML}

                </div>


            </section>


        </div>

    `;


    aplicarBusqueda();

}


// ======================================================
// STOCK RÁPIDO
// ======================================================

function ajustarStockRapido(
    productoId,
    talla,
    delta
) {

    if (
        typeof tienePermiso === "function"
        &&
        !tienePermiso("inventario")
    ) {

        alert(
            "No tienes permiso para modificar inventario."
        );

        return;

    }


    let registro =
        obtenerRegistroStockPrenda(
            productoId,
            talla
        );


    if (
        !registro
    ) {

        registro = {

            id:
                "STP-"
                +
                Date.now()
                +
                Math.random(),

            productoId:
                productoId,

            talla:
                talla,

            stock:
                0,

            stockMinimo:
                null,

            stockObjetivo:
                null

        };


        db.stockPrendas.push(
            registro
        );

    }


    const anterior =
        Number(
            registro.stock
            ||
            0
        );


    const nuevo =
        anterior
        +
        Number(delta);


    if (
        nuevo < 0
    ) {

        return;

    }


    registro.stock =
        nuevo;


    persist();

    renderAll();

}


// ======================================================
// IMAGEN
// ======================================================

function cargarImagenProductoCatalogo(
    event,
    productoId
) {

    if (
        !puedeEditarFichaTecnica()
    ) {

        alert(
            "Solo la Administradora puede modificar las imágenes."
        );

        return;

    }


    const archivo =
        event.target.files?.[0];


    if (
        !archivo
    ) {

        return;

    }


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    if (
        !producto
    ) {

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        resultado => {

            const imagen =
                new Image();


            imagen.onload =
                () => {

                    const maximo =
                        900;


                    const factor =
                        Math.min(

                            1,

                            maximo / imagen.width,

                            maximo / imagen.height

                        );


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        Math.round(
                            imagen.width
                            *
                            factor
                        );


                    canvas.height =
                        Math.round(
                            imagen.height
                            *
                            factor
                        );


                    const ctx =
                        canvas.getContext(
                            "2d"
                        );


                    ctx.fillStyle =
                        "#ffffff";


                    ctx.fillRect(

                        0,
                        0,
                        canvas.width,
                        canvas.height

                    );


                    ctx.drawImage(

                        imagen,

                        0,
                        0,
                        canvas.width,
                        canvas.height

                    );


                    producto.imagen =
                        canvas.toDataURL(

                            "image/jpeg",

                            0.76

                        );


                    persist();

                    renderAll();

                };


            imagen.src =
                resultado.target.result;

        };


    reader.readAsDataURL(
        archivo
    );

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
// COSTO FICHA
// ======================================================

function calcularCostoFicha(ficha) {

    if (
        !ficha
    ) {

        return {

            materiales: 0,
            manoObra: 0,
            otros: 0,
            total: 0

        };

    }


    const materiales =
        (
            ficha.materiales
            ||
            []
        )
        .reduce(

            (
                suma,
                componenteOriginal
            ) => {

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


                if (
                    !material
                ) {

                    return suma;

                }


                return (

                    suma

                    +

                    cantidadInventarioComponente(
                        componente,
                        material
                    )

                    *

                    Number(
                        material.ultimoPrecio
                        ||
                        0
                    )

                );

            },

            0

        );


    const manoObra =
        Number(
            ficha.manoObra
            ||
            0
        );


    const otros =
        Number(
            ficha.otrosCostos
            ||
            0
        );


    return {

        materiales:
            materiales,

        manoObra:
            manoObra,

        otros:
            otros,

        total:
            materiales
            +
            manoObra
            +
            otros

    };

}


// ======================================================
// FICHA COMPLETA
// ======================================================

function abrirFichaProducto(productoId) {

    productoDetalleActual =
        productoId;


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    if (
        !producto
    ) {

        return;

    }


    const tallas =
        obtenerTallasProducto(
            producto
        );


    const filas =
        tallas
            .map(

                talla => {

                    const stock =
                        obtenerRegistroStockPrenda(
                            producto.id,
                            talla
                        );


                    const ficha =
                        buscarFichaTecnica(
                            producto.id,
                            talla
                        );


                    const costo =
                        calcularCostoFicha(
                            ficha
                        );


                    const precio =
                        precioParaTalla(
                            producto,
                            talla
                        );


                    const margen =
                        precio
                        -
                        costo.total;


                    const margenPct =
                        precio > 0
                        ?
                        margen / precio * 100
                        :
                        0;


                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${talla}
                                </strong>
                            </td>

                            <td>
                                ${fmtCLP(precio)}
                            </td>

                            <td>
                                ${stock ? stock.stock : "Sin conteo"}
                            </td>

                            <td>

                                ${
                                    ficha?.pesoUnitario

                                    ?

                                    Number(
                                        ficha.pesoUnitario
                                    ).toFixed(0)
                                    +
                                    " g"

                                    :

                                    "—"
                                }

                            </td>

                            <td>
                                ${ficha?.tipoTela || "—"}
                            </td>

                            <td>

                                ${
                                    ficha

                                    ?

                                    `

                                    <div class="size-measure-list">

                                        <span>
                                            Pecho:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.pecho,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                        <span>
                                            Largo:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.largo,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                        <span>
                                            Manga:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.manga,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                        <span>
                                            Cintura:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.cintura,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                        <span>
                                            Cadera:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.cadera,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                        <span>
                                            Entrepierna:
                                            <b>
                                                ${
                                                    valorFicha(
                                                        ficha.medidas?.entrepierna,
                                                        " cm"
                                                    )
                                                }
                                            </b>
                                        </span>

                                    </div>

                                    `

                                    :

                                    "Sin datos"
                                }

                            </td>

                            <td>

                                ${
                                    ficha
                                    ?
                                    fmtCLP(costo.total)
                                    :
                                    "—"
                                }

                            </td>

                            <td>

                                ${
                                    ficha

                                    ?

                                    fmtCLP(margen)
                                    +
                                    " · "
                                    +
                                    margenPct.toFixed(2)
                                    +
                                    "%"

                                    :

                                    "—"
                                }

                            </td>

                            <td>

                                ${
                                    puedeEditarFichaTecnica()

                                    ?

                                    `

                                    <button

                                        class="btn btn-small"

                                        onclick='
                                        abrirEditorFichaTecnica(
                                            ${JSON.stringify(producto.id)},
                                            ${JSON.stringify(talla)}
                                        )
                                        '

                                    >

                                        ${
                                            ficha
                                            ?
                                            "Editar"
                                            :
                                            "Completar"
                                        }

                                    </button>

                                    `

                                    :

                                    `

                                    <span class="pill pill-gray">
                                        Solo lectura
                                    </span>

                                    `
                                }

                            </td>

                        </tr>

                    `;

                }

            )
            .join("");


    const contenedor =
        document.getElementById(
            "productDetailContent"
        );


    if (
        !contenedor
    ) {

        return;

    }


    contenedor.innerHTML = `

        <div class="detail-hero">

            <div>

                <div class="
                    catalog-image-wrap
                    detail-product-image
                ">

                    ${renderImagenCatalogo(producto)}

                </div>

            </div>


            <div>

                <span class="eyebrow">
                    ${producto.establecimiento}
                </span>

                <h2>
                    ${producto.nombre}
                </h2>

                <p>
                    Código:
                    ${producto.id}
                </p>


                <div class="detail-kpis">

                    <div>

                        <strong>
                            ${totalUnidadesProducto(producto)}
                        </strong>

                        <span>
                            Stock total
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${tallas.length}
                        </strong>

                        <span>
                            Tallas
                        </span>

                    </div>

                </div>

            </div>

        </div>


        <div
            class="panel"
            style="margin-top:20px;"
        >

            <span class="eyebrow">
                INFORMACIÓN TÉCNICA
            </span>

            <h3>
                Datos por talla
            </h3>


            <div class="table-wrap">

                <table class="technical-size-table">

                    <thead>

                        <tr>

                            <th>Talla</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Peso</th>
                            <th>Tela</th>
                            <th>Medidas</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th></th>

                        </tr>

                    </thead>

                    <tbody>
                        ${filas}
                    </tbody>

                </table>

            </div>

        </div>

    `;


    openModal(
        "modalProductDetail"
    );

}


// ======================================================
// CREAR MODAL FICHA
// ======================================================

function asegurarModalFichaTecnica() {

    if (
        document.getElementById(
            "modalFichaTecnica"
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
        "modalFichaTecnica";


    overlay.innerHTML = `

        <div class="
            modal
            modal-xl
        ">


            <div class="modal-top">

                <div>

                    <span class="eyebrow">
                        ADMINISTRACIÓN
                    </span>

                    <h2>
                        Ficha técnica por talla
                    </h2>

                </div>

                <button
                    class="icon-close"
                    onclick="
                    closeModal(
                        'modalFichaTecnica'
                    )
                    "
                >
                    ×
                </button>

            </div>


            <input
                id="ft_producto_id"
                type="hidden"
            >

            <input
                id="ft_talla"
                type="hidden"
            >


            <div
                id="ft_info"
                class="alert-box"
            ></div>


            <!-- PESO -->

            <h3 class="section-title">
                Peso de la prenda
            </h3>


            <div class="
                panel
                compact
            ">

                <div class="field-row">

                    <div class="field">

                        <label>
                            Peso terminado
                        </label>

                        <input

                            id="ft_peso"

                            type="number"

                            min="0"

                            step="0.0001"

                            oninput="
                            actualizarEquivalenciaPesoFicha()
                            "

                        >

                    </div>


                    <div class="field">

                        <label>
                            Unidad
                        </label>

                        <select
                            id="ft_peso_unidad"
                            onchange="
                            actualizarEquivalenciaPesoFicha()
                            "
                        >

                            <option value="g">
                                gramos
                            </option>

                            <option value="kg">
                                kilogramos
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label>
                            Equivalencia automática
                        </label>

                        <input
                            id="ft_peso_equivalencia"
                            type="text"
                            readonly
                        >

                    </div>

                </div>

            </div>


            <!-- TELA -->

            <h3 class="section-title">
                Información de tela
            </h3>


            <div class="
                panel
                compact
            ">

                <div class="field-row">

                    <div class="field">

                        <label>
                            Tipo de tela principal
                        </label>

                        <input
                            id="ft_tipo_tela"
                            type="text"
                            placeholder="Ej: Franela Polycotton"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Color
                        </label>

                        <input
                            id="ft_color_tela"
                            type="text"
                            placeholder="Ej: Azul Rey"
                        >

                    </div>

                </div>

            </div>


            <!-- MEDIDAS -->

            <h3 class="section-title">
                Medidas de la talla
            </h3>


            <div class="
                panel
                compact
            ">

                <p class="settings-note">

                    Las medidas se registran en centímetros.

                </p>


                <div class="garment-measures-grid">

                    <div class="field">

                        <label>
                            Pecho / ancho
                        </label>

                        <input
                            id="ft_med_pecho"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Largo total
                        </label>

                        <input
                            id="ft_med_largo"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Manga
                        </label>

                        <input
                            id="ft_med_manga"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Cintura
                        </label>

                        <input
                            id="ft_med_cintura"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Cadera
                        </label>

                        <input
                            id="ft_med_cadera"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Entrepierna
                        </label>

                        <input
                            id="ft_med_entrepierna"
                            type="number"
                            step="0.1"
                            min="0"
                        >

                    </div>

                </div>

            </div>


            <!-- COSTOS -->

            <h3 class="section-title">
                Costos adicionales
            </h3>


            <div class="
                panel
                compact
            ">

                <div class="field-row">

                    <div class="field">

                        <label>
                            Mano de obra por prenda
                        </label>

                        <input
                            id="ft_mano_obra"
                            type="number"
                            min="0"
                        >

                    </div>


                    <div class="field">

                        <label>
                            Otros costos
                        </label>

                        <input
                            id="ft_otros"
                            type="number"
                            min="0"
                        >

                    </div>

                </div>

            </div>


            <!-- MATERIALES -->

            <h3 class="section-title">
                Materiales por prenda
            </h3>


            <div class="two-col">


                <div class="
                    panel
                    compact
                ">

                    <div class="field">

                        <label>
                            Material
                        </label>

                        <select
                            id="ft_material"
                            onchange="
                            actualizarUnidadMaterialFicha()
                            "
                        ></select>

                    </div>


                    <div class="field-row">

                        <div class="field">

                            <label>
                                Cantidad por prenda
                            </label>

                            <input

                                id="ft_cantidad"

                                type="number"

                                min="0"

                                step="0.0001"

                                oninput="
                                actualizarEquivalenciaMaterialFicha()
                                "

                            >

                        </div>


                        <div class="field">

                            <label>
                                Unidad
                            </label>

                            <select

                                id="ft_unidad"

                                onchange="
                                actualizarEquivalenciaMaterialFicha()
                                "

                            ></select>

                        </div>

                    </div>


                    <div class="field">

                        <label>
                            Equivalencia automática
                        </label>

                        <input

                            id="ft_equivalencia_material"

                            type="text"

                            readonly

                        >

                    </div>


                    <button

                        class="btn"

                        onclick="
                        agregarMaterialFicha()
                        "

                    >
                        + Agregar / actualizar material
                    </button>

                </div>


                <div
                    id="ft_resumen"
                    class="
                    panel
                    compact
                    "
                ></div>

            </div>


            <div
                class="table-wrap"
                style="margin-top:15px;"
            >

                <table>

                    <thead>

                        <tr>

                            <th>Material</th>

                            <th>
                                Ingreso
                            </th>

                            <th>
                                Equivalencia
                            </th>

                            <th>
                                Inventario
                            </th>

                            <th>
                                Precio
                            </th>

                            <th>
                                Costo
                            </th>

                            <th></th>

                        </tr>

                    </thead>


                    <tbody
                        id="ft_materiales"
                    ></tbody>

                </table>

            </div>


            <div class="modal-actions">

                <button
                    class="btn"
                    onclick="
                    closeModal(
                        'modalFichaTecnica'
                    )
                    "
                >
                    Cancelar
                </button>


                <button
                    class="
                    btn
                    btn-primary
                    "
                    onclick="
                    guardarFichaTecnica()
                    "
                >
                    Guardar ficha
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );

}


// ======================================================
// EQUIVALENCIA PESO PRENDA
// ======================================================

function actualizarEquivalenciaPesoFicha() {

    const valor =
        document
            .getElementById(
                "ft_peso"
            )
            ?.value;


    const unidad =
        document
            .getElementById(
                "ft_peso_unidad"
            )
            ?.value;


    const salida =
        document.getElementById(
            "ft_peso_equivalencia"
        );


    if (
        !salida
    ) {

        return;

    }


    if (
        valor === ""
    ) {

        salida.value =
            "";

        return;

    }


    salida.value =
        textoEquivalencia(
            valor,
            unidad
        );

}


// ======================================================
// ACTUALIZAR UNIDADES DEL MATERIAL
// ======================================================

function actualizarUnidadMaterialFicha() {

    const codigo =
        document
            .getElementById(
                "ft_material"
            )
            ?.value;


    const material =
        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    const select =
        document.getElementById(
            "ft_unidad"
        );


    if (
        !material
        ||
        !select
    ) {

        return;

    }


    const unidades =
        unidadesPermitidasMaterial(
            material
        );


    /*
        Para consumos por peso mostramos gramos primero.
        Es normalmente más sencillo por prenda.
    */

    if (
        familiaUnidadMaterial(material)
        ===
        "peso"
    ) {

        unidades.sort(

            (
                a,
                b
            ) =>

                a === "g"
                ?
                -1
                :
                b === "g"
                ?
                1
                :
                0

        );

    }


    select.innerHTML =
        unidades
            .map(

                unidad => `

                    <option value="${unidad}">

                        ${etiquetaUnidad(unidad)}

                    </option>

                `

            )
            .join("");


    actualizarEquivalenciaMaterialFicha();

}


// ======================================================
// EQUIVALENCIA MATERIAL
// ======================================================

function actualizarEquivalenciaMaterialFicha() {

    const valor =
        document
            .getElementById(
                "ft_cantidad"
            )
            ?.value;


    const unidad =
        document
            .getElementById(
                "ft_unidad"
            )
            ?.value;


    const codigo =
        document
            .getElementById(
                "ft_material"
            )
            ?.value;


    const salida =
        document.getElementById(
            "ft_equivalencia_material"
        );


    const material =
        db.materiales.find(

            item =>
                item.codigo ===
                codigo

        );


    if (
        !salida
        ||
        !material
    ) {

        return;

    }


    if (
        valor === ""
        ||
        Number(valor) <= 0
    ) {

        salida.value =
            "";

        return;

    }


    const cantidadInventario =
        convertirAUnidadInventario(

            valor,
            unidad,
            material

        );


    salida.value =

        textoEquivalencia(
            valor,
            unidad
        )

        +

        " · Inventario: "

        +

        Number(
            cantidadInventario
            ||
            0
        )
        .toFixed(4)

        +

        " "

        +

        material.unidad;

}


// ======================================================
// ABRIR EDITOR
// ======================================================

function abrirEditorFichaTecnica(
    productoId,
    talla
) {

    if (
        !puedeEditarFichaTecnica()
    ) {

        alert(
            "Solo la Administradora puede modificar la ficha técnica."
        );

        return;

    }


    asegurarModalFichaTecnica();


    const producto =
        db.productos.find(

            item =>
                item.id ===
                productoId

        );


    const existente =
        buscarFichaTecnica(
            productoId,
            talla
        );


    fichaTecnicaTemporal =
        existente

        ?

        JSON.parse(
            JSON.stringify(existente)
        )

        :

        {

            id:
                "FT-"
                +
                Date.now(),

            productoId:
                productoId,

            talla:
                talla,

            pesoUnitario:
                null,

            pesoEntrada:
                null,

            unidadPesoEntrada:
                "g",

            tipoTela:
                "",

            colorTela:
                "",

            medidas: {},

            manoObra:
                0,

            otrosCostos:
                0,

            materiales:
                []

        };


    fichaTecnicaTemporal.materiales =
        (
            fichaTecnicaTemporal.materiales
            ||
            []
        )
        .map(
            normalizarComponenteExistente
        );


    fichaTecnicaTemporal.medidas = {

        pecho:
            fichaTecnicaTemporal.medidas?.pecho
            ??
            null,

        largo:
            fichaTecnicaTemporal.medidas?.largo
            ??
            null,

        manga:
            fichaTecnicaTemporal.medidas?.manga
            ??
            null,

        cintura:
            fichaTecnicaTemporal.medidas?.cintura
            ??
            null,

        cadera:
            fichaTecnicaTemporal.medidas?.cadera
            ??
            null,

        entrepierna:
            fichaTecnicaTemporal.medidas?.entrepierna
            ??
            null

    };


    document
        .getElementById(
            "ft_info"
        )
        .innerHTML = `

            <strong>
                ${producto.nombre}
            </strong>

            · ${producto.establecimiento}

            · talla

            <strong>
                ${talla}
            </strong>

        `;


    const unidadPeso =
        fichaTecnicaTemporal
            .unidadPesoEntrada
        ||
        "g";


    const valorPeso =
        fichaTecnicaTemporal
            .pesoEntrada
        ??
        fichaTecnicaTemporal
            .pesoUnitario
        ??
        "";


    document.getElementById(
        "ft_peso"
    ).value =
        valorPeso;


    document.getElementById(
        "ft_peso_unidad"
    ).value =
        unidadPeso;


    document.getElementById(
        "ft_tipo_tela"
    ).value =
        fichaTecnicaTemporal.tipoTela
        ||
        "";


    document.getElementById(
        "ft_color_tela"
    ).value =
        fichaTecnicaTemporal.colorTela
        ||
        "";


    [
        "pecho",
        "largo",
        "manga",
        "cintura",
        "cadera",
        "entrepierna"
    ]
    .forEach(

        campo => {

            document
                .getElementById(
                    "ft_med_"
                    +
                    campo
                )
                .value =

                fichaTecnicaTemporal
                    .medidas[campo]
                ??
                "";

        }

    );


    document
        .getElementById(
            "ft_mano_obra"
        )
        .value =
        fichaTecnicaTemporal.manoObra
        ||
        0;


    document
        .getElementById(
            "ft_otros"
        )
        .value =
        fichaTecnicaTemporal.otrosCostos
        ||
        0;


    document
        .getElementById(
            "ft_material"
        )
        .innerHTML =
        db.materiales
            .map(

                material => `

                    <option
                        value="${material.codigo}"
                    >

                        ${material.detalle}
                        · stock en
                        ${material.unidad}

                    </option>

                `

            )
            .join("");


    document.getElementById(
        "ft_cantidad"
    ).value =
        "";


    actualizarEquivalenciaPesoFicha();

    actualizarUnidadMaterialFicha();

    renderFichaTecnicaTemporal();


    openModal(
        "modalFichaTecnica"
    );

}


// ======================================================
// AGREGAR MATERIAL
// ======================================================

function agregarMaterialFicha() {

    const codigo =
        document
            .getElementById(
                "ft_material"
            )
            .value;


    const cantidad =
        Number(

            document
                .getElementById(
                    "ft_cantidad"
                )
                .value

        );


    const unidad =
        document
            .getElementById(
                "ft_unidad"
            )
            .value;


    if (
        !Number.isFinite(cantidad)
        ||
        cantidad <= 0
    ) {

        alert(
            "Ingresa una cantidad mayor que cero."
        );

        return;

    }


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


    const componente =
        crearComponenteNormalizado(

            material,

            cantidad,

            unidad

        );


    // ==================================================
    // ADVERTENCIA POR CONSUMO IMPROBABLE
    // ==================================================

    if (
        familiaUnidadMaterial(material)
        ===
        "peso"

        &&

        componente.cantidadBase >
        5
    ) {

        const continuar =
            confirm(

                "ATENCIÓN\n\n"
                +
                material.detalle
                +
                " equivale a "
                +
                (
                    componente.cantidadBase
                    *
                    1000
                )
                .toFixed(0)
                +
                " gramos por prenda.\n\n"
                +
                "Este consumo parece muy alto.\n"
                +
                "¿La unidad seleccionada es correcta?"

            );


        if (
            !continuar
        ) {

            return;

        }

    }


    const existente =
        fichaTecnicaTemporal
            .materiales
            .findIndex(

                item =>
                    item.materialCodigo ===
                    codigo

            );


    if (
        existente >= 0
    ) {

        fichaTecnicaTemporal
            .materiales[
                existente
            ] =
            componente;

    }

    else {

        fichaTecnicaTemporal
            .materiales
            .push(
                componente
            );

    }


    document.getElementById(
        "ft_cantidad"
    ).value =
        "";


    document.getElementById(
        "ft_equivalencia_material"
    ).value =
        "";


    renderFichaTecnicaTemporal();

}


// ======================================================
// QUITAR MATERIAL
// ======================================================

function quitarMaterialFicha(codigo) {

    fichaTecnicaTemporal.materiales =
        fichaTecnicaTemporal
            .materiales
            .filter(

                item =>
                    item.materialCodigo !==
                    codigo

            );


    renderFichaTecnicaTemporal();

}


// ======================================================
// RENDER FICHA TEMPORAL
// ======================================================

function renderFichaTecnicaTemporal() {

    const tbody =
        document.getElementById(
            "ft_materiales"
        );


    const resumen =
        document.getElementById(
            "ft_resumen"
        );


    if (
        !tbody
        ||
        !resumen
    ) {

        return;

    }


    tbody.innerHTML =
        fichaTecnicaTemporal
            .materiales
            .length

        ?

        fichaTecnicaTemporal
            .materiales
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


                    if (
                        !material
                    ) {

                        return "";

                    }


                    const costo =
                        cantidadInventarioComponente(
                            componente,
                            material
                        )
                        *
                        Number(
                            material.ultimoPrecio
                            ||
                            0
                        );


                    return `

                        <tr>

                            <td>
                                ${material.detalle}
                            </td>

                            <td>

                                ${componente.cantidadEntrada}
                                ${componente.unidadEntrada}

                            </td>

                            <td>

                                ${
                                    textoEquivalencia(
                                        componente.cantidadEntrada,
                                        componente.unidadEntrada
                                    )
                                }

                            </td>

                            <td>

                                ${
                                    Number(
                                        componente.cantidadInventario
                                    )
                                    .toFixed(4)
                                }

                                ${material.unidad}

                            </td>

                            <td>

                                ${fmtCLP(
                                    material.ultimoPrecio
                                    ||
                                    0
                                )}

                                / ${material.unidad}

                            </td>

                            <td>
                                ${fmtCLP(costo)}
                            </td>

                            <td>

                                <button

                                    class="
                                    btn
                                    btn-small
                                    btn-danger
                                    "

                                    onclick='
                                    quitarMaterialFicha(
                                        ${JSON.stringify(
                                            material.codigo
                                        )}
                                    )
                                    '

                                >
                                    Quitar
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
                    colspan="7"
                    class="empty"
                >
                    Sin materiales definidos.
                </td>

            </tr>

        `;


    fichaTecnicaTemporal.manoObra =
        Number(
            document
                .getElementById(
                    "ft_mano_obra"
                )
                ?.value

            ||

            fichaTecnicaTemporal.manoObra

            ||

            0
        );


    fichaTecnicaTemporal.otrosCostos =
        Number(
            document
                .getElementById(
                    "ft_otros"
                )
                ?.value

            ||

            fichaTecnicaTemporal.otrosCostos

            ||

            0
        );


    const costo =
        calcularCostoFicha(
            fichaTecnicaTemporal
        );


    const producto =
        db.productos.find(

            item =>
                item.id ===
                fichaTecnicaTemporal.productoId

        );


    const precio =
        precioParaTalla(
            producto,
            fichaTecnicaTemporal.talla
        );


    const margen =
        precio
        -
        costo.total;


    resumen.innerHTML = `

        <span class="eyebrow">
            COSTEO
        </span>

        <h3>
            Resumen por prenda
        </h3>


        <div class="definition-list">

            <div>

                <span>
                    Materiales
                </span>

                <strong>
                    ${fmtCLP(costo.materiales)}
                </strong>

            </div>


            <div>

                <span>
                    Mano de obra
                </span>

                <strong>
                    ${fmtCLP(costo.manoObra)}
                </strong>

            </div>


            <div>

                <span>
                    Otros
                </span>

                <strong>
                    ${fmtCLP(costo.otros)}
                </strong>

            </div>


            <div>

                <span>
                    Costo total
                </span>

                <strong>
                    ${fmtCLP(costo.total)}
                </strong>

            </div>


            <div>

                <span>
                    Precio venta
                </span>

                <strong>
                    ${fmtCLP(precio)}
                </strong>

            </div>


            <div>

                <span>
                    Margen
                </span>

                <strong>
                    ${fmtCLP(margen)}
                </strong>

            </div>

        </div>

    `;

}


// ======================================================
// NÚMERO OPCIONAL
// ======================================================

function numeroOpcional(id) {

    const valor =
        document
            .getElementById(id)
            ?.value;


    if (
        valor === ""
        ||
        valor === undefined
        ||
        valor === null
    ) {

        return null;

    }


    const numero =
        Number(valor);


    return Number.isFinite(numero)
        ?
        numero
        :
        null;

}


// ======================================================
// GUARDAR FICHA
// ======================================================

function guardarFichaTecnica() {

    if (
        !puedeEditarFichaTecnica()
    ) {

        alert(
            "Solo la Administradora puede modificar la ficha."
        );

        return;

    }


    const pesoEntrada =
        numeroOpcional(
            "ft_peso"
        );


    const unidadPeso =
        document
            .getElementById(
                "ft_peso_unidad"
            )
            .value;


    const pesoGramos =
        pesoEntrada !== null

        ?

        pesoAGramos(
            pesoEntrada,
            unidadPeso
        )

        :

        null;


    if (
        pesoGramos !== null
        &&
        pesoGramos > 5000
    ) {

        if (
            !confirm(

                "El peso ingresado equivale a "
                +
                pesoGramos.toFixed(0)
                +
                " g por prenda.\n\n"
                +
                "Parece un valor elevado.\n"
                +
                "¿Deseas guardarlo igualmente?"

            )
        ) {

            return;

        }

    }


    fichaTecnicaTemporal.pesoEntrada =
        pesoEntrada;


    fichaTecnicaTemporal.unidadPesoEntrada =
        unidadPeso;


    /*
        El peso interno de la prenda SIEMPRE queda
        normalizado en gramos.
    */

    fichaTecnicaTemporal.pesoUnitario =
        pesoGramos;


    fichaTecnicaTemporal.tipoTela =
        document
            .getElementById(
                "ft_tipo_tela"
            )
            .value
            .trim();


    fichaTecnicaTemporal.colorTela =
        document
            .getElementById(
                "ft_color_tela"
            )
            .value
            .trim();


    fichaTecnicaTemporal.medidas = {

        pecho:
            numeroOpcional(
                "ft_med_pecho"
            ),

        largo:
            numeroOpcional(
                "ft_med_largo"
            ),

        manga:
            numeroOpcional(
                "ft_med_manga"
            ),

        cintura:
            numeroOpcional(
                "ft_med_cintura"
            ),

        cadera:
            numeroOpcional(
                "ft_med_cadera"
            ),

        entrepierna:
            numeroOpcional(
                "ft_med_entrepierna"
            )

    };


    fichaTecnicaTemporal.manoObra =
        Number(
            document
                .getElementById(
                    "ft_mano_obra"
                )
                .value

            ||

            0
        );


    fichaTecnicaTemporal.otrosCostos =
        Number(
            document
                .getElementById(
                    "ft_otros"
                )
                .value

            ||

            0
        );


    fichaTecnicaTemporal.materiales =
        fichaTecnicaTemporal.materiales
            .map(
                normalizarComponenteExistente
            );


    fichaTecnicaTemporal.fechaActualizacion =
        todayStr();


    fichaTecnicaTemporal.actualizadaPor =
        usuarioActivo.nombre;


    const indice =
        db.fichasTecnicas.findIndex(

            item =>
                item.productoId ===
                fichaTecnicaTemporal.productoId

                &&

                String(item.talla)
                ===
                String(
                    fichaTecnicaTemporal.talla
                )

        );


    if (
        indice >= 0
    ) {

        db.fichasTecnicas[indice] =
            fichaTecnicaTemporal;

    }

    else {

        db.fichasTecnicas.push(
            fichaTecnicaTemporal
        );

    }


    registrarActividad(

        "Ficha técnica",

        "Actualizada "
        +
        fichaTecnicaTemporal.productoId
        +
        " talla "
        +
        fichaTecnicaTemporal.talla,

        {
            referencia:
                fichaTecnicaTemporal.productoId,

            accion:
                "Editar ficha técnica"
        }

    );


    const productoId =
        fichaTecnicaTemporal.productoId;


    persist();

    closeModal(
        "modalFichaTecnica"
    );

    renderAll();

    abrirFichaProducto(
        productoId
    );

}