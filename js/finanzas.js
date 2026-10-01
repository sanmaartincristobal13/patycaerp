// ======================================================
// PATYCA ERP V6 - FINANZAS PROFESIONALES
// ======================================================


// ======================================================
// FILTRO FINANCIERO
// ======================================================

function asegurarFiltroFinanzas() {

    const seccion =

        document.getElementById(
            "view-finanzas"
        );


    if (
        !seccion
        ||
        document.getElementById(
            "finanzasFiltros"
        )
    ) {

        return;

    }


    const cards =

        document.getElementById(
            "finanzasCards"
        );


    const bloque =

        document.createElement(
            "div"
        );


    bloque.id =
        "finanzasFiltros";


    bloque.className =
        "panel compact";


    bloque.innerHTML = `

        <div class="field-row">

            <div class="field">

                <label>
                    Mes de análisis
                </label>

                <input
                    id="fin_mes"
                    type="month"
                    value="${todayStr().slice(0, 7)}"
                    onchange="renderFinanzas()"
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
// MOVIMIENTOS DE CAJA REALES
// ======================================================

function movimientosFinancieros() {

    const movimientos =
        [];


    // ==================================================
    // COBROS DE VENTAS
    // ==================================================

    db.pagosVentas.forEach(

        pago => {

            movimientos.push({

                fecha:
                    pago.fecha,

                tipo:
                    "Ingreso",

                categoria:
                    "Cobro de venta",

                concepto:

                    pago.codigo
                    +
                    " · "
                    +
                    pago.ventaCodigo,

                monto:

                    Number(
                        pago.monto
                        ||
                        0
                    )

            });

        }

    );


    // ==================================================
    // GASTOS OPERACIONALES
    // ==================================================

    db.gastos.forEach(

        gasto => {

            movimientos.push({

                fecha:
                    gasto.fecha,

                tipo:
                    "Egreso",

                categoria:
                    gasto.categoria,

                concepto:

                    (
                        gasto.codigo
                        ||
                        ""
                    )

                    +
                    " · "
                    +
                    gasto.concepto,

                monto:

                    -Number(
                        gasto.monto
                        ||
                        0
                    )

            });

        }

    );


    // ==================================================
    // PAGOS A PROVEEDORES
    // ==================================================

    db.pagosCompras.forEach(

        pago => {

            movimientos.push({

                fecha:
                    pago.fecha,

                tipo:
                    "Egreso",

                categoria:
                    "Pago a proveedor",

                concepto:

                    pago.codigo
                    +
                    " · "
                    +
                    pago.compraCodigo,

                monto:

                    -Number(
                        pago.monto
                        ||
                        0
                    )

            });

        }

    );


    movimientos.sort(

        (
            a,
            b
        ) =>

            String(
                a.fecha
            )
            .localeCompare(

                String(
                    b.fecha
                )

            )

    );


    let saldo =

        Number(
            db.configuracion
                .saldoInicial
            ||
            0
        );


    return movimientos.map(

        movimiento => {

            saldo +=
                movimiento.monto;


            return {

                ...movimiento,

                saldo:
                    saldo

            };

        }

    );

}


// ======================================================
// RESUMEN MENSUAL
// ======================================================

function resumenMensualFinanzas() {

    const meses =
        new Set();


    [

        ...db.ventas.map(
            item =>
                item.fecha
        ),

        ...db.pagosVentas.map(
            item =>
                item.fecha
        ),

        ...db.compras.map(
            item =>
                item.fecha
        ),

        ...db.pagosCompras.map(
            item =>
                item.fecha
        ),

        ...db.gastos.map(
            item =>
                item.fecha
        )

    ]
    .filter(
        Boolean
    )
    .forEach(

        fecha => {

            meses.add(

                String(
                    fecha
                )
                .slice(
                    0,
                    7
                )

            );

        }

    );


    return [

        ...meses

    ]
    .sort()
    .map(

        mes => {

            const ventasRegistradas =

                db.ventas
                    .filter(

                        item =>
                            String(
                                item.fecha
                            )
                            .startsWith(
                                mes
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
                                item.total
                                ||
                                0
                            ),

                        0

                    );


            const cobrado =

                db.pagosVentas
                    .filter(

                        item =>
                            String(
                                item.fecha
                            )
                            .startsWith(
                                mes
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
                                item.monto
                                ||
                                0
                            ),

                        0

                    );


            const comprasRegistradas =

                db.compras
                    .filter(

                        item =>
                            String(
                                item.fecha
                            )
                            .startsWith(
                                mes
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
                                item.total
                                ||
                                0
                            ),

                        0

                    );


            const pagadoProveedores =

                db.pagosCompras
                    .filter(

                        item =>
                            String(
                                item.fecha
                            )
                            .startsWith(
                                mes
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
                                item.monto
                                ||
                                0
                            ),

                        0

                    );


            const gastos =

                db.gastos
                    .filter(

                        item =>
                            String(
                                item.fecha
                            )
                            .startsWith(
                                mes
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
                                item.monto
                                ||
                                0
                            ),

                        0

                    );


            return {

                mes,

                ventasRegistradas,

                cobrado,

                comprasRegistradas,

                pagadoProveedores,

                gastos,

                flujoNeto:

                    cobrado
                    -
                    pagadoProveedores
                    -
                    gastos

            };

        }

    );

}


// ======================================================
// CUENTAS POR COBRAR
// ======================================================

function totalCuentasPorCobrar() {

    return db.ventas.reduce(

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

}


// ======================================================
// CUENTAS POR PAGAR
// ======================================================

function totalCuentasPorPagar() {

    return db.compras.reduce(

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

}


// ======================================================
// RENDER FINANZAS
// ======================================================

function renderFinanzas() {

    asegurarFiltroFinanzas();


    const mes =

        document
            .getElementById(
                "fin_mes"
            )
            ?.value

        ||

        todayStr()
            .slice(
                0,
                7
            );


    const resumen =

        resumenMensualFinanzas();


    const actual =

        resumen.find(

            item =>
                item.mes ===
                mes

        )

        ||

        {

            ventasRegistradas:
                0,

            cobrado:
                0,

            comprasRegistradas:
                0,

            pagadoProveedores:
                0,

            gastos:
                0,

            flujoNeto:
                0

        };


    const porCobrar =
        totalCuentasPorCobrar();


    const porPagar =
        totalCuentasPorPagar();


    const movimientos =
        movimientosFinancieros();


    const saldoActual =

        movimientos.length

        ?

        movimientos[
            movimientos.length
            -
            1
        ].saldo

        :

        Number(
            db.configuracion
                .saldoInicial
            ||
            0
        );


    const valorInventario =

        db.materiales.reduce(

            (
                suma,
                material
            ) => {

                if (
                    material.stock ===
                    null
                ) {

                    return suma;

                }


                return (

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
                    )

                );

            },

            0

        );


    document
        .getElementById(
            "finanzasCards"
        )
        .innerHTML = `

            <div class="card">

                <div class="num">

                    ${fmtCLP(
                        actual.ventasRegistradas
                    )}

                </div>

                <div class="lbl">
                    Ventas registradas
                </div>

            </div>


            <div class="card good">

                <div class="num">

                    ${fmtCLP(
                        actual.cobrado
                    )}

                </div>

                <div class="lbl">
                    Cobrado
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

                    ${fmtCLP(
                        actual.comprasRegistradas
                    )}

                </div>

                <div class="lbl">
                    Compras registradas
                </div>

            </div>


            <div class="card bad">

                <div class="num">

                    ${fmtCLP(
                        actual.pagadoProveedores
                    )}

                </div>

                <div class="lbl">
                    Pagado proveedores
                </div>

            </div>


            <div class="card warning">

                <div class="num">

                    ${fmtCLP(
                        porPagar
                    )}

                </div>

                <div class="lbl">
                    Cuentas por pagar
                </div>

            </div>


            <div
                class="
                card
                ${
                    actual.flujoNeto >= 0

                    ?

                    "good"

                    :

                    "bad"
                }
                "
            >

                <div class="num">

                    ${fmtCLP(
                        actual.flujoNeto
                    )}

                </div>

                <div class="lbl">
                    Flujo neto del mes
                </div>

            </div>


            <div class="card">

                <div class="num">

                    ${fmtCLP(
                        saldoActual
                    )}

                </div>

                <div class="lbl">
                    Saldo calculado
                </div>

            </div>


            <div class="card">

                <div class="num">

                    ${fmtCLP(
                        valorInventario
                    )}

                </div>

                <div class="lbl">
                    Inventario valorizado conocido
                </div>

            </div>

        `;


    // ==================================================
    // CAMBIAR ENCABEZADOS TABLA EXISTENTE
    // ==================================================

    const tablaResumen =

        document
            .getElementById(
                "tablaResumenMensual"
            )
            ?.closest(
                "table"
            );


    if (
        tablaResumen
    ) {

        const headers =

            tablaResumen.querySelectorAll(
                "thead th"
            );


        const nombres = [

            "Mes",
            "Ventas registradas",
            "Cobrado",
            "Pagos + gastos",
            "Flujo neto"

        ];


        headers.forEach(

            (
                th,
                indice
            ) => {

                if (
                    nombres[indice]
                ) {

                    th.textContent =
                        nombres[indice];

                }

            }

        );

    }


    document
        .getElementById(
            "tablaResumenMensual"
        )
        .innerHTML =

        resumen.length

        ?

        resumen
            .slice()
            .reverse()
            .map(

                item => `

                    <tr>

                        <td>
                            ${item.mes}
                        </td>

                        <td>

                            ${fmtCLP(
                                item.ventasRegistradas
                            )}

                        </td>

                        <td>

                            ${fmtCLP(
                                item.cobrado
                            )}

                        </td>

                        <td>

                            ${fmtCLP(

                                item.pagadoProveedores
                                +
                                item.gastos

                            )}

                        </td>

                        <td
                            class="
                            ${
                                item.flujoNeto >= 0

                                ?

                                "money-positive"

                                :

                                "money-negative"
                            }
                            "
                        >

                            ${fmtCLP(
                                item.flujoNeto
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
                    Sin movimientos financieros.
                </td>

            </tr>

        `;


    // ==================================================
    // FLUJO DE CAJA
    // ==================================================

    document
        .getElementById(
            "tablaMovimientosFinanzas"
        )
        .innerHTML =

        movimientos.length

        ?

        movimientos
            .slice()
            .reverse()
            .map(

                movimiento => `

                    <tr data-searchable>

                        <td>
                            ${movimiento.fecha}
                        </td>

                        <td>
                            ${movimiento.tipo}
                        </td>

                        <td>
                            ${movimiento.categoria}
                        </td>

                        <td>
                            ${movimiento.concepto}
                        </td>

                        <td
                            class="
                            ${
                                movimiento.monto >= 0

                                ?

                                "money-positive"

                                :

                                "money-negative"
                            }
                            "
                        >

                            ${fmtCLP(
                                movimiento.monto
                            )}

                        </td>

                        <td>

                            ${fmtCLP(
                                movimiento.saldo
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
                    colspan="6"
                    class="empty"
                >
                    No existen movimientos de caja.
                </td>

            </tr>

        `;


    renderGraficoFinanzas(
        movimientos
    );


    renderGraficoIngresosEgresos(
        resumen
    );

}


// ======================================================
// GRÁFICO SALDO
// ======================================================

function renderGraficoFinanzas(
    movimientos
) {

    const contenedor =

        document.getElementById(
            "graficoFinanzas"
        );


    if (
        !contenedor
    ) {

        return;

    }


    if (
        movimientos.length ===
        0
    ) {

        contenedor.innerHTML = `

            <div class="empty">

                Sin movimientos de caja.

            </div>

        `;

        return;

    }


    const valores =

        movimientos.map(

            item =>
                item.saldo

        );


    const maximo =
        Math.max(
            ...valores
        );


    const minimo =
        Math.min(
            ...valores
        );


    const rango =

        maximo
        -
        minimo
        ||
        1;


    const puntos =

        movimientos.map(

            (
                movimiento,
                indice
            ) => {

                const x =

                    20

                    +

                    indice

                    *

                    (
                        760

                        /

                        Math.max(

                            movimientos.length
                            -
                            1,

                            1

                        )
                    );


                const y =

                    200

                    -

                    (
                        (
                            movimiento.saldo
                            -
                            minimo
                        )

                        /

                        rango
                    )

                    *

                    170;


                return (
                    x
                    +
                    ","
                    +
                    y
                );

            }

        )
        .join(
            " "
        );


    contenedor.innerHTML = `

        <svg
            viewBox="0 0 800 220"
            preserveAspectRatio="none"
        >

            <polyline

                points="${puntos}"

                fill="none"

                stroke="currentColor"

                stroke-width="4"

                stroke-linecap="round"

                stroke-linejoin="round"

            />

        </svg>

    `;

}


// ======================================================
// INGRESOS VS EGRESOS
// ======================================================

function renderGraficoIngresosEgresos(
    mensual
) {

    const contenedores =

        document.querySelectorAll(
            "#graficoIngresosEgresos"
        );


    if (
        !contenedores.length
    ) {

        return;

    }


    if (
        !mensual.length
    ) {

        contenedores.forEach(

            contenedor => {

                contenedor.innerHTML = `

                    <div class="empty">

                        Sin datos mensuales.

                    </div>

                `;

            }

        );

        return;

    }


    const ultimos =

        mensual.slice(
            -6
        );


    const maximo =

        Math.max(

            1,

            ...ultimos.flatMap(

                item => [

                    item.cobrado,

                    item.pagadoProveedores
                    +
                    item.gastos

                ]

            )

        );


    const html = `

        <div class="bar-chart">

            ${

                ultimos.map(

                    item => {

                        const ingreso =

                            Math.max(

                                3,

                                item.cobrado
                                /
                                maximo
                                *
                                100

                            );


                        const egreso =

                            Math.max(

                                3,

                                (
                                    item.pagadoProveedores
                                    +
                                    item.gastos
                                )

                                /

                                maximo

                                *

                                100

                            );


                        return `

                            <div class="bar-month">

                                <div class="bar-pair">

                                    <div
                                        class="
                                        bar
                                        income
                                        "
                                        style="
                                        height:${ingreso}%
                                        "
                                    ></div>

                                    <div
                                        class="
                                        bar
                                        expense
                                        "
                                        style="
                                        height:${egreso}%
                                        "
                                    ></div>

                                </div>

                                <span>
                                    ${item.mes.slice(5)}
                                </span>

                            </div>

                        `;

                    }

                )
                .join("")

            }

        </div>


        <div class="chart-legend">

            <span>

                <i
                    class="legend-income"
                ></i>

                Cobros

            </span>

            <span>

                <i
                    class="legend-expense"
                ></i>

                Pagos y gastos

            </span>

        </div>

    `;


    contenedores.forEach(

        contenedor => {

            contenedor.innerHTML =
                html;

        }

    );

}