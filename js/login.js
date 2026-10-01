// ======================================================
// PATYCA - LOGIN
// ======================================================

const usuariosPatyca = [

    {
        email:
            "patricia@patyca.cl",

        password:
            "1234",

        nombre:
            "Patricia Norambuena",

        rol:
            "Administradora"
    },

    {
        email:
            "bodega@patyca.cl",

        password:
            "1234",

        nombre:
            "Usuario Bodega",

        rol:
            "Bodega"
    }

];


const sesionActual =
    sessionStorage.getItem(
        "usuarioPatyca"
    );


if (sesionActual) {

    window.location.href =
        "index.html";

}


document
    .getElementById(
        "loginForm"
    )
    .addEventListener(

        "submit",

        function(event) {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById(
                        "password"
                    )
                    .value;


            const usuario =
                usuariosPatyca.find(

                    item =>
                        item.email === email
                        &&
                        item.password ===
                        password

                );


            if (!usuario) {

                document
                    .getElementById(
                        "loginMsg"
                    )
                    .textContent =
                    "Correo o contraseña incorrectos.";

                return;

            }


            sessionStorage.setItem(

                "usuarioPatyca",

                JSON.stringify({

                    email:
                        usuario.email,

                    nombre:
                        usuario.nombre,

                    rol:
                        usuario.rol

                })

            );


            window.location.href =
                "index.html";

        }

    );