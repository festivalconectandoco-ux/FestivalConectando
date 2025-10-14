let catalogosGlobales = null;
document.addEventListener("DOMContentLoaded", async () => {
  let asistentesGlobal = [];
  fetch("../data/catalogos.json")
    .then(res => res.json())
    .then(async catalogos => {
      catalogosGlobales = catalogos;
          const resp = await fetch("/api/traer-todo");
          const data = await resp.json();
          asistentesGlobal = data.boletas;
          await mostrarBoletasAgrupadas(asistentesGlobal);
    })
    .catch(err => console.error("Error cargando catálogo:", err));

  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btnDescargarExcel') {
      if (!asistentesGlobal || asistentesGlobal.length === 0) {
        alert('No hay asistentes para exportar.');
        return;
      }
      const dataExcel = asistentesGlobal.map(a => ({
        'Nombre comprador': a.nombreComprador,
        'Nombre asistente': a.nombreAsistente,
        'Tipo documento': a.tipoDocumentoAsistente,
        'Documento': a.documentoAsistente,
        'Promoción': a.promocion,
        'Medio de pago': a.medioPago,
        'Recibido por': a.quienRecibio,
        'Fecha compra': a.fechaCompra,
        'celular': a.celular,
        'referencia': a.referencia,
        'Envíos WhatsApp': a.envioWhatsapp,
        'comprobante': a.comprobante,
        'boleta': a.boleta
      }));
      const ws = XLSX.utils.json_to_sheet(dataExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistentes');
      XLSX.writeFile(wb, 'reporte_asistentes.xlsx');
    }
  });
});

