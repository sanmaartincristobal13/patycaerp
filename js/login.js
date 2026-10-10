// ======================================================
// PATYCA - LOGIN
// ======================================================
//
// Las credenciales se validan en el backend (POST /api/auth/login).
// La API devuelve un token que se envía en cada solicitud
// siguiente como "Authorization: Bearer <token>".
// ======================================================

const sesionActual =
    sessionStorage.getItem(
        "usuarioPatyca"
    );


if (sesionActual && location.protocol !== 'file:') {

    window.location.href =
        "index.html";

}


document
    .getElementById(
        "loginForm"
    )
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const mensaje =
                document.getElementById(
                    "loginMsg"
                );


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


            mensaje.textContent =
                "";


            try {

                const respuesta =
                    await fetch(
                        "/api/auth/login",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );


                const datos =
                    await respuesta.json();


                if (!respuesta.ok) {

                    mensaje.textContent =
                        datos.error
                        ||
                        "No se pudo iniciar sesión.";

                    return;

                }


                sessionStorage.setItem(
                    "tokenPatyca",
                    datos.token
                );


                sessionStorage.setItem(
                    "usuarioPatyca",
                    JSON.stringify(
                        datos.usuario
                    )
                );


                window.location.href =
                    "index.html";

            }

            catch (error) {

                console.error(
                    error
                );

                mensaje.textContent =
                    "No se pudo conectar con el servidor.";

            }

        }
    );
