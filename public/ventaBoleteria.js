let contadorAsistentes = 0;
let catalogosGlobales = null;

document.addEventListener("DOMContentLoaded", async function () {
  const fechaInput = document.getElementById("fechaCompra");
  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.value = hoy;
  const quienRecibio = document.getElementById("quienRecibio");
  const campoOtro = document.getElementById("campoOtro");
  function toggleCampoOtro() {

    if (quienRecibio.value === "99") {
      campoOtro.classList.remove("d-none");
    } else {
      campoOtro.classList.add("d-none");
    }
  }
  quienRecibio.addEventListener("change", toggleCampoOtro);
  toggleCampoOtro();
    await fetch("data/catalogos.json")
    .then(response => response.json())
    .then(data => {
      catalogosGlobales = data;
      cargarOpciones(data.mediosDePago, "medioPago");
      cargarIndicativos(data.indicativosTelefonicos, "paisTelefono");
      cargarOpciones(data.responsables, "quienRecibio");
      cargarPromociones(data.Promocion, "promocion");
    })
    .catch(error => console.error("Error cargando catalogos.json:", error));
  await cargarAsistenteInicial();
});

document.getElementById("agregarAsistente").addEventListener("click", async () => {
  if (!catalogosGlobales) {
    console.error("Catálogos no cargados aún");
    return;
  }
  contadorAsistentes++;
  const contenedor = document.getElementById("grupoAsistentes");
  const div = document.createElement("div");
  div.classList.add("row", "mb-3", "border", "p-3", "rounded", "bg-white");
  div.innerHTML = `
    <div class="col-12 mb-3 col-md-12">
      <label for="nombreAsistente_${contadorAsistentes}" class="form-label">Nombre del asistente:</label>
      <input type="text" class="form-control nombreAsistente" id="nombreAsistente_${contadorAsistentes}" required>
    </div>
    <div class="col-6 mb-3 col-md-5">
      <label for="tipoDocumentoAsistente_${contadorAsistentes}" class="form-label">Tipo de documento:</label>
      <select class="form-select tipoDocumentoAsistente" id="tipoDocumentoAsistente_${contadorAsistentes}" required></select>
    </div>
    <div class="col-6 mb-3 col-md-4">
      <label for="documentoAsistente_${contadorAsistentes}" class="form-label">Documento:</label>
      <input type="text" class="form-control documentoAsistente" id="documentoAsistente_${contadorAsistentes}" required>
    </div>
  `;
  contenedor.appendChild(div);
  cargarOpciones(catalogosGlobales.tiposDeDocumento, `tipoDocumentoAsistente_${contadorAsistentes}`);
});

async function cargarAsistenteInicial(){
  const contenedor = document.getElementById("grupoAsistentes");
  const div = document.createElement("div");
  div.classList.add("row", "mb-3", "border", "p-3", "rounded", "bg-white");
  div.innerHTML = `
    <div class="col-12 mb-3 col-md-12">
      <label for="nombreAsistente_${contadorAsistentes}" class="form-label">Nombre del asistente:</label>
      <input type="text" class="form-control nombreAsistente" id="nombreAsistente_${contadorAsistentes}" required>
    </div>
    <div class="col-6 mb-3 col-md-5">
      <label for="tipoDocumentoAsistente_${contadorAsistentes}" class="form-label">Tipo de documento:</label>
      <select class="form-select tipoDocumentoAsistente" id="tipoDocumentoAsistente_${contadorAsistentes}" required></select>
    </div>
    <div class="col-6 mb-3 col-md-4">
      <label for="documentoAsistente_${contadorAsistentes}" class="form-label">Documento:</label>
      <input type="text" class="form-control documentoAsistente" id="documentoAsistente_${contadorAsistentes}" required>
    </div>
  `;
  contenedor.appendChild(div);
  cargarOpciones(catalogosGlobales.tiposDeDocumento, `tipoDocumentoAsistente_${contadorAsistentes}`);

  if (contadorAsistentes === 0) {
    const inputNombreComprador = document.getElementById("nombre");
    const inputNombreAsistente = document.getElementById(`nombreAsistente_${contadorAsistentes}`);
    if (inputNombreComprador && inputNombreAsistente) {
      inputNombreAsistente.value = inputNombreComprador.value;
      let modificadoManualmente = false;
      inputNombreAsistente.addEventListener("input", function() {
        modificadoManualmente = true;
      });
      inputNombreComprador.addEventListener("input", function() {
        if (!modificadoManualmente) {
          inputNombreAsistente.value = inputNombreComprador.value;
        }
      });
    }
  }
}