async function mostrarBoletasAgrupadas(lista) {
  const container = document.getElementById("boletasContainer");
  if (!container) return;
  container.innerHTML = `
    <div class="mb-3">
      <input type="text" class="form-control" id="filtroBoletas" placeholder="Filtrar por nombre, documento, celular o referencia">
    </div>
  `;
  if (lista.length === 0) {
    container.innerHTML += `<p class="text-muted">No hay boletas registradas.</p>`;
    return;
  }
  lista.sort((a, b) => new Date(b.fechaCompra) - new Date(a.fechaCompra));
  const grupos = {};
  lista.forEach(boleta => {
    const clave = `${boleta.nombreComprador} - ${boleta.celular}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(boleta);
  });
  const todosGrupos = [];
  Object.entries(grupos).forEach(([clave, boletas]) => {
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "mb-4 grupo-boleta";
    grupoDiv.innerHTML = `
      <div class="card border-primary mb-3">
        <div class="card-header bg-primary text-white">
          <strong>Comprador:</strong> ${boletas[0].nombreComprador}<br>
          <strong>celular:</strong> ${boletas[0].celular}
        </div>
        <div class="card-body">
          <div class="row g-3" id="grupo-${clave.replace(/\s+/g, "-")}"></div>
        </div>
      </div>
    `;
    container.appendChild(grupoDiv);
    const grupoContainer = grupoDiv.querySelector(".row");
    boletas.forEach(boleta => {
      const urlBoleta = boleta.boleta ? boleta.boleta.replace("/upload/", `/upload/fl_attachment/`) : '';
      const urlComprobante = boleta.comprobante.replace("/upload/", `/upload/fl_attachment/`);
      const card = document.createElement("div");
      card.className = "col-12 col-md-6 tarjeta-boleta";
      card.dataset.nombre = boleta.nombreAsistente.toLowerCase();
      card.dataset.documento = boleta.documentoAsistente.toLowerCase();
      card.dataset.celular = boleta.celular.toLowerCase();
      card.dataset.referencia = boleta.referencia ? String(boleta.referencia).toLowerCase() : "";
      const enviosWhatsapp = boleta.envioWhatsapp && !isNaN(boleta.envioWhatsapp) ? boleta.envioWhatsapp : 0;
      let historialHtml = "";
      // Historial de envíos WhatsApp
      if (Array.isArray(boleta.historialEnvio) && boleta.historialEnvio.length > 0) {
        historialHtml += `<details class='mt-2'><summary>Historial de envíos WhatsApp (${boleta.historialEnvio.length})</summary><ul class='list-group mt-2'>`;
        boleta.historialEnvio.slice().reverse().forEach(item => {
          historialHtml += `<li class='list-group-item'>
            <div><strong>Fecha:</strong> ${item.fecha ? new Date(item.fecha).toLocaleString() : "-"}</div>
            <div><strong>Mensaje:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.mensaje || "-"}</pre></div>
            <div><strong>Respuesta:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.respuesta || "-"}</pre></div>
          </li>`;
        });
        historialHtml += `</ul></details>`;
      }
      // Historial de comprobante
      if (Array.isArray(boleta.historialComprobante) && boleta.historialComprobante.length > 0) {
        historialHtml += `<details class='mt-2'><summary>Historial de comprobante (${boleta.historialComprobante.length})</summary><ul class='list-group mt-2'>`;
        boleta.historialComprobante.slice().reverse().forEach(item => {
          historialHtml += `<li class='list-group-item'>
            <div><strong>Paso:</strong> ${item.paso || "-"}</div>
            <div><strong>Fecha:</strong> ${item.fecha ? new Date(item.fecha).toLocaleString() : "-"}</div>
            <div><strong>Mensaje:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.mensaje || "-"}</pre></div>
          </li>`;
        });
        historialHtml += `</ul></details>`;
      }
      card.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${boleta.nombreAsistente}</h5>
            <p class="mb-1"><strong>Documento:</strong> ${boleta.documentoAsistente}</p>
            <p class="mb-1"><strong>Promoción:</strong> ${boleta.promocion}</p>
            <p class="mb-1"><strong>Medio de pago:</strong> ${boleta.medioPago}</p>
            <p class="mb-1"><strong>Recibido por:</strong> ${boleta.quienRecibio}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${new Date(boleta.fechaCompra).toLocaleString()}</p>
            <p class="mb-1"><strong>referencia:</strong> ${boleta.referencia}</p>
            <p class="mb-1"><strong>Envíos WhatsApp:</strong> <span class="contador-wp">${enviosWhatsapp}</span></p>
            <button class="btn btn-sm btn-success mt-2 reenviar-wp">Reenviar WhatsApp</button>
            <button class="btn btn-sm btn-primary mt-2 ver-imagen-modal" data-img="${urlBoleta}">Ver boleta PNG</button>
            <button class="btn btn-sm btn-primary mt-2 ver-imagen-modal" data-img="${urlComprobante}">Ver comprobante de pago</button>
            ${historialHtml}
          </div>
        </div>
      `;
      grupoContainer.appendChild(card);
    });
    todosGrupos.push(grupoDiv);
    grupoContainer.querySelectorAll('.tarjeta-boleta').forEach(tarjeta => {
      const btnReenviar = tarjeta.querySelector('.reenviar-wp');
      const contadorSpan = tarjeta.querySelector('.contador-wp');
      btnReenviar.addEventListener('click', async () => {
        btnReenviar.disabled = true;
        btnReenviar.textContent = 'Enviando...';
        const nombre = tarjeta.querySelector('.card-title').textContent;
        const boleta = lista.find(b => b.nombreAsistente === nombre);
        if (!boleta) {
          alert('No se encontró la información de la boleta.');
          btnReenviar.disabled = false;
          btnReenviar.textContent = 'Reenviar WhatsApp';
          return;
        }
        let nombreAsistenteLimpio = boleta.nombreAsistente.replace(/_/g, ' ');
        let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].asistentes;
        let caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);

        if (boleta.tipoAsistente === "niño") {
          caption = `🧒 BOLETA NIÑO (menor de 12 años)\nEdad: ${boleta.edad}\n\n` + caption;
        }
        let respuestaServicio = "";
        try {
          const reqGreen = {
            urlFile: boleta.boleta,
            fileName: `boleta_${boleta.nombreAsistente.replace(/\s+/g, '_')}.png`,
            caption: caption,
            numero: '573143300821'//boleta.celular
          };
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
          let actual = parseInt(contadorSpan.textContent, 10) || 0;
          if (resp.ok) {
            actual++;
            contadorSpan.textContent = actual;
            boleta.envioWhatsapp = actual;
          }
          const historialEnvio = {
            fecha: new Date().toISOString(),
            mensaje: caption,
            respuesta: respuestaServicio
          };
          await fetch("/actualizar-boleta/asistente", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referencia: boleta.referencia, envioWhatsapp: boleta.envioWhatsapp, historialEnvio })
          });
          if (resp.ok) {
            alert('Mensaje reenviado exitosamente');
          } else {
            alert('No se pudo reenviar el mensaje de WhatsApp.');
          }
        } catch (err) {
          const historialEnvio = {
            fecha: new Date().toISOString(),
            mensaje: caption,
            respuesta: err?.message || "Error en envío"
          };
          await fetch("/actualizar-boleta/asistente", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referencia: boleta.referencia, envioWhatsapp: boleta.envioWhatsapp, historialEnvio })
          });
          alert('Error al reenviar WhatsApp.');
        }
        btnReenviar.disabled = false;
        btnReenviar.textContent = 'Reenviar WhatsApp';
      });
    });
  });

  const inputFiltro = document.getElementById("filtroBoletas");
  inputFiltro.addEventListener("input", () => {
    const texto = inputFiltro.value.toLowerCase();
    todosGrupos.forEach(grupo => {
      const tarjetas = grupo.querySelectorAll(".tarjeta-boleta");
      let visible = false;
      tarjetas.forEach(tarjeta => {
        const match =
          tarjeta.dataset.nombre.includes(texto) ||
          tarjeta.dataset.documento.includes(texto) ||
          tarjeta.dataset.celular.includes(texto) ||
          (tarjeta.dataset.referencia && tarjeta.dataset.referencia.includes(texto));
        tarjeta.style.display = match ? "block" : "none";
        if (match) visible = true;
      });
      grupo.style.display = visible ? "block" : "none";
    });
  });
  // Insertar el modal al final del container si no existe
  if (!document.getElementById('modalImagenBoleta')) {
    const modalHtml = `
      <div id="modalImagenBoleta" class="modal-imagen-boleta" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
        <div style="position:relative;max-width:90vw;max-height:90vh;">
          <button id="cerrarModalBoleta" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
          <img id="imgModalBoleta" src="" alt="Imagen boleta" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    // Eventos para cerrar el modal
    document.getElementById('cerrarModalBoleta').addEventListener('click', () => {
      document.getElementById('modalImagenBoleta').style.display = 'none';
      document.getElementById('imgModalBoleta').src = '';
    });
    document.getElementById('modalImagenBoleta').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('modalImagenBoleta').style.display = 'none';
        document.getElementById('imgModalBoleta').src = '';
      }
    });
  }
  // Delegación para abrir el modal al hacer click en los botones
  container.addEventListener('click', function(e) {
    if (e.target.classList.contains('ver-imagen-modal')) {
      const url = e.target.getAttribute('data-img');
      const modal = document.getElementById('modalImagenBoleta');
      const img = document.getElementById('imgModalBoleta');
      img.src = url;
      modal.style.display = 'flex';
    }
  });
}

