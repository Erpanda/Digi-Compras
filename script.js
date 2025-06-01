$(document).ready(function () {
    const carrito = $('#carrito');
    const elemento1 = $('#productos');
    const lista = $('#lista-carrito tbody');
    const vaciarCarritoBtn = $('#vaciar-carrito');
    const imgCarrito = $('#img-carrito');
    const realizarCompra = $('#realizar-compra');
    const registro = $('#modal-registro');
    const verificarCliente = $('#registrarse');
    const cerrarRegistro = $('#cerrar-modal');
    const usuarioGuardado = sessionStorage.getItem('usuarioActual');
    let total = 0;

    // MOVER A LA SECCIÓN X
    $('nav a[href^="#"]').on('click', function(e) {
        e.preventDefault();
        const target = $($(this).attr('href'));
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top
            }, 600);
        }
    });

    // CONECCIÓN CON LA BASE DE DATOS FIREBASE
    var firebaseConfig = {
        apiKey: "Clave pública de tu app para autenticar con Firebase",
        authDomain: "Dominio web autorizado para el login y autenticación",
        projectId: "Identificador único de tu proyecto en Firebase",
        storageBucket: "Espacio en la nube donde se almacenan archivos (como imágenes o PDFs)",
        messagingSenderId: "ID que permite enviar notificaciones push a los usuarios",
        appId: "Identificador único de la app dentro del ecosistema de Firebase",
        measurementId: "ID usado para rastrear métricas con Google Analytics"
    };
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    // INICIALIZACIÓN DEL CLIENTE
    if (usuarioGuardado) {
        $('#nombre-usuario').text(usuarioGuardado);
        $('#usuario-actual').css('display', 'flex');
        $('#registrarse').prop('disabled', true);
    }

    // SUSCRIBRI CLINETE A FIREBASE
    $('.subscribe-form').on('submit', function(e) {
        e.preventDefault();
        suscribirCliente();
    });

    // IMPLEMETACIÓN DE BOTONES DE ACCIÓN
    cerrarRegistro.on('click', function () {
        $('#form-registro')[0]?.reset();
        showHideRegistro('cerrar');
    });

    verificarCliente.on('click', function (e) {
        e.preventDefault();
        if (sessionStorage.getItem('usuarioActual')) {
            realizarPago();
            return;
        }
        validarEntradaDatos();
    });

    imgCarrito.on('click', function (e) {
        e.stopPropagation();
        carrito.toggle(carrito.css('display') !== 'block');
    });

    carrito.on('mouseleave', function () {
        carrito.hide();
    });

    // MOSTRAMOS LA VENTANA DE CARGA
    function mostrarCarga(texto = "Enviando...") {
        $('#pantalla-carga .texto-carga').text(texto);
        $('#pantalla-carga').css('display', 'flex');
    }

    // OCULTAMOS LA VENTAAND E CARGA
    function ocultarCarga() {
        $('#pantalla-carga').hide();
    }

    // AGREGAR COMENTARIOS A LA BASE DE DATOS FIREBASE
    function guardarComentarioEnFirebase(datos) {
        mostrarCarga("Enviando comentario...");
        db.collection("comentarios").get().then(function (querySnapshot) {
            const nuevoNumero = querySnapshot.size + 1;
            const nuevoId = `comt-ID-n-${nuevoNumero}`;
            db.collection("comentarios").doc(nuevoId).set(datos)
                .then(function () {
                    ocultarCarga();
                    alert('¡Gracias por tu opinión! :)');
                    $('.testimonial-form form')[0].reset();
                })
                .catch(function (error) {
                    cultarCarga();
                    alert('Error al guardar el comentario: ' + error);
                });
        });
    }

    $('.testimonial-form form').on('submit', function (e) {
        e.preventDefault();

        const nombre = $(this).find('input[name="nombre-cmt"]').val().trim();
        const comentario = $(this).find('textarea[name="comentario"]').val().trim();
        const rating = $(this).find('input[name="rating"]:checked').val();

        if (!nombre || !comentario || !rating) {
            alert('Por favor, completa todos los campos y selecciona una calificación.');
            return false;
        }

        const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$/;
        if (!regexNombre.test(nombre)) {
            alert('El nombre no es válido. Usa solo letras y espacios.');
            $(this).find('input[name="nombre"]').focus();
            return false;
        }

        if (comentario.length < 5) {
            alert('El comentario debe tener al menos 5 caracteres.');
            $(this).find('textarea[name="comentario"]').focus();
            return false;
        }

        guardarComentarioEnFirebase({
            nombre: nombre,
            comentario: comentario,
            rating: rating,
            fecha: new Date()
        });
        return true;
    });

    // FUNCIONES Y ALAMCENAMIENTO DEL ESTADO DEL CARRITO DE COMPRAS
    function cargarEventListener() {
        elemento1.on('click', comprarElemento);
        carrito.on('click', eliminarElemento);
        vaciarCarritoBtn.on('click', vaciarCarrito);
        realizarCompra.on('click', verificarCarrito);
    }

    function comprarElemento(e) {
        e.preventDefault();
        const target = $(e.target);
        if (target.hasClass('agregar-carrito')) {
            const $elemento = target.closest('.product');
            leerDatosElemento($elemento);
        }
    }

    function leerDatosElemento(elemento) {
        const infoElemento = {
            imagen: elemento.find('img').attr('src'),
            titulo: elemento.find('h3').text(),
            precio: elemento.find('.precio').text(),
            id: elemento.find('a').data('id')
        };
        insertarCarrito(infoElemento);
    }

    function insertarCarrito(elemento) {
        const row = $(`
            <tr>
                <td><img src="${elemento.imagen}" width="100"/></td>
                <td>${elemento.titulo}</td>
                <td>${elemento.precio}</td>
                <td><a href="#" class="borrar" style="color: red;" data-id="${elemento.id}"> x </a></td>
            </tr>
        `);
        lista.append(row);
        $('#añadido-carrito').fadeIn(300).delay(1200).fadeOut(400);
        actualizarTotal();
        guardarCarritoEnSession();
    }

    function eliminarElemento(e) {
        e.preventDefault();
        const target = $(e.target);
        if (target.hasClass('borrar')) {
            target.closest('tr').remove();
            actualizarTotal();
            guardarCarritoEnSession();
        }
    }

    function vaciarCarrito(e) {
        e.preventDefault();
        mostrarCarga("Vaciando carrito...");
        lista.empty();
        actualizarTotal();
        guardarCarritoEnSession();
        ocultarCarga();
        return false;
    }

    function actualizarTotal() {
        total = 0;
        lista.find('tr').each(function () {
            const precioTd = $(this).find('td').eq(2);
            if (precioTd.length) {
                const precio = parseFloat(precioTd.text().replace(/[^\d.]/g, ''));
                if (!isNaN(precio)) total += precio;
            }
        });
        $('.total-pagar').text(`Total a pagar: S/ ${total.toFixed(2)}`);
        sessionStorage.setItem('totalCarrito', total.toFixed(2));
    }

    function guardarCarritoEnSession() {
        const productos = [];
        lista.find('tr').each(function () {
            const tds = $(this).find('td');
            productos.push({
                imagen: tds.eq(0).find('img').attr('src'),
                titulo: tds.eq(1).text(),
                precio: tds.eq(2).text(),
                id: tds.eq(3).find('a').data('id')
            });
        });
        sessionStorage.setItem('carrito', JSON.stringify(productos));
        sessionStorage.setItem('totalCarrito', total.toFixed(2));
    }

    function restaurarCarritoDeSession() {
        const productos = JSON.parse(sessionStorage.getItem('carrito') || '[]');
        lista.empty();
        productos.forEach(producto => {
            const row = $(`
                <tr>
                    <td><img src="${producto.imagen}" width="100"/></td>
                    <td>${producto.titulo}</td>
                    <td>${producto.precio}</td>
                    <td><a href="#" class="borrar" style="color: red;" data-id="${producto.id}"> x </a></td>
                </tr>
            `);
            lista.append(row);
        });
        total = parseFloat(sessionStorage.getItem('totalCarrito')) || 0;
        $('.total-pagar').text(`Total a pagar: S/ ${total.toFixed(2)}`);
    }

    // FUNCIONES PARA REGISTRAR Y VALIDACR LSO DATOS DEL CLIENTE
    function showHideRegistro(estado) {
        if (estado == "abrir") registro.css('display', 'flex');
        else registro.css('display', 'none');
    }

    function realizarPago() {
        mostrarCarga("Procesando compra...");
        const productos = JSON.parse(sessionStorage.getItem('carrito') || '[]');
        const totalPagar = sessionStorage.getItem('totalCarrito') || '0.00';
        const usuario = sessionStorage.getItem('usuarioActual') || 'Invitado';

        if (productos.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        db.collection('compras').add({
            usuario: usuario,
            productos: productos,
            total: totalPagar,
            fecha: new Date()
        })
        .then(function () {
            ocultarCarga();
            alert('¡Pago realizado con éxito! Gracias por tu compra.');
            vaciarCarrito({ preventDefault: () => {} });
        })
        .catch(function (error) {
            ocultarCarga();
            alert('Error al procesar el pago: ' + error);
        });
    }

    function verificarCarrito() {
        if (total === 0) {
            alert('El carrito está vacío. Agrega productos antes de continuar con la compra.');
            return false;
        }
        if (!sessionStorage.getItem('usuarioActual')) {
            showHideRegistro('abrir');
        } else {
            realizarPago();
        }
    }

    function guardarRegistroEnFirebase(datos) {
        db.collection("registros").get().then(function (querySnapshot) {
            const nuevoNumero = querySnapshot.size + 1;
            const nuevoId = `regt-ID-n${nuevoNumero}`;
            db.collection("registros").doc(nuevoId).set(datos)
                .then(function () {
                    ocultarCarga();
                    alert('¡Registro exitoso! Gracias por tu compra.');
                    $('#form-registro')[0]?.reset();
                    $('#modal-registro').css('display', 'none');
                    sessionStorage.setItem('usuarioActual', datos.nombre);
                    $('#nombre-usuario').text(datos.nombre);
                    $('#usuario-actual').css('display', 'flex');
                })
                .catch(function (error) {
                    ocultarCarga();
                    alert('Error al guardar el registro: ' + error);
                });
        });
    }

    
    function verificarCorreoExistente(coleccion, correo) {
        return db.collection(coleccion)
            .where('correo', '==', correo)
            .get()
            .then(function (querySnapshot) {
                return !querySnapshot.empty;
            });
    }

    function validarEntradaDatos() {
        const nombre = $('#nombre').val().trim();
        const apellidos = $('#apellidos').val().trim();
        const sexo = $('#sexo').val();
        const correo = $('#correo').val().trim();
        const info = $('input[name="info"]').is(':checked');
        const terminos = $('input[name="terminos"]').is(':checked');

        if (!nombre) return false;
        if (!apellidos) return false;
        if (!sexo) return false;
        if (!correo) return false;
        if (!info) return false;
        if (!terminos) return false;

        mostrarCarga("Registrando cliente...")
        verificarCorreoExistente('registros', correo).then(function (existe) {
            if (existe) {
                ocultarCarga();
                alert('Este correo ya está registrado.');
                return false;
            }
            guardarRegistroEnFirebase({
                nombre: nombre,
                apellidos: apellidos,
                sexo: sexo,
                correo: correo,
                info: info,
                terminos: terminos,
                fecha: new Date()
            });
        });
    }

    function guardarSuscripcionEnFirebase(datos) {
        db.collection("cliente_interesado").get().then(function (querySnapshot) {
            const nuevoNumero = querySnapshot.size + 1;
            const nuevoId = `cliente-ID-n-${nuevoNumero}`;
            db.collection("cliente_interesado").doc(nuevoId).set(datos)
                .then(function () {
                    ocultarCarga();
                    alert('¡Gracias por suscribrite! Le informaremos de cualquier noticia en su correo :)')
                    $('.subscribe-form')[0]?.reset();;
                })
                .catch(function (error) {
                    ocultarCarga();
                    alert('Error al registrar la suscripción: ' + error);
                });
        });
    }

    function suscribirCliente() {
        const correo = $('#correo-interesado').val().trim();
        const terminos = $('input[name="terminos-sucr"]').is(':checked');

        if (!correo) return false;
        if (!terminos) return false;

        mostrarCarga("Enviando suscripción...");
        verificarCorreoExistente('cliente_interesado', correo).then(function (existe) {
            if (existe) {
                ocultarCarga();
                alert('Este correo ya está suscrito.');
                return false;
            }
            guardarSuscripcionEnFirebase({
                correo: correo,
                fecha: new Date(),
                terminos: terminos
            });
        });
    }

    // CARRUSEL DE IMAGENES
    const track = $('.slider-track');
    const slides = $('.slider-slide');
    const nextBtn = $('.slider-btn.next');
    const prevBtn = $('.slider-btn.prev');
    let index = 0;

    function updateSlider() {
        track.css('transform', `translateX(-${index * 100}%)`);
    }

    nextBtn.on('click', function () {
        index = (index + 1) % slides.length;
        updateSlider();
    });

    prevBtn.on('click', function () {
        index = (index - 1 + slides.length) % slides.length;
        updateSlider();
    });

    // INICIALIZACIÓN FINAL
    cargarEventListener();
    restaurarCarritoDeSession();
});