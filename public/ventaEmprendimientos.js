// Generar referencia única para emprendimiento
async function generarReferenciaEmprendimiento() {
  const referencia = await obtenerReferenciaGlobal();
  return referencia;
}

// Generar imagen boleta para emprendimiento
async function generarImagenBoletaEmprendimiento({ nombreEmprendimiento, nombrePersona, documento, referencia, promocion }) {
  return new Promise((resolve, reject) => {

    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/plantilla_boleteria.png";

    img.onload = () => {
      canvas.width = img.width;   // 2000
      canvas.height = img.height; // 647

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0); // sin redimensionar

      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#000000ff";
      ctx.fillText(`Nombre completo:`, 1560, 275);
      ctx.fillText(`${nombrePersona}`, 1560, 295);
      ctx.fillText(`Número de documento:`, 1560, 315);
      ctx.fillText(`${documento}`, 1560, 335);

      ctx.font = "bold 25px Arial";
      ctx.fillText(`Emprendimiento:`, 1560, 450);
      ctx.fillText(`${nombreEmprendimiento}`, 1560, 490);
      
      ctx.font = "bold 35px Arial";
      ctx.fillText(`# ${referencia}`, 1850, 170);
      ctx.fillText(`Emprendimiento`, 1535, 170);

      const imagenBase64 = canvas.toDataURL("image/png");
      const reqFb = { imagenBase64: imagenBase64, referencia: `${referencia}` };
      fetch("/subir-imagen-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqFb),
      })
        .then(res => res.json())
        .then(data => {
          resolve(data.url);
        })
        .catch(err => console.error("Error enviando boleta:", err));
    };
    img.onerror = () => reject("Error al cargar la plantilla");
  });
}

