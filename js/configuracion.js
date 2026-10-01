// ======================================================
// PATYCA ERP V5 - CONFIGURACIÓN
// ======================================================


// ======================================================
// CARGAR CONFIGURACIÓN
// ======================================================

function cargarConfiguracion() {

    const configuracion =
        db.configuracion;


    setValue(

        "cfg_empresa",

        configuracion.empresa

    );


    setValue(

        "cfg_taller",

        configuracion.taller

    );


    setValue(

        "cfg_bodega1",

        configuracion.bodegas[0]
        ||
        "Bodega 1"

    );


    setValue(

        "cfg_bodega2",

        configuracion.bodegas[1]
        ||
        "Bodega 2"

    );


    setValue(

        "cfg_bodega3",

        configuracion.bodegas[2]
        ||
        "Bodega 3"

    );


    setValue(

        "cfg_stock_advertencia",

        configuracion
            .porcentajeAdvertenciaStock

    );


    setValue(

        "cfg_dias_vencimiento",

        configuracion
            .diasAvisoVencimiento

    );


    setValue(

        "cfg_saldo_inicial",

        configuracion
            .saldoInicial

    );


    setValue(

        "cfg_fecha_saldo",

        configuracion
            .fechaSaldoInicial

    );

}


// ======================================================
// COLOCAR VALOR
// ======================================================

function setValue(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (
        elemento
    ) {

        elemento.value =
            valor
            ??
            "";

    }

}


// ======================================================
// GUARDAR CONFIGURACIÓN
// ======================================================

function saveConfiguracion() {

    db.configuracion.empresa =

        document
            .getElementById(
                "cfg_empresa"
            )
            .value
            .trim();


    db.configuracion.taller =

        document
            .getElementById(
                "cfg_taller"
            )
            .value
            .trim();


    db.configuracion.bodegas = [

        document
            .getElementById(
                "cfg_bodega1"
            )
            .value
            .trim()

        ||

        "Bodega 1",


        document
            .getElementById(
                "cfg_bodega2"
            )
            .value
            .trim()

        ||

        "Bodega 2",


        document
            .getElementById(
                "cfg_bodega3"
            )
            .value
            .trim()

        ||

        "Bodega 3"

    ];


    db.configuracion
        .porcentajeAdvertenciaStock =

        Number(

            document
                .getElementById(
                    "cfg_stock_advertencia"
                )
                .value

            ||

            20

        );


    db.configuracion
        .diasAvisoVencimiento =

        Number(

            document
                .getElementById(
                    "cfg_dias_vencimiento"
                )
                .value

            ||

            5

        );


    db.configuracion
        .saldoInicial =

        Number(

            document
                .getElementById(
                    "cfg_saldo_inicial"
                )
                .value

            ||

            0

        );


    db.configuracion
        .fechaSaldoInicial =

        document
            .getElementById(
                "cfg_fecha_saldo"
            )
            .value;


    registrarActividad(

        "Configuración",

        "Configuración general actualizada"

    );


    persist();


    renderAll();


    alert(
        "Configuración guardada correctamente."
    );

}


// ======================================================
// SELECT BODEGAS
// ======================================================

function cargarSelectBodegas(
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

        db.configuracion.bodegas
            .map(

                bodega => `

                    <option
                        value="${bodega}"
                    >

                        ${bodega}

                    </option>

                `

            )
            .join("");

}


// ======================================================
// EXPORTAR RESPALDO
// ======================================================

function exportarRespaldo() {

    const contenido =
        JSON.stringify(

            db,

            null,

            2

        );


    const blob =
        new Blob(

            [
                contenido
            ],

            {
                type:
                    "application/json;charset=utf-8;"
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

        "PATYCA_respaldo_"

        +

        todayStr()

        +

        ".json";


    enlace.click();


    URL.revokeObjectURL(
        url
    );

}


// ======================================================
// SELECCIONAR RESPALDO
// ======================================================

function importarRespaldoInput() {

    document
        .getElementById(
            "backupInput"
        )
        .click();

}


// ======================================================
// IMPORTAR RESPALDO
// ======================================================

document
    .getElementById(
        "backupInput"
    )
    ?.addEventListener(

        "change",

        async event => {

            const archivo =
                event
                    .target
                    .files[0];


            if (
                !archivo
            ) {

                return;

            }


            try {

                const texto =
                    await archivo.text();


                const importado =
                    JSON.parse(
                        texto
                    );


                const confirmar =
                    confirm(

                        "¿Restaurar este respaldo?\n\n"
                        +
                        "Los datos actuales serán reemplazados."

                    );


                if (
                    !confirmar
                ) {

                    event.target.value =
                        "";

                    return;

                }


                db =
                    normalizarDb(
                        importado
                    );


                persist();


                renderAll();


                alert(
                    "Respaldo restaurado correctamente."
                );

            }


            catch (
                error
            ) {

                console.error(
                    error
                );


                alert(
                    "No se pudo importar el respaldo."
                );

            }


            finally {

                event.target.value =
                    "";

            }

        }

    );