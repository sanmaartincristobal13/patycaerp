// ==============================
// STOCK POR COLEGIO
// ==============================


function renderStockColegioChart() {


    const contenedor =

        document.getElementById(

            "stockColegioChart"

        );


    if (!contenedor) {

        return;

    }



    const porColegio = {};



    db.prendas.forEach(

        function(prenda) {


            const total =

                Object

                    .values(

                        prenda.tallas

                    )

                    .reduce(

                        function(a, b) {

                            return a + b;

                        },

                        0

                    );


            if (

                !porColegio[

                    prenda.colegio

                ]

            ) {


                porColegio[

                    prenda.colegio

                ] = 0;

            }


            porColegio[

                prenda.colegio

            ] += total;

        }

    );



    const registros =

        Object.entries(

            porColegio

        );



    if (

        registros.length === 0

    ) {


        contenedor.innerHTML =

            "No hay prendas registradas.";


        return;

    }



    const maximo =

        Math.max(

            ...registros.map(

                item => item[1]

            )

        );



    contenedor.innerHTML =

        registros

            .map(

                function(item) {


                    const colegio =

                        item[0];


                    const cantidad =

                        item[1];


                    const porcentaje =

                        Math.round(

                            cantidad /

                            maximo *

                            100

                        );


                    return `

                        <div class="chart-row">

                            <span>

                                ${colegio}

                            </span>


                            <div class="chart-track">

                                <div

                                    class="chart-bar"

                                    style="
                                    width:
                                    ${porcentaje}%
                                    "

                                ></div>

                            </div>


                            <strong>

                                ${cantidad}

                            </strong>

                        </div>

                    `;

                }

            )

            .join("");

}



// ==============================
// GASTOS POR CATEGORÍA
// ==============================


function renderGastoChart() {


    const contenedor =

        document.getElementById(

            "gastoChart"

        );


    if (!contenedor) {

        return;

    }



    const categorias = {};



    db.gastos.forEach(

        function(gasto) {


            if (

                !categorias[

                    gasto.categoria

                ]

            ) {


                categorias[

                    gasto.categoria

                ] = 0;

            }


            categorias[

                gasto.categoria

            ] += gasto.monto;

        }

    );



    const datos =

        Object.entries(

            categorias

        );



    if (

        datos.length === 0

    ) {


        contenedor.innerHTML =

            "No existen gastos.";


        return;

    }



    const maximo =

        Math.max(

            ...datos.map(

                item => item[1]

            )

        );



    contenedor.innerHTML =

        datos

            .map(

                function(item) {


                    const categoria =

                        item[0];


                    const monto =

                        item[1];


                    const porcentaje =

                        Math.round(

                            monto /

                            maximo *

                            100

                        );


                    return `

                        <div class="chart-row">


                            <span>

                                ${categoria}

                            </span>


                            <div class="chart-track">


                                <div

                                    class="chart-bar"

                                    style="
                                    width:
                                    ${porcentaje}%
                                    "

                                ></div>


                            </div>


                            <strong>

                                ${fmtCLP(monto)}

                            </strong>


                        </div>

                    `;

                }

            )

            .join("");

}