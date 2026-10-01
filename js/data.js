// ======================================================
// PATYCA ERP V6
// DATOS MAESTROS + NORMALIZACIÓN
// ======================================================


// ======================================================
// TALLAS
// ======================================================

function expandirGrupoTallas(
    grupo
) {

    return String(
        grupo
        ||
        ""
    )
    .split("-")
    .map(
        talla =>
            talla.trim()
    )
    .filter(
        Boolean
    );

}


// Ejemplo:
// "4-6-8"
// ->
// ["4","6","8"]

function obtenerTallasProducto(
    producto
) {

    const grupos =
        Object.keys(

            producto?.precios
            ||
            {}

        );


    return [

        ...new Set(

            grupos.flatMap(

                grupo =>
                    expandirGrupoTallas(
                        grupo
                    )

            )

        )

    ];

}


function grupoContieneTalla(
    grupo,
    talla
) {

    return expandirGrupoTallas(
        grupo
    )
    .includes(
        String(
            talla
        )
    );

}


function grupoPrecioParaTalla(
    producto,
    talla
) {

    const entrada =

        Object
            .entries(

                producto?.precios
                ||
                {}

            )
            .find(

                (
                    [
                        grupo
                    ]
                ) =>

                    grupoContieneTalla(

                        grupo,

                        talla

                    )

            );


    return entrada
        ?
        entrada[0]
        :
        null;

}


function precioParaTalla(
    producto,
    talla
) {

    const grupo =
        grupoPrecioParaTalla(

            producto,

            talla

        );


    if (!grupo) {
        return 0;
    }


    return Number(

        producto.precios[
            grupo
        ]

        ||
        0

    );

}


// ======================================================
// ESTABLECIMIENTOS / LÍNEAS
// ======================================================
//
// IMPORTANTE:
// Los establecimientos son líneas comerciales.
//
// NO son tratados como clientes.
// ======================================================

const ESTABLECIMIENTOS_BASE = [

    {
        id:
            "EST-001",

        nombre:
            "Escuela Numpay",

        tipo:
            "Establecimiento",

        anioPrecio:
            2026
    },

    {
        id:
            "EST-002",

        nombre:
            "Colegio San Esteban",

        tipo:
            "Establecimiento",

        anioPrecio:
            2026
    },

    {
        id:
            "EST-003",

        nombre:
            "Liceo Max Colin",

        tipo:
            "Establecimiento",

        anioPrecio:
            2025
    },

    {
        id:
            "EST-004",

        nombre:
            "Marca Kotting",

        tipo:
            "Línea",

        anioPrecio:
            2025
    },

    {
        id:
            "EST-005",

        nombre:
            "Colegio Pablo Neruda",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-006",

        nombre:
            "Santo Tomás - San Alberto Magno / Mártir",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-007",

        nombre:
            "Los Agustinos",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-008",

        nombre:
            "Jardín Valle del Maule",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-009",

        nombre:
            "Colegio de Nunpar",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-010",

        nombre:
            "Liceo María Auxiliadora",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    },

    {
        id:
            "EST-011",

        nombre:
            "Culemar",

        tipo:
            "Establecimiento",

        anioPrecio:
            null
    }

];


// ======================================================
// PRODUCTOS CON LISTAS DE PRECIOS DISPONIBLES
// ======================================================