// Enviar formulario
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formVenta");
  const submitBtn = form.querySelector('button[type="submit"]');
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(255,255,255,0.7)';
  overlay.style.display = 'none';
  overlay.style.zIndex = 9999;
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.innerHTML = `<div style="text-align:center"><div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status"><span class="visually-hidden">Cargando...</span></div><div class="mt-2">Procesando...</div></div>`;
  document.body.appendChild(overlay);

  function mostrarOverlay() {
    overlay.style.display = 'flex';
  }
  function ocultarOverlay() {
    overlay.style.display = 'none';
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const medioPago = document.getElementById("medioPago").value;
    const quienRecibio = document.getElementById("quienRecibio").value;

    if (medioPago === "0" && quienRecibio === "0") {
      alert("Por favor selecciona un medio de pago y una persona que recibió válidos.");
      return submitBtn.disabled = false;
    }
    if (medioPago === "0" && quienRecibio !== "0") {
      alert("Por favor selecciona un medio de pago válido.");
      return submitBtn.disabled = false;
    }
    if (medioPago !== "0" && quienRecibio === "0") {
      alert("Por favor selecciona una persona que recibió válida.");
      return submitBtn.disabled = false;
    }
    submitBtn.disabled = true;
    mostrarOverlay();
    try {
      await registrarAsistente(this);
      form.reset();
    } catch (error) {
      console.error("Error al registrar asistente:", error);
      submitBtn.disabled = false;
    }
    ocultarOverlay();
  });
  form.addEventListener("reset", () => {
    submitBtn.disabled = false;
    ocultarOverlay();
  });
});

