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
    await fetch("../data/catalogos.json")
    .then(response => response.json())
    .then(data => {
      catalogosGlobales = data;
      cargarOpciones(data.mediosDePago, "medioPago");
      cargarIndicativos(data.indicativosTelefonicos, "paisTelefono");
      cargarOpciones(data.responsables, "quienRecibio");
      cargarPromociones(data.promocion, "promocion");
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
    <div class="col-6 mb-3 col-md-3">
      <label for="tipoAsistente_${contadorAsistentes}" class="form-label">Tipo de asistente:</label>
      <select class="form-select tipoAsistente" id="tipoAsistente_${contadorAsistentes}" required>
        <option value="adulto">Adulto</option>
        <option value="niño">Niño (menor de 12 años)</option>
      </select>
    </div>
    <div class="col-6 mb-3 col-md-3 d-none" id="edadAsistenteContainer_${contadorAsistentes}">
      <label for="edadAsistente_${contadorAsistentes}" class="form-label">Edad del niño:</label>
      <input type="number" min="1" max="11" class="form-control edadAsistente" id="edadAsistente_${contadorAsistentes}" placeholder="Edad">
    </div>
  `;
  // Mostrar campo edad solo si es niño
  const tipoAsistenteSelect = div.querySelector(`#tipoAsistente_${contadorAsistentes}`);
  const edadContainer = div.querySelector(`#edadAsistenteContainer_${contadorAsistentes}`);
  tipoAsistenteSelect.addEventListener("change", function() {
    const edadInput = div.querySelector(`#edadAsistente_${contadorAsistentes}`);
    if (tipoAsistenteSelect.value === "niño") {
      edadContainer.classList.remove("d-none");
      edadInput.setAttribute("required", "required");
    } else {
      edadContainer.classList.add("d-none");
      edadInput.removeAttribute("required");
      edadInput.value = "";
    }
  });
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
    <div class="col-6 mb-3 col-md-3">
      <label for="tipoAsistente_${contadorAsistentes}" class="form-label">Tipo de asistente:</label>
      <select class="form-select tipoAsistente" id="tipoAsistente_${contadorAsistentes}" required>
        <option value="adulto">Adulto</option>
        <option value="niño">Niño (menor de 12 años)</option>
      </select>
    </div>
    <div class="col-6 mb-3 col-md-3 d-none" id="edadAsistenteContainer_${contadorAsistentes}">
      <label for="edadAsistente_${contadorAsistentes}" class="form-label">Edad del niño:</label>
      <input type="number" min="1" max="11" class="form-control edadAsistente" id="edadAsistente_${contadorAsistentes}" placeholder="Edad">
    </div>
  `;
  // Mostrar campo edad solo si es niño
  const tipoAsistenteSelect = div.querySelector(`#tipoAsistente_${contadorAsistentes}`);
  const edadContainer = div.querySelector(`#edadAsistenteContainer_${contadorAsistentes}`);
  tipoAsistenteSelect.addEventListener("change", function() {
    const edadInput = div.querySelector(`#edadAsistente_${contadorAsistentes}`);
    if (tipoAsistenteSelect.value === "niño") {
      edadContainer.classList.remove("d-none");
      edadInput.setAttribute("required", "required");
    } else {
      edadContainer.classList.add("d-none");
      edadInput.removeAttribute("required");
      edadInput.value = "";
    }
  });
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
    let contador = 1;
  const formData = new FormData(formElement);
  const datosGenerales = Object.fromEntries(formData.entries());
  const indicativo = datosGenerales.paisTelefono || ""; 
  const celular = datosGenerales.celular || "";
  const celularCompleto = `${indicativo}${celular}`;
  const asistentes = [];
    const grupos = document.querySelectorAll("#grupoAsistentes .row");
    // Generar referencia con formato yyyymmddhhmmss
    const now = new Date();
  let asistentesFallidos = [];
  let mensaje = "Boletas registradas con éxito";

  for (const grupo of grupos) {
    const referencia = await obtenerReferenciaGlobal();
    let nombreAsistente = grupo.querySelector(".nombreAsistente").value.trim();
    nombreAsistente = nombreAsistente.replace(/\s+/g, '_');
    let documento = grupo.querySelector(".documentoAsistente").value.trim();
    documento = documento.replace(/\s+/g, '_');
    const tipoDocSelect = grupo.querySelector(".tipoDocumentoAsistente");
    const tipoDoc = tipoDocSelect.options[tipoDocSelect.selectedIndex].text;
    const tipoAsistente = grupo.querySelector(".tipoAsistente").value;
    let edad = null;
    if (tipoAsistente === "niño") {
      edad = grupo.querySelector(".edadAsistente").value;
      if (!edad || isNaN(edad) || edad > 11 || edad < 1) {
        asistentesFallidos.push(`${nombreAsistente} (edad inválida)`);
        continue;
      }
    }
    const promocionSelect = document.getElementById("promocion");
    let promocionTexto = promocionSelect.options[promocionSelect.selectedIndex].text;
    if (tipoAsistente === "niño") {
      promocionTexto = "Niño (No paga)";
    }
    const medioPagoSelect = document.getElementById("medioPago");
    const medioPagoTexto = medioPagoSelect.options[medioPagoSelect.selectedIndex].text;
    const quienRecibioSelect = document.getElementById("quienRecibio");
    const quienRecibioTexto = quienRecibioSelect.options[quienRecibioSelect.selectedIndex].text;
    const comprobanteInput = document.getElementById("comprobante");
    const file = comprobanteInput.files[0];
    let comprobanteBase64, imagenBase64, comprobanteUrl;
    try {
      comprobanteBase64 = await convertirArchivoABase64(file);
        imagenBase64 = await generarImagenBoleta({ nombre: nombreAsistente, documento, referencia, tipoAsistente: promocionTexto, edad });
      comprobanteUrl = await subirComprobante(comprobanteBase64, documento);
      if (!comprobanteUrl) {
        asistentesFallidos.push(nombreAsistente);
        continue;
      }
    } catch (error) {
      asistentesFallidos.push(nombreAsistente);
      continue;
    }
    let valorBoleta = 0;
    if (tipoAsistente === "niño") {
      valorBoleta = 0;
    } else {
      // Buscar el valor de la promoción seleccionada
      const promoId = promocionSelect.value;
      const promoObj = catalogosGlobales.promocion.find(p => p.idPromocion == promoId);
      valorBoleta = promoObj ? Number(promoObj.precio) : 0;
    }
    asistentes.push({
      nombreComprador: datosGenerales.nombre,
      nombreAsistente: nombreAsistente,
      tipoDocumentoAsistente: tipoDoc,
      documentoAsistente: documento,
      promocion: promocionTexto,
      medioPago: medioPagoTexto,
      quienRecibio: quienRecibioTexto,
      fechaCompra: now.toISOString(),
      comprobante: comprobanteUrl,
      celular: celularCompleto,
      referencia: referencia,
      boleta: imagenBase64,
      envioWhatsapp: 0,
      tipoAsistente: tipoAsistente,
      edad: edad,
      valorBoleta: valorBoleta
    });
    contador=contador+1;
  }

  for (const asistente of asistentes) {
    try {
      await fetch("/registrar-boleta/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asistente)
      });

      // Envío de WhatsApp y registro de historial solo para este asistente
      let nombreAsistenteLimpio = asistente.nombreAsistente.replace(/_/g, ' ');
      let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].asistentes;
      let mensajeBaseTransporte = catalogosGlobales.MensajesWhatsapp[0].transporte;
      let captionTransporte = mensajeBaseTransporte.replace('{nombrePersona}', nombreAsistenteLimpio);
      let caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);
      if (asistente.tipoAsistente === "niño") {
        caption = `🧒 BOLETA NIÑO (menor de 12 años)\nEdad: ${asistente.edad}\n\n` + caption;
      }

      const reqGreen = {
        urlFile: asistente.boleta,
        fileName: `boleta_${asistente.nombreAsistente.replace(/\s+/g, '_')}.png`,
        caption: caption,
          numero: (() => {
            let num = asistente.celular.trim();
            if (/^(\+|57|58|51|52|53|54|55|56|591|593|595|598|1|44|34)/.test(num)) {
              return num.replace(/[^\d+]/g, '');
            } else {
              return '+57' + num.replace(/[^\d]/g, '');
            }
          })()
      };

      const reqGreenTransporte = {
        message: captionTransporte,
          numero: (() => {
            let num = asistente.celular.trim();
            if (/^(\+|57|58|51|52|53|54|55|56|591|593|595|598|1|44|34)/.test(num)) {
              return num.replace(/[^\d+]/g, '');
            } else {
              return '+57' + num.replace(/[^\d]/g, '');
            }
          })()
      };
      let respuestaServicio = "", respuestaServicioTransporte = "";
      let envioOk = false;
      try {
        const resp = await fetch("/enviar-whatsapp/envio", {
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
      try {
        const resp = await fetch("/enviar-whatsapp-mensaje/envio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqGreenTransporte)
        });
        console.log('Respuesta transporte:', resp);
        try {
          respuestaServicioTransporte = await resp.text();
        } catch (e) {
          respuestaServicioTransporte = "Error leyendo respuesta";
        }
      } catch (error) {
        respuestaServicioTransporte = error?.message || "Error en envío";
      }
      asistente.envioWhatsapp = envioOk ? 1 : 0;
      const historialEnvio = {
        fecha: new Date().toISOString(),
        mensaje: caption,
        respuesta: respuestaServicio
      };
      await fetch("/actualizar-boleta/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia: asistente.referencia, envioWhatsapp: asistente.envioWhatsapp, historialEnvio })
      });
    } catch (error) {
      console.error(`Error registrando boleta para ${asistente.nombreAsistente}:`, error);
      continue;
    }
  }

  if (asistentesFallidos.length > 0) {
    mensaje += `\nNo se registraron los siguientes asistentes por error en el comprobante: ${asistentesFallidos.join(", ")}`;
  }
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
      return fechaInicio <= hoy && hoy < fechaFin;
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

