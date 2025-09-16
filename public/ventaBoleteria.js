let contadorAsistentes = 0;
let catalogosGlobales = null;

document.addEventListener("DOMContentLoaded", async function () {
  const fechaInput = document.getElementById("fechaCompra");
  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.value = hoy;
  const quienRecibio = document.getElementById("quienRecibio");
  const campoOtro = document.getElementById("campoOtro");
  console.log('campoOtro ',campoOtro)
  function toggleCampoOtro() {
      console.log('quienRecibio.value ',quienRecibio.value)

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

// Agregar asistentes dinámicamente
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

  // Llenar el nombre del primer asistente con el nombre del comprador si existe
  if (contadorAsistentes === 0) {
    const inputNombreComprador = document.getElementById("nombre");
    const inputNombreAsistente = document.getElementById(`nombreAsistente_${contadorAsistentes}`);
    if (inputNombreComprador && inputNombreAsistente) {
      inputNombreAsistente.value = inputNombreComprador.value;
      // Si el usuario cambia el nombre del comprador, actualizar el del asistente solo si no ha sido modificado manualmente
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
    try {
      await registrarAsistente(this);
      form.reset();
    } catch (error) {
      console.error("Error al registrar asistente:", error);
      submitBtn.disabled = false;
    }
  });
  form.addEventListener("reset", () => {
    submitBtn.disabled = false;
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

  for (const grupo of grupos) {
    const nombreAsistente = grupo.querySelector(".nombreAsistente").value;
    const documento = grupo.querySelector(".documentoAsistente").value;
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
    const ahora = new Date();
    const referencia = ahora.getFullYear().toString() +
      String(ahora.getMonth() + 1).padStart(2, "0") +
      String(ahora.getDate()).padStart(2, "0") +
      String(ahora.getHours()).padStart(2, "0") +
      String(ahora.getMinutes()).padStart(2, "0") +
      String(ahora.getSeconds()).padStart(2, "0");

    const comprobanteBase64 = await convertirArchivoABase64(file);
    const imagenBase64 = await generarImagenBoleta({ nombre: nombreAsistente, documento, referencia });
    const comprobanteUrl = await subirComprobante(comprobanteBase64,referencia);

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
      Referencia: referencia,
      Boleta: imagenBase64,
      EnvioWhatsapp: 0
    });
  }
  await procesarBoletas(asistentes);
  alert("Boletas registradas con éxito");
  formElement.reset();
  document.getElementById("grupoAsistentes").innerHTML = "";
}

function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // Devuelve el base64 completo (con MIME)
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file); // Convierte el archivo
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

      const reqWp = {
        from: "whatsapp:+14155238886",
        to: `whatsapp:${asistente.Celular}`,
        body: `Hola ${asistente.nombreAsistente}, bienvenido al festival conectando!`,
        mediaUrl: asistente.Boleta
      };

      await fetch("/enviar-mensaje-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqWp)
      });
    } catch (error) {
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
      ctx.fillText(`Número de d ocumento: ${documento}`, 50, 350);
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
          resolve(data.url); // ← Aquí retornas la URL pública
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
    return data.url; // ← Devuelve la URL pública
  } catch (err) {
    console.error("Error subiendo comprobante:", err);
    throw err; // ← Propaga el error para que el caller lo maneje
  }
}