async function registrarAsistente(formElement) {
  const formData = new FormData(formElement);
  const datosGenerales = Object.fromEntries(formData.entries());
  const indicativo = datosGenerales.paisTelefono || ""; 
  const celular = datosGenerales.celular || "";
  const celularCompleto = `${indicativo}${celular}`;
  const asistentes = [];
  const grupos = document.querySelectorAll("#grupoAsistentes .row");
  let asistentesFallidos = [];
  let mensaje = "Boletas registradas con éxito";

  for (const grupo of grupos) {
  let nombreAsistente = grupo.querySelector(".nombreAsistente").value.trim();
  nombreAsistente = nombreAsistente.replace(/\s+/g, '_');
  let documento = grupo.querySelector(".documentoAsistente").value.trim();
  documento = documento.replace(/\s+/g, '_');
    const tipoDocSelect = grupo.querySelector(".tipoDocumentoAsistente");
    const tipoDoc = tipoDocSelect.options[tipoDocSelect.selectedIndex].text;
    const promocionSelect = document.getElementById("promocion");
    const promocionTexto = promocionSelect.options[promocionSelect.selectedIndex].text;
    const medioPagoSelect = document.getElementById("medioPago");
    const medioPagoTexto = medioPagoSelect.options[medioPagoSelect.selectedIndex].text;
    const quienRecibioSelect = document.getElementById("quienRecibio");
    const quienRecibioTexto = quienRecibioSelect.options[quienRecibioSelect.selectedIndex].text;
    const comprobanteInput = document.getElementById("comprobante");
    const file = comprobanteInput.files[0];
    let comprobanteBase64, imagenBase64, comprobanteUrl;
    try {
      comprobanteBase64 = await convertirArchivoABase64(file);
      imagenBase64 = await generarImagenBoleta({ nombre: nombreAsistente, documento });
      comprobanteUrl = await subirComprobante(comprobanteBase64, documento);
      if (!comprobanteUrl) {
        asistentesFallidos.push(nombreAsistente);
        continue;
      }
    } catch (error) {
      asistentesFallidos.push(nombreAsistente);
      continue;
    }
    asistentes.push({
      nombreComprador: datosGenerales.nombre,
      nombreAsistente: nombreAsistente,
      TipoDocumentoAsistente: tipoDoc,
      DocumentoAsistente: documento,
      Promocion: promocionTexto,
      MedioPago: medioPagoTexto,
      QuienRecibio: quienRecibioTexto,
      FechaCompra: new Date().toISOString(),
      Comprobante: comprobanteUrl,
      Celular: celularCompleto,
      Referencia: documento,
      Boleta: imagenBase64,
      EnvioWhatsapp: 0
    });
  }

  for (const asistente of asistentes) {
    try {
      await fetch("/registrar-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asistente)
      });
    } catch (error) {
      console.error(`Error registrando boleta para ${asistente.nombreAsistente}:`, error);
      continue;
    }

    // Envío de WhatsApp y registro de historialEnvio
    const caption = `🎉 ¡Gracias ${asistente.nombreAsistente} por ser parte del Festival Conectando! 🎶✨\n\n` +
      `🗓 Te esperamos el 29 de noviembre en el Restaurante Campestre Villa Valeria en Usme, Bogotá. Las puertas abren a las 9:00 a.m. En el ingreso recibirás un cupón para reclamar una bebida (chicha, té de coca, café o agua) . No olvides tu vaso reutilizable. 🌎💚\n\n` +
      `Habrá emprendimientos con alimentos y almuerzo. 🍔🥙 \nNo se permite el ingreso de alimentos y/o bebidas, ni el consumo de drogas, cannabis u hongos. 🚫🍫🚫🌿🚫🍄\n\n` +
      `Trae impermeable o sombrilla para la lluvia 🌧☔ y, si puedes, un cojín 🛋 o colchoneta para sentarte. \n🪑Las sillas serán prioridad para las personas mayores, mujeres embarazadas, y niños de brazos. 👵🤰👶\n\n` +
      `📲 Mantente pendiente de nuestras redes sociales para actualizaciones.\n\n` +
      `🌞 ¡Nos para celebrar la vida y hacer de esta primera edición del festival algo inolvidable! 🙌🌈`;

    const reqGreen = {
      urlFile: asistente.Boleta,
      fileName: `boleta_${asistente.nombreAsistente.replace(/\s+/g, '_')}.png`,
      caption: caption,
      numero: '573058626761'//asistente.Celular
    };
    let respuestaServicio = "";
    let envioOk = false;
    try {
      const resp = await fetch("/enviar-mensaje-boleta-greenapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqGreen)
      });
      try {
        respuestaServicio = await resp.text();
      } catch (e) {
        respuestaServicio = "Error leyendo respuesta";
      }
      envioOk = resp.ok;
    } catch (error) {
      respuestaServicio = error?.message || "Error en envío";
      envioOk = false;
    }
    asistente.EnvioWhatsapp = envioOk ? 1 : 0;
    const historialEnvio = {
      fecha: new Date().toISOString(),
      mensaje: caption,
      respuesta: respuestaServicio
    };
    await fetch("/actualizar-envio-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referencia: asistente.Referencia, EnvioWhatsapp: asistente.EnvioWhatsapp, historialEnvio })
    });
  }

  if (asistentesFallidos.length > 0) {
    mensaje += `\nNo se registraron los siguientes asistentes por error en el comprobante: ${asistentesFallidos.join(", ")}`;
  }
  alert(mensaje);
  formElement.reset();
  document.getElementById("grupoAsistentes").innerHTML = "";
  
  alert(mensaje);
  formElement.reset();
  document.getElementById("grupoAsistentes").innerHTML = "";
}