async function generarImagenBoleta({ nombre, documento, referencia, tipoAsistente, edad }) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "../data/plantilla_boletas.png";

    img.onload = () => {
     canvas.width = img.width;   // 2000
  canvas.height = img.height; // 647

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0); // sin redimensionar

      let nombreAsistenteLimpio = nombre.replace(/_/g, ' ');

      ctx.font = "bold 25px Arial";
      ctx.fillStyle = "#000000ff";
      ctx.fillText(`Nombre completo:`, 1560, 290);
      ctx.font = "bold 19px Arial";
      ctx.fillText(`${nombreAsistenteLimpio}`, 1560, 330);
      ctx.font = "bold 25px Arial";
      ctx.fillText(`Número de documento:`, 1560, 450);
      ctx.fillText(`${documento}`, 1560, 490);
      ctx.font = "bold 35px Arial";
      ctx.fillText(`# ${referencia}`, 1850, 180);
      if (tipoAsistente === "niño" || (tipoAsistente && tipoAsistente.includes("Niño (No paga)"))) {
        ctx.fillText(`Asistente Niño`, 1535, 180);
      }else{
        ctx.fillText(`Asistente`, 1535, 180);
      }
      const imagenBase64 = canvas.toDataURL("image/png");

      const reqFb = { imagenBase64: imagenBase64, referencia: `${referencia}_${nombre}`};
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

async function obtenerReferenciaGlobal() {
  const resp = await fetch("/api/referencia-global?tipo=asistentes");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}