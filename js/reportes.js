// ======================================================
// PATYCA ERP V6 - REPORTES Y ANALÍTICA
// ======================================================


// ======================================================
// CSV
// ======================================================

function descargarCSV(
    nombre,
    filas
) {

    const contenido =

        filas
            .map(

                fila =>

                    fila
                        .map(

                            valor =>

                                '"'

                                +

                                String(
                                    valor
                                    ??
                                    ""
                                )
                                .replace(
                                    /"/g,
                                    '""'
                                )

                                +

                                '"'

                        )
                        .join(
                            ";"
                        )

            )
            .join(
                "\n"
            );


    const blob =
        new Blob(

            [
                "\uFEFF"
                +
                contenido
            ],

            {
                type:
                    "text/csv;charset=utf-8;"
            }

        );


    const url =
        URL.createObjectURL(
            blob
        );


    const enlace =
        document.createElement(
            "a"
        );


    enlace.href =
        url;


    enlace.download =
        nombre;


    enlace.click();


    URL.revokeObjectURL(
        url
    );

}


// ======================================================
// VENTAS
// ======================================================

function exportarVentasCSV() {

    const filas = [[

        "Fecha",
        "Código",
        "Establecimiento",
        "Producto",
        "Talla",
        "Cantidad",
        "Precio unitario",
        "Total",
        "Cobrado",
        "Saldo",
        "Estado"

    ]];


    db.ventas.forEach(

        venta => {

            filas.push([

                venta.fecha,
                venta.codigo,
                venta.establecimiento,
                venta.producto,
                venta.talla,
                venta.cantidad,
                venta.precioUnitario,
                venta.total,
                venta.montoPagado,
                venta.saldoPendiente,
                venta.estadoPago

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Ventas_V6.csv",
        filas
    );

}


// ======================================================
// INVENTARIO
// ======================================================

function exportarInventarioCSV() {

    const filas = [[

        "Código",
        "Tipo",
        "Material",
        "Proveedor",
        "Stock",
        "Mínimo",
        "Objetivo",
        "Unidad",
        "Bodega",
        "Último precio"

    ]];


    db.materiales.forEach(

        material => {

            filas.push([

                material.codigo,
                material.tipo,
                material.detalle,
                material.proveedor,
                material.stock ?? "",
                material.stockMinimo ?? "",
                material.stockObjetivo ?? "",
                material.unidad,
                material.bodega,
                material.ultimoPrecio

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Inventario_Materiales_V6.csv",
        filas
    );

}


// ======================================================
// STOCK PRENDAS
// ======================================================

function exportarStockPrendasCSV() {

    const filas = [[

        "Establecimiento",
        "Producto",
        "Talla",
        "Stock",
        "Mínimo",
        "Objetivo"

    ]];


    db.stockPrendas.forEach(

        stock => {

            const producto =
                db.productos.find(

                    item =>
                        item.id ===
                        stock.productoId

                );


            filas.push([

                producto?.establecimiento || "",
                producto?.nombre || "",
                stock.talla,
                stock.stock,
                stock.stockMinimo ?? "",
                stock.stockObjetivo ?? ""

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Stock_Prendas_V6.csv",
        filas
    );

}


// ======================================================
// COMPRAS
// ======================================================

function exportarComprasCSV() {

    const filas = [[

        "Fecha",
        "Código",
        "Proveedor",
        "Material",
        "Cantidad",
        "Unidad",
        "Total",
        "Pagado",
        "Saldo",
        "Estado"

    ]];


    db.compras.forEach(

        compra => {

            filas.push([

                compra.fecha,
                compra.codigo,
                compra.proveedor,
                compra.material,
                compra.cantidad,
                compra.unidad,
                compra.total,
                compra.montoPagado,
                compra.saldoPendiente,
                compra.estadoPago

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Compras_V6.csv",
        filas
    );

}


// ======================================================
// PRODUCCIÓN
// ======================================================

function exportarProduccionCSV() {

    const filas = [[

        "Fecha",
        "Código",
        "Establecimiento",
        "Prenda",
        "Talla",
        "Cantidad",
        "Tela utilizada",
        "Merma kg",
        "Merma %",
        "Aprovechamiento %",
        "Rendimiento"

    ]];


    db.produccion.forEach(

        registro => {

            filas.push([

                registro.fecha,
                registro.codigo,
                registro.establecimiento,
                registro.prenda,
                registro.talla,
                registro.cantidad,
                registro.telaUtilizada,
                registro.perdida,
                registro.perdidaPct,
                registro.aprovechamiento,
                registro.rendimiento

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Produccion_V6.csv",
        filas
    );

}


// ======================================================
// AUDITORÍA
// ======================================================

function exportarAuditoriaCSV() {

    const filas = [[

        "Fecha",
        "Usuario",
        "Rol",
        "Módulo",
        "Acción",
        "Referencia",
        "Descripción"

    ]];


    db.actividad.forEach(

        item => {

            filas.push([

                item.fecha,
                item.usuario,
                item.rol || "",
                item.modulo,
                item.accion || "",
                item.referencia || "",
                item.descripcion

            ]);

        }

    );


    descargarCSV(
        "PATYCA_Auditoria_V6.csv",
        filas
    );

}


// ======================================================
// TOP PRODUCTOS
// ======================================================

function renderTopProductos() {

    const acumulado =
        {};


    db.ventas.forEach(

        venta => {

            const clave =

                venta.establecimiento
                +
                " · "
                +
                venta.producto;


            if (
                !acumulado[
                    clave
                ]
            ) {

                acumulado[
                    clave
                ] = {

                    unidades:
                        0,

                    monto:
                        0

                };

            }


            acumulado[
                clave
            ].unidades +=

                Number(
                    venta.cantidad
                    ||
                    0
                );


            acumulado[
                clave
            ].monto +=

                Number(
                    venta.total
                    ||
                    0
                );

        }

    );


    const ranking =

        Object
            .entries(
                acumulado
            )
            .sort(

                (
                    a,
                    b
                ) =>

                    b[1].unidades
                    -
                    a[1].unidades

            )
            .slice(
                0,
                8
            );


    const contenedor =
        document.getElementById(
            "topProductos"
        );


    if (
        !contenedor
    ) {

        return;

    }


    contenedor.innerHTML =

        ranking.length

        ?

        ranking
            .map(

                (
                    [
                        nombre,
                        datos
                    ],
                    indice
                ) => `

                    <div class="rank-row">

                        <span class="rank-number">
                            ${indice + 1}
                        </span>

                        <div>

                            <strong>
                                ${nombre}
                            </strong>

                            <small>
                                ${fmtCLP(
                                    datos.monto
                                )}
                                vendidos
                            </small>

                        </div>

                        <em>
                            ${datos.unidades}
                            ud.
                        </em>

                    </div>

                `

            )
            .join("")

        :

        `

            <div class="empty">

                Sin ventas suficientes
                para generar ranking.

            </div>

        `;

}


// ======================================================
// INDICADORES REPORTES
// ======================================================

function renderReportes() {

    const totalVentas =

        db.ventas.reduce(

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


    const totalCobrado =

        db.pagosVentas.reduce(

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


    const totalCompras =

        db.compras.reduce(

            (
                suma,
                compra
            ) =>

                suma
                +
                Number(
                    compra.total
                    ||
                    0
                ),

            0

        );


    const totalPagado =

        db.pagosCompras.reduce(

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


    const cards =
        document.getElementById(
            "reportesCards"
        );


    if (
        cards
    ) {

        cards.innerHTML = `

            <div class="card">

                <div class="num">
                    ${fmtCLP(
                        totalVentas
                    )}
                </div>

                <div class="lbl">
                    Ventas acumuladas
                </div>

            </div>


            <div class="card good">

                <div class="num">
                    ${fmtCLP(
                        totalCobrado
                    )}
                </div>

                <div class="lbl">
                    Cobros acumulados
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${fmtCLP(
                        totalCompras
                    )}
                </div>

                <div class="lbl">
                    Compras acumuladas
                </div>

            </div>


            <div class="card bad">

                <div class="num">
                    ${fmtCLP(
                        totalPagado
                    )}
                </div>

                <div class="lbl">
                    Pagos proveedores
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${fmtCLP(
                        totalCuentasPorCobrar()
                    )}
                </div>

                <div class="lbl">
                    Por cobrar
                </div>

            </div>


            <div class="card warning">

                <div class="num">
                    ${fmtCLP(
                        totalCuentasPorPagar()
                    )}
                </div>

                <div class="lbl">
                    Por pagar
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${db.ordenesProduccion.length}
                </div>

                <div class="lbl">
                    Órdenes producción
                </div>

            </div>


            <div class="card">

                <div class="num">
                    ${db.fichasTecnicas.length}
                </div>

                <div class="lbl">
                    Fichas técnicas
                </div>

            </div>

        `;

    }


    renderTopProductos();


    asegurarBotonesReporteExtra();

}


// ======================================================
// BOTONES EXPORTACIÓN EXTRA
// ======================================================

function asegurarBotonesReporteExtra() {

    const contenedor =
        document.querySelector(
            "#view-reportes .report-buttons"
        );


    if (
        !contenedor
        ||
        document.getElementById(
            "exportStockPrendasBtn"
        )
    ) {

        return;

    }


    contenedor.insertAdjacentHTML(

        "beforeend",

        `

            <button
                class="btn"
                id="exportStockPrendasBtn"
                onclick="
                exportarStockPrendasCSV()
                "
            >
                Stock prendas CSV
            </button>


            <button
                class="btn"
                onclick="
                exportarAuditoriaCSV()
                "
            >
                Auditoría CSV
            </button>

        `

    );

}