function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function procesarBoletas(asistentes) {
  for (const asistente of asistentes) {
    try {
      await fetch("/registrar-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asistente)
      });

      const caption = `🎉 ¡Gracias ${asistente.nombreAsistente} por ser parte del Festival Conectando! 🎶✨\n\n` +
        `🗓 Te esperamos el 29 de noviembre en el Restaurante Campestre Villa Valeria en Usme, Bogotá. Las puertas abren a las 9:00 a.m. En el ingreso recibirás un cupón para reclamar una bebida (chicha, té de coca, café o agua) . No olvides tu vaso reutilizable. 🌎💚\n\n` +
        `Habrá emprendimientos con alimentos y almuerzo. 🍔🥙 \nNo se permite el ingreso de alimentos y/o bebidas, ni el consumo de drogas, cannabis u hongos. 🚫🍫🚫🌿🚫🍄\n\n` +
        `Trae impermeable o sombrilla para la lluvia 🌧☔ y, si puedes, un cojín 🛋 o colchoneta para sentarte. \n🪑Las sillas serán prioridad para las personas mayores, mujeres embarazadas, y niños de brazos. 👵🤰👶\n\n` +
        `📲 Mantente pendiente de nuestras redes sociales para actualizaciones.\n\n` +
        `🌞 ¡Nos para celebrar la vida y hacer de esta primera edición del festival algo inolvidable! 🙌🌈`;

      const reqGreen = {
        urlFile: asistente.Boleta,
        fileName: `boleta_${asistente.nombreAsistente.replace(/\s+/g, '_')}.png`,
        caption: caption,
        numero: '573058626761'//asistente.Celular
      };
      const resp = await fetch("/enviar-mensaje-boleta-greenapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqGreen)
      });
        let respuestaServicio = "";
        try {
          respuestaServicio = await resp.text();
        } catch (e) {
            historialComprobante.push({ paso: "inicio", fecha: new Date().toISOString(), mensaje: "Inicio generación comprobante" });
            comprobanteBase64 = await convertirArchivoABase64(file);
            historialComprobante.push({ paso: "base64", fecha: new Date().toISOString(), mensaje: "Archivo convertido a base64" });
            imagenBase64 = await generarImagenBoleta({ nombre: nombreAsistente, documento, referencia });
            historialComprobante.push({ paso: "imagenBoleta", fecha: new Date().toISOString(), mensaje: "Imagen boleta generada" });
            comprobanteUrl = await subirComprobante(comprobanteBase64, referencia);
            historialComprobante.push({ paso: "subidaCloudinary", fecha: new Date().toISOString(), mensaje: comprobanteUrl ? "Comprobante subido correctamente" : "Error al subir comprobante" });
            console.log('imagenBase64 ',imagenBase64 );
            console.log('comprobanteUrl ',comprobanteUrl );
            if (!comprobanteUrl) {
              historialComprobante.push({ paso: "error", fecha: new Date().toISOString(), mensaje: "No se obtuvo URL de comprobante" });
              asistentesFallidos.push(nombreAsistente);
              continue;
            }
          mensaje: caption,
            historialComprobante.push({ paso: "error", fecha: new Date().toISOString(), mensaje: error?.message || "Error desconocido" });
            asistentesFallidos.push(nombreAsistente);
            continue;
        await fetch("/actualizar-envio-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referencia: asistente.Referencia, EnvioWhatsapp: asistente.EnvioWhatsapp, historialEnvio })
        });
        }
    } catch (error) {
      asistente.EnvioWhatsapp = 0;
        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: error?.message || "Error en envío"
        };
        await fetch("/actualizar-envio-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
            EnvioWhatsapp: 0,
            historialComprobante,
            body: JSON.stringify({ referencia: asistente.Referencia, EnvioWhatsapp: 0, historialEnvio })
        });
      console.error(`Error procesando boleta para ${asistente.nombre}:`, error);
    }
  }
}

// Funciones auxiliares
function cargarOpciones(lista, selectId) {
  const select = document.getElementById(selectId);
  if (!select) {
    console.warn(`Elemento con ID ${selectId} no encontrado`);
    return;
  }
  lista.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id || item.nombre;
    option.textContent = item.nombre;
    select.appendChild(option);
  });
}

function cargarPromociones(lista, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  lista
    .filter(promo => {
      if (!promo.activo || !promo.fechaInicial || !promo.fechaFin) return false;
      const fechaInicio = new Date(promo.fechaInicial);
      const fechaFin = new Date(promo.fechaFin);
      return fechaInicio <= hoy && hoy <= fechaFin;
    })
    .forEach(promo => {
      const option = document.createElement("option");
      option.value = promo.idPromocion;
      option.textContent = `${promo.descripcion} - $${promo.precio}`;
      select.appendChild(option);
    });
}

function cargarIndicativos(lista, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  lista.forEach(item => {
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = `${item.pais} (${item.codigo})`;
    select.appendChild(option);
  });
}

async function generarImagenBoleta({ nombre, documento, referencia }) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/plantilla.png";

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.font = "bold 10px Arial";
      ctx.fillStyle = "#ffff";
      ctx.fillText(`Nombre completo: ${nombre}`, 50, 340);
      ctx.fillText(`Número de documento: ${documento}`, 50, 350);
      ctx.fillText(`Referencia: ${referencia}`, 50, 360);

      const imagenBase64 = canvas.toDataURL("image/png");

      const reqFb = { imagenBase64: imagenBase64, referencia: `${referencia}${nombre}`};
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

async function subirComprobante(base64, referencia) {
  try {
    const reqFb = {imagenBase64: base64,referencia: referencia};
    const response = await fetch("/subir-comprobante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqFb)
    });
    const data = await response.json();
    if (!response.ok || !data.url) {
      throw new Error(data.error || "No se pudo subir el comprobante");
    }
    return data.url;
  } catch (err) {
    console.error("Error subiendo comprobante:", err);
    throw err;
  }
}