const PRODUCTOS_BASE = [

    // ==================================================
    // ESCUELA NUMPAY
    // ==================================================

    {
        id:
            "PR001",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polera Polo M/C",

        anio:
            2026,

        precios: {

            "4-6-8":
                8000,

            "10-12":
                9000,

            "14-16":
                10000,

            "S-M":
                10500,

            "L-XL":
                11500,

            "XXL":
                12000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR002",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polera Polo M/L",

        anio:
            2026,

        precios: {

            "4-6-8":
                9000,

            "10-12":
                10000,

            "14-16":
                11000,

            "S-M":
                11500,

            "L-XL":
                12500,

            "XXL":
                13000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR003",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polera Piqué M/C",

        anio:
            2026,

        precios: {

            "4-6-8":
                10000,

            "10-12":
                11000,

            "14-16":
                12000,

            "S-M":
                12500,

            "L-XL":
                13500,

            "XXL":
                14000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR004",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polera Piqué M/L",

        anio:
            2026,

        precios: {

            "4-6-8":
                11000,

            "10-12":
                12000,

            "14-16":
                13000,

            "S-M":
                13500,

            "L-XL":
                14500,

            "XXL":
                15000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR005",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Buzo (Polerón y Pantalón)",

        anio:
            2026,

        precios: {

            "4-6-8":
                21000,

            "10-12":
                22000,

            "14-16":
                23000,

            "S-M":
                24000,

            "L-XL":
                25000,

            "XXL":
                26000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR006",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polerón de Buzo",

        anio:
            2026,

        precios: {

            "4-6-8":
                12000,

            "10-12":
                13000,

            "14-16":
                14000,

            "S-M":
                15000,

            "L-XL":
                16000,

            "XXL":
                17000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR007",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Pantalón de Buzo",

        anio:
            2026,

        precios: {

            "4-6-8":
                10000,

            "10-12":
                11000,

            "14-16":
                12000,

            "S-M":
                13000,

            "L-XL":
                14000,

            "XXL":
                15000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR008",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Falda",

        anio:
            2026,

        precios: {

            "4-6-8":
                15000,

            "10-12":
                16000,

            "14-16":
                18000,

            "S-M":
                21000,

            "L-XL":
                23000,

            "XXL":
                25000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR009",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Polar Micropolar",

        anio:
            2026,

        precios: {

            "4-6-8":
                17000,

            "10-12":
                18000,

            "14-16":
                19000,

            "S-M":
                21000,

            "L-XL":
                22000,

            "XXL":
                23000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR010",

        establecimiento:
            "Escuela Numpay",

        nombre:
            "Pantalón Colegio Gris Kotting",

        anio:
            2026,

        precios: {

            "4-6-8":
                15000,

            "10-12":
                16000,

            "14-16":
                17000,

            "S-M":
                18000,

            "L-XL":
                18000,

            "XXL":
                18000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    // ==================================================
    // COLEGIO SAN ESTEBAN
    // ==================================================

    {
        id:
            "PR011",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polera Polo M/C",

        anio:
            2026,

        precios: {

            "4-6-8":
                8000,

            "10-12":
                9000,

            "14-16":
                10000,

            "S-M":
                10500,

            "L-XL":
                11500,

            "XXL":
                12000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR012",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polera Polo M/L",

        anio:
            2026,

        precios: {

            "4-6-8":
                9000,

            "10-12":
                10000,

            "14-16":
                11000,

            "S-M":
                11500,

            "L-XL":
                12500,

            "XXL":
                13000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR013",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polera Piqué M/C",

        anio:
            2026,

        precios: {

            "4-6-8":
                10000,

            "10-12":
                11000,

            "14-16":
                12000,

            "S-M":
                12500,

            "L-XL":
                13500,

            "XXL":
                14000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR014",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polera Piqué M/L",

        anio:
            2026,

        precios: {

            "4-6-8":
                11000,

            "10-12":
                12000,

            "14-16":
                13000,

            "S-M":
                13500,

            "L-XL":
                14500,

            "XXL":
                15000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR015",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Buzo (Polerón y Pantalón)",

        anio:
            2026,

        precios: {

            "4-6-8":
                25000,

            "10-12":
                27000,

            "14-16":
                29000,

            "S-M":
                31000,

            "L-XL":
                33000,

            "XXL":
                35000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR016",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polerón de Buzo",

        anio:
            2026,

        precios: {

            "4-6-8":
                14000,

            "10-12":
                15000,

            "14-16":
                16000,

            "S-M":
                17000,

            "L-XL":
                18000,

            "XXL":
                19000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR017",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Pantalón de Buzo",

        anio:
            2026,

        precios: {

            "4-6-8":
                12000,

            "10-12":
                13000,

            "14-16":
                14000,

            "S-M":
                15000,

            "L-XL":
                16000,

            "XXL":
                17000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR018",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Calza",

        anio:
            2026,

        precios: {

            "4-6-8":
                8500,

            "10-12":
                8500,

            "14-16":
                8500,

            "S-M":
                9900,

            "L-XL":
                9900,

            "XXL":
                9900

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR019",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Polar",

        anio:
            2026,

        precios: {

            "4-6-8":
                17000,

            "10-12":
                19000,

            "14-16":
                21000,

            "S-M":
                22000,

            "L-XL":
                23500,

            "XXL":
                25000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR020",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Sweater",

        anio:
            2026,

        precios: {

            "4-6-8":
                15500,

            "10-12":
                16500,

            "14-16":
                17500,

            "S-M":
                18500,

            "L-XL":
                19500,

            "XXL":
                20500

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR021",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Pantalón Gris Kotting",

        anio:
            2026,

        precios: {

            "4-6-8":
                15000,

            "10-12":
                16000,

            "14-16":
                17000,

            "S-M":
                18000,

            "L-XL":
                18000,

            "XXL":
                18000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR022",

        establecimiento:
            "Colegio San Esteban",

        nombre:
            "Falda",

        anio:
            2026,

        precios: {

            "4-6-8":
                15000,

            "10-12":
                16000,

            "14-16":
                18000,

            "S-M":
                21000,

            "L-XL":
                23000,

            "XXL":
                25000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    // ==================================================
    // LICEO MAX COLIN
    // ==================================================

    {
        id:
            "PR023",

        establecimiento:
            "Liceo Max Colin",

        nombre:
            "Polera Deporte M/C",

        anio:
            2025,

        precios: {

            "14-16":
                9000,

            "S-M":
                10000,

            "L-XL":
                11000,

            "XXL":
                12000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR024",

        establecimiento:
            "Liceo Max Colin",

        nombre:
            "Polera Uniforme M/C",

        anio:
            2025,

        precios: {

            "14-16":
                12000,

            "S-M":
                13000,

            "L-XL":
                13500,

            "XXL":
                14000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR025",

        establecimiento:
            "Liceo Max Colin",

        nombre:
            "Buzo",

        anio:
            2025,

        precios: {

            "14-16":
                30000,

            "S-M":
                32000,

            "L-XL":
                33000,

            "XXL":
                35000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR026",

        establecimiento:
            "Liceo Max Colin",

        nombre:
            "Polar",

        anio:
            2025,

        precios: {

            "14-16":
                18000,

            "S-M":
                20000,

            "L-XL":
                22000,

            "XXL":
                23000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR027",

        establecimiento:
            "Liceo Max Colin",

        nombre:
            "Falda",

        anio:
            2025,

        precios: {

            "14-16":
                18000,

            "S-M":
                21000,

            "L-XL":
                23000,

            "XXL":
                25000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    // ==================================================
    // KOTTING
    // ==================================================

    {
        id:
            "PR028",

        establecimiento:
            "Marca Kotting",

        nombre:
            "Camisa / Blusa Colegio M/C",

        anio:
            2025,

        precios: {

            "2-4":
                8000,

            "6-8":
                8000,

            "10-12":
                8000,

            "14-16":
                9900,

            "S-M":
                9900,

            "L-XL":
                11900,

            "XXL":
                11900

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR029",

        establecimiento:
            "Marca Kotting",

        nombre:
            "Pantalón",

        anio:
            2025,

        precios: {

            "2-4":
                15000,

            "6-8":
                15000,

            "10-12":
                16000,

            "14-16":
                16000,

            "38-40":
                18000,

            "42-44-46":
                18000,

            "48-50":
                18000

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    },


    {
        id:
            "PR030",

        establecimiento:
            "Marca Kotting",

        nombre:
            "Vestón / Blazer",

        anio:
            2025,

        precios: {

            "38-40":
                38000,

            "42-44":
                38000,

            "46-48":
                39900,

            "50-52":
                39900

        },

        telaPrincipal:
            "",

        imagen:
            "",

        observaciones:
            ""
    }

];


// ======================================================
// PROVEEDORES
// ======================================================

const PROVEEDORES_BASE = [

    {
        id:
            "PROV-001",

        nombre:
            "Textil Circutex S.A.",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-002",

        nombre:
            "Albornoz y Lama",

        categoria:
            "Insumos de confección"
    },

    {
        id:
            "PROV-003",

        nombre:
            "Importadora y Distribuidora G y G Limitada",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-004",

        nombre:
            "Textil La Emiliana Ltda.",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-005",

        nombre:
            "Ramón Eduardo Fuentes Cuadros",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-006",

        nombre:
            "Meriggi Telas Limitada",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-007",

        nombre:
            "José Moreno y Compañía Limitada",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-008",

        nombre:
            "Comercial Gosen y Lecaros Limitada",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-009",

        nombre:
            "Comercial Cafratex Limitada",

        categoria:
            "Telas"
    },

    {
        id:
            "PROV-010",

        nombre:
            "Comercializadora Ancar SpA",

        categoria:
            "Insumos"
    },

    {
        id:
            "PROV-011",

        nombre:
            "Frontera Gráfica SpA",

        categoria:
            "Impresión textil"
    },

    {
        id:
            "PROV-012",

        nombre:
            "Nehemias Hilario Zarsuri Calle",

        categoria:
            "Bordado"
    },

    {
        id:
            "PROV-013",

        nombre:
            "Liquidadora Lupe SpA",

        categoria:
            "Cordonería"
    },

    {
        id:
            "PROV-014",

        nombre:
            "Rodrigo Eduardo Quiñones Lopez",

        categoria:
            "Prendas terminadas"
    }

];


// ======================================================
// MATERIALES DE REFERENCIA
// ======================================================
//
// IMPORTANTE:
//
// stock = null
//
// significa:
// "todavía no se ha realizado conteo físico".
//
// No inventamos inventario.
// ======================================================

const MATERIALES_BASE = [

    {
        codigo:
            "MAT-0001",

        tipo:
            "Tela",

        detalle:
            "Franela Polycotton Azul Rey",

        proveedor:
            "Textil Circutex S.A.",

        unidad:
            "kg",

        ultimoPrecio:
            6500,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0002",

        tipo:
            "Tela",

        detalle:
            "Piqué Polycotton Melange",

        proveedor:
            "Textil Circutex S.A.",

        unidad:
            "kg",

        ultimoPrecio:
            5800,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0003",

        tipo:
            "Tela",

        detalle:
            "Puño Polycotton 1x1 Azul Rey",

        proveedor:
            "Textil Circutex S.A.",

        unidad:
            "kg",

        ultimoPrecio:
            6500,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0004",

        tipo:
            "Tela",

        detalle:
            "Franela de Algodón",

        proveedor:
            "Importadora y Distribuidora G y G Limitada",

        unidad:
            "kg",

        ultimoPrecio:
            7200,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0005",

        tipo:
            "Tela",

        detalle:
            "Puño de Algodón",

        proveedor:
            "Importadora y Distribuidora G y G Limitada",

        unidad:
            "kg",

        ultimoPrecio:
            8400,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0006",

        tipo:
            "Tela",

        detalle:
            "Bistretch",

        proveedor:
            "Textil La Emiliana Ltda.",

        unidad:
            "metros",

        ultimoPrecio:
            849,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0007",

        tipo:
            "Tela",

        detalle:
            "Can Can",

        proveedor:
            "Comercial Gosen y Lecaros Limitada",

        unidad:
            "metros",

        ultimoPrecio:
            790,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0008",

        tipo:
            "Tela",

        detalle:
            "Tull Blanco",

        proveedor:
            "Comercial Cafratex Limitada",

        unidad:
            "metros",

        ultimoPrecio:
            1470,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    },


    {
        codigo:
            "MAT-0009",

        tipo:
            "Insumo",

        detalle:
            "Sesgo",

        proveedor:
            "Comercializadora Ancar SpA",

        unidad:
            "unidades",

        ultimoPrecio:
            1588,

        stock:
            null,

        stockMinimo:
            null,

        stockObjetivo:
            null,

        bodega:
            "Por definir"
    }

];


// ======================================================
// COMPRAS HISTÓRICAS DE REFERENCIA
// ======================================================

const COMPRAS_REFERENCIA_BASE = [

    {
        proveedor:
            "Textil Circutex S.A.",

        material:
            "Franela Polycotton Azul Rey",

        cantidad:
            172.2,

        unidad:
            "kg",

        precioUnitario:
            6500,

        total:
            1119300
    },


    {
        proveedor:
            "Textil Circutex S.A.",

        material:
            "Puño Polycotton 1x1 Azul Rey",

        cantidad:
            16.5,

        unidad:
            "kg",

        precioUnitario:
            6500,

        total:
            107250
    },


    {
        proveedor:
            "Textil Circutex S.A.",

        material:
            "Piqué Polycotton Melange",

        cantidad:
            42.7,

        unidad:
            "kg",

        precioUnitario:
            5800,

        total:
            247660
    }

];


// ======================================================
// ROLES
// ======================================================

const ROLES_BASE = {

    Administradora: {

        dashboard:
            true,

        catalogo:
            true,

        ventas:
            true,

        cotizaciones:
            true,

        inventario:
            true,

        produccion:
            true,

        compras:
            true,

        finanzas:
            true,

        reportes:
            true,

        configuracion:
            true
    },


    Bodega: {

        dashboard:
            true,

        catalogo:
            true,

        ventas:
            false,

        cotizaciones:
            false,

        inventario:
            true,

        produccion:
            true,

        compras:
            true,

        finanzas:
            false,

        reportes:
            false,

        configuracion:
            false
    }

};


// ======================================================
// SEED
// ======================================================

function seedData() {

    return {

        version:
            6,


        configuracion: {

            empresa:
                "PATYCA Confecciones",

            taller:
                "Taller PATYCA",

            bodegas: [

                "Bodega 1",
                "Bodega 2",
                "Bodega 3"

            ],

            porcentajeAdvertenciaStock:
                20,

            diasAvisoVencimiento:
                5,

            saldoInicial:
                0,

            fechaSaldoInicial:
                "",

            moneda:
                "CLP"

        },


        establecimientos:
            structuredClone(
                ESTABLECIMIENTOS_BASE
            ),


        productos:
            structuredClone(
                PRODUCTOS_BASE
            ),


        proveedores:
            structuredClone(
                PROVEEDORES_BASE
            ),


        materiales:
            structuredClone(
                MATERIALES_BASE
            ),


        comprasReferencia:
            structuredClone(
                COMPRAS_REFERENCIA_BASE
            ),


        roles:
            structuredClone(
                ROLES_BASE
            ),


        stockPrendas:
            [],


        ventas:
            [],


        pagosVentas:
            [],


        compras:
            [],


        pagosCompras:
            [],


        gastos:
            [],


        produccion:
            [],


        ordenesProduccion:
            [],


        movimientosInventario:
            [],


        fichasTecnicas:
            [],


        costeoProductos:
            [],


        cotizaciones:
            [],


        actividad:
            [],


        notificacionesLeidas:
            []

    };

}


// ======================================================
// MERGE POR IDENTIFICADOR
// ======================================================

function mergeMaestros(
    actuales,
    base,
    campoId
) {

    const mapa =
        new Map();


    (
        actuales
        ||
        []
    )
    .forEach(

        item => {

            if (
                item?.[
                    campoId
                ]
            ) {

                mapa.set(

                    item[
                        campoId
                    ],

                    item

                );

            }

        }

    );


    base.forEach(

        itemBase => {

            const id =
                itemBase[
                    campoId
                ];


            if (
                mapa.has(
                    id
                )
            ) {

                mapa.set(

                    id,

                    {

                        ...itemBase,

                        ...mapa.get(
                            id
                        )

                    }

                );

            }

            else {

                mapa.set(

                    id,

                    structuredClone(
                        itemBase
                    )

                );

            }

        }

    );


    return [

        ...mapa.values()

    ];

}


// ======================================================
// NORMALIZAR BASE
// ======================================================

function normalizarDb(
    entrada
) {

    const base =
        seedData();


    const db =
        entrada

        ?

        {
            ...base,
            ...entrada
        }

        :

        base;


    db.version =
        6;


    db.configuracion = {

        ...base.configuracion,

        ...(
            db.configuracion
            ||
            {}
        )

    };


    if (
        !Array.isArray(
            db.configuracion.bodegas
        )
    ) {

        db.configuracion.bodegas = [

            "Bodega 1",
            "Bodega 2",
            "Bodega 3"

        ];

    }


    // ==================================================
    // MAESTROS
    // ==================================================

    db.establecimientos =
        mergeMaestros(

            db.establecimientos,

            ESTABLECIMIENTOS_BASE,

            "id"

        );


    db.productos =
        mergeMaestros(

            db.productos,

            PRODUCTOS_BASE,

            "id"

        );


    db.proveedores =
        mergeMaestros(

            db.proveedores,

            PROVEEDORES_BASE,

            "id"

        );


    db.materiales =
        mergeMaestros(

            db.materiales,

            MATERIALES_BASE,

            "codigo"

        );


    // ==================================================
    // LISTAS
    // ==================================================

    const listas = [

        "comprasReferencia",

        "stockPrendas",

        "ventas",

        "pagosVentas",

        "compras",

        "pagosCompras",

        "gastos",

        "produccion",

        "ordenesProduccion",

        "movimientosInventario",

        "fichasTecnicas",

        "costeoProductos",

        "cotizaciones",

        "actividad",

        "notificacionesLeidas"

    ];


    listas.forEach(

        nombre => {

            if (
                !Array.isArray(
                    db[
                        nombre
                    ]
                )
            ) {

                db[
                    nombre
                ] = [];

            }

        }

    );


    // ==================================================
    // COMPRAS REFERENCIA
    // ==================================================

    if (
        db.comprasReferencia.length ===
        0
    ) {

        db.comprasReferencia =
            structuredClone(
                COMPRAS_REFERENCIA_BASE
            );

    }


    // ==================================================
    // ROLES
    // ==================================================

    db.roles = {

        ...structuredClone(
            ROLES_BASE
        ),

        ...(
            db.roles
            ||
            {}
        )

    };


    // ==================================================
    // NORMALIZAR PRODUCTOS
    // ==================================================

    db.productos =
        db.productos
            .map(

                producto => ({

                    ...producto,

                    precios:
                        producto.precios
                        ||
                        {},

                    imagen:
                        producto.imagen
                        ||
                        "",

                    telaPrincipal:
                        producto.telaPrincipal
                        ||
                        "",

                    observaciones:
                        producto.observaciones
                        ||
                        ""

                })

            );


    // ==================================================
    // NORMALIZAR MATERIALES
    // ==================================================

    db.materiales =
        db.materiales
            .map(

                material => ({

                    ...material,

                    stock:

                        material.stock
                        ===
                        undefined

                        ?

                        null

                        :

                        material.stock,

                    stockMinimo:

                        material.stockMinimo
                        ===
                        undefined

                        ?

                        null

                        :

                        material.stockMinimo,

                    stockObjetivo:

                        material.stockObjetivo
                        ===
                        undefined

                        ?

                        null

                        :

                        material.stockObjetivo,

                    bodega:
                        material.bodega
                        ||
                        "Por definir"

                })

            );


    // ==================================================
    // NORMALIZAR VENTAS
    // ==================================================

    db.ventas =
        db.ventas
            .map(

                venta => {

                    const total =
                        Number(
                            venta.total
                            ||
                            0
                        );


                    // Las ventas antiguas se mantienen.
                    // No asumimos automáticamente que fueron cobradas.

                    return {

                        ...venta,

                        estadoPago:

                            venta.estadoPago
                            ||
                            "Por revisar",

                        montoPagado:

                            venta.montoPagado
                            ??
                            0,

                        saldoPendiente:

                            venta.saldoPendiente
                            ??
                            total

                    };

                }

            );


    // ==================================================
    // NORMALIZAR COMPRAS
    // ==================================================

    db.compras =
        db.compras
            .map(

                compra => {

                    const total =
                        Number(
                            compra.total
                            ||
                            0
                        );


                    let pagado =
                        Number(
                            compra.montoPagado
                            ||
                            0
                        );


                    if (
                        compra.estadoPago ===
                        "Pagada"

                        &&
                        pagado ===
                        0
                    ) {

                        pagado =
                            total;

                    }


                    return {

                        ...compra,

                        montoPagado:
                            pagado,

                        saldoPendiente:

                            Math.max(

                                0,

                                total
                                -
                                pagado

                            ),

                        estadoPago:

                            pagado >= total
                            &&
                            total > 0

                            ?

                            "Pagada"

                            :

                            pagado > 0

                            ?

                            "Parcial"

                            :

                            (
                                compra.estadoPago
                                ||
                                "Pendiente"
                            )

                    };

                }

            );


    // ==================================================
    // NORMALIZAR ÓRDENES
    // ==================================================

    db.ordenesProduccion =
        db.ordenesProduccion
            .map(

                orden => ({

                    ...orden,

                    stockIngresado:
                        Boolean(
                            orden.stockIngresado
                        ),

                    materialesDescontados:
                        Boolean(
                            orden.materialesDescontados
                        )

                })

            );


    return db;

}