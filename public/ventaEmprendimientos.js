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
      fechaRegistro: new Date().toISOString()
    };
    try {
      const resp = await fetch("/registrar-emprendimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emprendimiento)
      });
      if (resp.ok) {
        alert("Emprendimiento registrado exitosamente.");
        this.reset();
        grupoRedes.innerHTML = "";
      } else {
        alert("Error al registrar el emprendimiento.");
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
