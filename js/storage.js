// ======================================================
// PATYCA ERP V6
// SISTEMA DE ALMACENAMIENTO
// ======================================================

const STORAGE_KEY =
    "patyca_v6_erp";


const LEGACY_KEYS = [

    "patyca_v5_erp",
    "patyca_v4_erp",
    "patyca_v3_erp"

];


// ======================================================
// ADAPTADOR DE DATOS
// ======================================================
//
// La aplicación usa Store.
//
// Hoy:
//      Store → localStorage
//
// En el futuro podemos reemplazar Store por:
//      Supabase
//      Firebase
//      API propia
//      MySQL / PostgreSQL
//
// sin tener que rehacer todos los módulos.
// ======================================================

const Store = {


    load() {

        // Primero buscamos V6

        const actual =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (actual) {

            try {

                return JSON.parse(
                    actual
                );

            }

            catch (error) {

                console.error(
                    "Error leyendo V6:",
                    error
                );

            }

        }


        // ==================================================
        // MIGRACIÓN AUTOMÁTICA DESDE VERSIONES ANTERIORES
        // ==================================================

        for (
            const key
            of
            LEGACY_KEYS
        ) {

            const legacy =
                localStorage.getItem(
                    key
                );


            if (!legacy) {
                continue;
            }


            try {

                const datos =
                    JSON.parse(
                        legacy
                    );


                localStorage.setItem(

                    STORAGE_KEY,

                    JSON.stringify(
                        datos
                    )

                );


                console.info(

                    "PATYCA ERP migrado desde",

                    key,

                    "a",

                    STORAGE_KEY

                );


                return datos;

            }

            catch (error) {

                console.error(

                    "No se pudo migrar",

                    key,

                    error

                );

            }

        }


        return null;

    },


    save(data) {

        try {

            localStorage.setItem(

                STORAGE_KEY,

                JSON.stringify(
                    data
                )

            );


            return true;

        }

        catch (error) {

            console.error(

                "No fue posible guardar PATYCA ERP.",

                error

            );


            alert(

                "No fue posible guardar los datos. "
                +
                "Es posible que el almacenamiento del navegador esté lleno."

            );


            return false;

        }

    },


    clear() {

        localStorage.removeItem(
            STORAGE_KEY
        );

    },


    export() {

        return JSON.stringify(

            this.load()
            ||
            {},

            null,

            2

        );

    }

};