document.addEventListener("DOMContentLoaded", async function () {

  // ...otros inicializadores...
  // Productos ofrecidos dinámicos
  const productosContainer = document.getElementById("productosContainer");
  const btnAgregarProducto = document.getElementById("agregarProducto");

    let catalogosGlobales = null;
  try {
    const resp = await fetch("data/catalogos.json");
    catalogosGlobales = await resp.json();
  } catch (e) {
    catalogosGlobales = {};
  }

    // Cargar promociones de emprendimientos
  if (catalogosGlobales && catalogosGlobales.PromocionEmprendimientos) {
    const selectPromo = document.getElementById("promocionEmprendimiento");
    selectPromo.innerHTML = "";
    catalogosGlobales.PromocionEmprendimientos.forEach(promo => {
      const option = document.createElement("option");
      option.value = promo.idPromocion;
      option.textContent = `${promo.descripcion} - $${promo.precio}`;
      option.dataset.precio = promo.precio;
      selectPromo.appendChild(option);
    });
  }

  btnAgregarProducto.addEventListener("click", function () {
    const div = document.createElement("div");
    div.className = "input-group mb-2 producto-item";
    div.innerHTML = `
      <input type="text" class="form-control producto-input" placeholder="Ejemplo: pulseras, arepas, jugos" required>
      <button type="button" class="btn btn-danger eliminar-producto">&times;</button>
    `;
    div.querySelector(".eliminar-producto").addEventListener("click", function () {
      div.remove();
    });
    productosContainer.appendChild(div);
    actualizarBotonesEliminarProducto();
  });
  function actualizarBotonesEliminarProducto() {
    const items = productosContainer.querySelectorAll('.producto-item');
    items.forEach((item, idx) => {
      const btn = item.querySelector('.eliminar-producto');
      btn.style.display = items.length > 1 ? '' : 'none';
    });
  }
  // Inicializar medios de pago y responsables después de cargar catálogo
  const selectMedioPago = document.getElementById("medioPago");
  const selectRecibidoPor = document.getElementById("recibidoPor");
  const inputRecibidoPorOtro = document.getElementById("recibidoPorOtro");
  if (catalogosGlobales && catalogosGlobales.mediosDePago) {
    selectMedioPago.innerHTML = "";
    catalogosGlobales.mediosDePago.forEach(m => {
      const option = document.createElement("option");
      option.value = m.nombre;
      option.textContent = m.nombre;
      selectMedioPago.appendChild(option);
    });
  }
  if (catalogosGlobales && catalogosGlobales.responsables) {
    selectRecibidoPor.innerHTML = "";
    catalogosGlobales.responsables.forEach(r => {
      const option = document.createElement("option");
      option.value = r.nombre;
      option.textContent = r.nombre;
      selectRecibidoPor.appendChild(option);
    });
  }
  selectRecibidoPor.addEventListener("change", function () {
    if (selectRecibidoPor.value === "Otro") {
      inputRecibidoPorOtro.style.display = "";
      inputRecibidoPorOtro.required = true;
    } else {
      inputRecibidoPorOtro.style.display = "none";
      inputRecibidoPorOtro.required = false;
      inputRecibidoPorOtro.value = "";
    }
  });
  actualizarBotonesEliminarProducto();
  // Categorías fijas + las del catálogo
  const categoriasFijas = [
    "Artesanías",
    "Comida",
    "Bebidas",
    "Ropa",
    "Medicinas"
  ];

  // Cargar categorías como checkboxes
  const categoriasCatalogo = (catalogosGlobales.categoriasEmprendimiento || []);
  const todasCategorias = [...categoriasFijas, ...categoriasCatalogo.map(c => c.nombre)];
  const contenedorCheckboxes = document.getElementById("categoriasCheckboxes");
  contenedorCheckboxes.innerHTML = "";
  todasCategorias.forEach((cat, idx) => {
    const div = document.createElement("div");
    div.className = "form-check col-6 col-md-4";
    div.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${cat}" id="cat_${idx}" name="categorias">
      <label class="form-check-label" for="cat_${idx}">${cat}</label>
    `;
    contenedorCheckboxes.appendChild(div);
  });
  // Cargar tipos de documento
  if (catalogosGlobales && catalogosGlobales.tiposDeDocumento) {
    const selectTipoDoc = document.getElementById("tipoDocumento");
    catalogosGlobales.tiposDeDocumento.forEach(tipo => {
      const option = document.createElement("option");
      option.value = tipo.id || tipo.nombre;
      option.textContent = tipo.nombre;
      selectTipoDoc.appendChild(option);
    });
  }
  // Redes sociales
  const redesOpciones = [
    { nombre: "Facebook", value: "facebook" },
    { nombre: "Instagram", value: "instagram" },
    { nombre: "Whatsapp", value: "whatsapp" },
    { nombre: "Página Web", value: "web" }
  ];
  const grupoRedes = document.getElementById("grupoRedes");
  document.getElementById("agregarRed").addEventListener("click", function () {
    const div = document.createElement("div");
    div.classList.add("redes-group", "row");
    div.innerHTML = `
      <div class="col-5 mb-2">
        <select class="form-select redSocial" required>
          ${redesOpciones.map(r => `<option value='${r.value}'>${r.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="col-6 mb-2">
        <input type="url" class="form-control urlRed" placeholder="URL de la red social" required>
      </div>
      <div class="col-1 mb-2 d-flex align-items-center">
        <button type="button" class="btn btn-danger btn-sm eliminarRed">&times;</button>
      </div>
    `;
    div.querySelector(".eliminarRed").addEventListener("click", function () {
      div.remove();
    });
    grupoRedes.appendChild(div);
  });

  // Formulario submit
  document.getElementById("formEmprendimiento").addEventListener("submit", async function (e) {
  // Obtener promoción seleccionada
  const promoSelect = document.getElementById("promocionEmprendimiento");
  const promoId = promoSelect.value;
  const promoText = promoSelect.options[promoSelect.selectedIndex].text;
  const promoValor = promoSelect.options[promoSelect.selectedIndex].dataset.precio;
    e.preventDefault();
    const nombreEmprendimiento = document.getElementById("nombreEmprendimiento").value.trim();
    const categorias = Array.from(document.querySelectorAll('input[name="categorias"]:checked')).map(cb => cb.value);
    const nombrePersona = document.getElementById("nombrePersona").value.trim();
  const tipoDocSelect = document.getElementById("tipoDocumento");
  const tipoDocumento = tipoDocSelect.options[tipoDocSelect.selectedIndex].text;
    const numeroDocumento = document.getElementById("numeroDocumento").value.trim();
    const celularPersona = document.getElementById("celularPersona").value.trim();
    const productos = Array.from(document.querySelectorAll('.producto-input')).map(inp => inp.value.trim()).filter(v => v);
    const redes = [];
    grupoRedes.querySelectorAll(".redes-group").forEach(grupo => {
      const tipo = grupo.querySelector(".redSocial").value;
      const url = grupo.querySelector(".urlRed").value.trim();
      if (tipo && url) {
        redes.push({ tipo, url });
      }
    });
    // Logo y comprobante de pago
    const logoFile = document.getElementById("logoEmprendimiento").files[0];
    const comprobanteFile = document.getElementById("comprobantePago").files[0];
    const medioPago = document.getElementById("medioPago").value;
    let recibidoPor = document.getElementById("recibidoPor").value;
    if (recibidoPor === "Otro") {
      recibidoPor = document.getElementById("recibidoPorOtro").value.trim();
    }
    if (!nombreEmprendimiento || categorias.length === 0 || !nombrePersona || !tipoDocumento || !numeroDocumento || !celularPersona || productos.length === 0 || !logoFile || !comprobanteFile || !medioPago || !recibidoPor) {
      alert("Por favor completa todos los campos obligatorios, incluyendo archivos e información de pago.");
      return;
    }
    // Subir archivos a Cloudinary (o tu endpoint de imágenes)
    let logoUrl = "", comprobanteUrl = "";
    try {
      logoUrl = await subirArchivoCloudinary(logoFile);
      comprobanteUrl = await subirArchivoCloudinary(comprobanteFile);
    } catch (err) {
      alert("Error al subir archivos. Intenta nuevamente.");
      return;
    }
    // Generar referencia y boleta antes de registrar
    const referencia = await generarReferenciaEmprendimiento();

    const imagenUrl = await generarImagenBoletaEmprendimiento({
      nombreEmprendimiento,
      nombrePersona,
      documento: numeroDocumento,
      referencia,
      promocion: promoText
    });

    const emprendimiento = {
      nombreEmprendimiento,
      redes,
      categorias,
      productos,
      nombrePersona,
      tipoDocumento,
      numeroDocumento,
      celularPersona,
      logoUrl,
      comprobanteUrl,
      medioPago,
      recibidoPor,
      promocion: promoText,
      valorPromocion: promoValor ? Number(promoValor) : 0,
      fechaRegistro: new Date().toISOString(),
      referencia,
      boleta: imagenUrl,
      EnvioWhatsapp: 0,
    };
    try {
      const resp = await fetch("/registrar-emprendimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emprendimiento)
      });
      const data = await resp.json();

      if (resp.ok) {

        // Envío de WhatsApp y registro de historial solo para este emprendimiento
        let caption = `🎉 ¡Gracias ${emprendimiento.nombreEmprendimiento} ${emprendimiento.nombrePersona} por ser parte del Festival Conectando! 🎶✨\n\n` +
          `🗓 Te esperamos el 29 de noviembre en el Restaurante Campestre Villa Valeria en Usme, Bogotá. Las puertas abren a las 9:00 a.m. En el ingreso recibirás un cupón para reclamar una bebida (chicha, té de coca, café o agua) . No olvides tu vaso reutilizable. 🌎💚\n\n` +
          `Habrá emprendimientos con alimentos y almuerzo. 🍔🥙 \nNo se permite el ingreso de alimentos y/o bebidas, ni el consumo de drogas, cannabis u hongos. 🚫🍫🚫🌿🚫🍄\n\n` +
          `Trae impermeable o sombrilla para la lluvia 🌧☔ y, si puedes, un cojín 🛋 o colchoneta para sentarte. \n🪑Las sillas serán prioridad para las personas mayores, mujeres embarazadas, y niños de brazos. 👵🤰👶\n\n` +
          `📲 Mantente pendiente de nuestras redes sociales para actualizaciones.\n\n` +
          `🌞 ¡Nos para celebrar la vida y hacer de esta primera edición del festival algo inolvidable! 🙌🌈`;

        const reqGreen = {
          urlFile: emprendimiento.boleta,
          fileName: `boleta_${emprendimiento.referencia}.png`,
          caption: caption,
          numero: '573058626761'//emprendimiento.Celular
        };

        let respuestaServicio = "";
        let envioOk = false;
        try {
          const respGreen = await fetch("/enviar-mensaje-boleta-greenapi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqGreen)
          });
          try {
            respuestaServicio = await respGreen.text();
          } catch (e) {
            respuestaServicio = "Error leyendo respuesta";
          }
          envioOk = respGreen.ok;
        } catch (error) {
          respuestaServicio = error?.message || "Error en envío";
          envioOk = false;
        }
        emprendimiento.EnvioWhatsapp = envioOk ? 1 : 0;
        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: respuestaServicio
        };
        await fetch("/actualizar-emprendimientos-envio-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referencia: emprendimiento.referencia, EnvioWhatsapp: emprendimiento.EnvioWhatsapp, historialEnvio })
        });

        alert("Emprendimiento registrado exitosamente.");
        this.reset();
        grupoRedes.innerHTML = "";
      } else {
        alert("Error al registrar el emprendimiento."+resp.ok);
      }
    } catch (err) {
      alert("Error de conexión al registrar el emprendimiento.");
    }
// Función para subir archivos a Cloudinary (o tu endpoint)
async function subirArchivoCloudinary(file) {
  // Convertir archivo a base64 como en ventaBoleteria.js
  const base64 = await convertirArchivoABase64(file);
  // Subir a tu endpoint (ejemplo: /subir-comprobante)
  const response = await fetch("/subir-comprobante", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenBase64: base64, referencia: Date.now().toString() })
  });
  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new Error(data.error || "No se pudo subir el archivo");
  }
  return data.url;
}
// Utilidad para convertir archivo a base64
function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
  });
});
async function obtenerReferenciaGlobal() {
  const resp = await fetch("/api/referencia-global?tipo=emprendimientos");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}