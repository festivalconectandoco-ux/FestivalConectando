let contadorAsistentes = 0;
let catalogosGlobales = null;

document.addEventListener("DOMContentLoaded", function () {
  // Establecer fecha actual
  const fechaInput = document.getElementById("fechaCompra");
  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.value = hoy;

  // Mostrar campo "Otro" si aplica
  document.getElementById("quienRecibio").addEventListener("change", function () {
    const campoOtro = document.getElementById("campoOtro");
    campoOtro.classList.toggle("d-none", this.value !== "Otro");
  });

  // Cargar catálogos
  fetch("data/catalogos.json")
    .then(response => response.json())
    .then(data => {
      catalogosGlobales = data;
      cargarOpciones(data.mediosDePago, "medioPago");
      cargarIndicativos(data.indicativosTelefonicos, "paisTelefono");
      cargarOpciones(data.responsables, "quienRecibio");
      cargarPromociones(data.Promocion, "promocion");
    })
    .catch(error => console.error("Error cargando catalogos.json:", error));
});

// Agregar asistentes dinámicamente
document.getElementById("agregarAsistente").addEventListener("click", () => {
  if (!catalogosGlobales) {
    console.error("Catálogos no cargados aún");
    return;
  }

  contadorAsistentes++;
  const contenedor = document.getElementById("grupoAsistentes");

  const div = document.createElement("div");
  div.classList.add("row", "mb-3", "border", "p-3", "rounded", "bg-white");
  div.innerHTML = `
    <div class="col-md-6">
      <label for="nombreAsistente_${contadorAsistentes}" class="form-label">Nombre del asistente:</label>
      <input type="text" class="form-control nombreAsistente" id="nombreAsistente_${contadorAsistentes}" required>
    </div>
    <div class="col-md-6">
      <label for="tipoDocumentoAsistente_${contadorAsistentes}" class="form-label">Tipo de documento:</label>
      <select class="form-select tipoDocumentoAsistente" id="tipoDocumentoAsistente_${contadorAsistentes}" required></select>
    </div>
    <div class="col-md-6">
      <label for="documentoAsistente_${contadorAsistentes}" class="form-label">Documento:</label>
      <input type="text" class="form-control documentoAsistente" id="documentoAsistente_${contadorAsistentes}" required>
    </div>
    <div class="col-md-6">
      <label for="tipoAsistente_${contadorAsistentes}" class="form-label">Tipo de asistente:</label>
      <select class="form-select tipoAsistente" id="tipoAsistente_${contadorAsistentes}" required></select>
    </div>
  `;
  contenedor.appendChild(div);

  cargarOpciones(catalogosGlobales.tiposDeDocumento, `tipoDocumentoAsistente_${contadorAsistentes}`);
  cargarTipoAsistente(catalogosGlobales.tipoAsistente, `tipoAsistente_${contadorAsistentes}`);
});

// Enviar formulario
document.getElementById("formVenta").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const datosGenerales = Object.fromEntries(formData.entries());
  const indicativo = datosGenerales.paisTelefono || ""; 
  const celular = datosGenerales.celular || "";
  const celularCompleto = `${indicativo}${celular}`;

  const asistentes = [];
  document.querySelectorAll("#grupoAsistentes .row").forEach(grupo => {
    const nombreAsistente = grupo.querySelector(".nombreAsistente").value;
    const documento = grupo.querySelector(".documentoAsistente").value;
    const tipoDocSelect = grupo.querySelector(".tipoDocumentoAsistente");
    const tipoDoc = tipoDocSelect.options[tipoDocSelect.selectedIndex].text;
    const tipoAsistenteSelect = grupo.querySelector(".tipoAsistente");
    const tipoAsistente = tipoAsistenteSelect.options[tipoAsistenteSelect.selectedIndex].text;

    const promocionSelect = document.getElementById("promocion");
    const promocionTexto = promocionSelect.options[promocionSelect.selectedIndex].text;

    const medioPagoSelect = document.getElementById("medioPago");
    const medioPagoTexto = medioPagoSelect.options[medioPagoSelect.selectedIndex].text;

    const quienRecibioSelect = document.getElementById("quienRecibio");
    const quienRecibioTexto = quienRecibioSelect.options[quienRecibioSelect.selectedIndex].text;

    const ahora = new Date();
    const referencia = ahora.getFullYear().toString() +
    String(ahora.getMonth() + 1).padStart(2, "0") +
    String(ahora.getDate()).padStart(2, "0") +
    String(ahora.getHours()).padStart(2, "0") +
    String(ahora.getMinutes()).padStart(2, "0") +
    String(ahora.getSeconds()).padStart(2, "0");

    asistentes.push({
        nombreComprador: datosGenerales.nombre,
        nombreAsistente: nombreAsistente,
        TipoDocumentoAsistente: tipoDoc,
        DocumentoAsistente: documento,
        TipoAsistente: tipoAsistente,
        Promocion: promocionTexto,
        MedioPago: medioPagoTexto,
        QuienRecibio: quienRecibioTexto,
        FechaCompra: new Date().toISOString(),
        Comprobante: "pendiente",
        Celular: celularCompleto,
        Referencia: referencia
    });
  });

  asistentes.forEach(asistente => {
    fetch("/registrar-boleta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asistente),
    })
      .then(res => res.json())
      .then(data => console.log("Boleta registrada:", data.codigo))
      .catch(err => console.error("Error registrando boleta:", err));
  });

  alert("Boletas registradas con éxito");
  this.reset();
  document.getElementById("grupoAsistentes").innerHTML = "";
});

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
  lista
    .filter(promo => promo.activo)
    .forEach(promo => {
      const option = document.createElement("option");
      option.value = promo.idPromocion;
      option.textContent = `${promo.descripcion} - $${promo.precio}`;
      select.appendChild(option);
    });
}

function cargarTipoAsistente(lista, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  lista
    .filter(tipo => tipo.visible)
    .forEach(tipo => {
      const option = document.createElement("option");
      option.value = tipo.id;
      option.textContent = tipo.nombre;
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