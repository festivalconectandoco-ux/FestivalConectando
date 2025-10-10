let catalogosGlobales = null;
document.addEventListener("DOMContentLoaded", async function () {
  let asistentesGlobal = [];
  fetch("data/catalogos.json")
    .then(res => res.json())
    .then(catalogos => {
      catalogosGlobales = catalogos;
      fetch("/api/boletas")
        .then(res => res.json())
        .then(data => {
          asistentesGlobal = data.Asistentes;
          mostrarBoletasAgrupadas(data.Asistentes);
        })
        .catch(err => console.error("Error cargando boletas:", err));
    })
    .catch(err => console.error("Error cargando catálogo:", err));
    
  // Definir el HTML de los modales
  const modalHtml = `
    <div id="modalImagenComprobante" class="modal-imagen-comprobante" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
      <div style="position:relative;max-width:90vw;max-height:90vh;">
        <button id="cerrarModalComprobante" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
        <img id="imgModalComprobante" src="" alt="Imagen comprobante" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
      </div>
    </div>
  `;
  
  const modalBoletaHtml = `
    <div id="modalImagenBoleta" class="modal-imagen-boleta" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
      <div style="position:relative;max-width:90vw;max-height:90vh;">
        <button id="cerrarModalBoleta" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
        <img id="imgModalBoleta" src="" alt="Imagen boleta" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
      </div>
    </div>
  `;
  
  // Insertar los modales al final del body si no existen
  if (!document.getElementById('modalImagenComprobante')) {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  if (!document.getElementById('modalImagenBoleta')) {
    document.body.insertAdjacentHTML('beforeend', modalBoletaHtml);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.insertAdjacentHTML('beforeend', modalBoletaHtml);
    
    // Eventos para cerrar los modales
    ['Comprobante', 'Boleta'].forEach(tipo => {
      document.getElementById(`cerrarModal${tipo}`).addEventListener('click', () => {
        document.getElementById(`modalImagen${tipo}`).style.display = 'none';
        document.getElementById(`imgModal${tipo}`).src = '';
      });
      document.getElementById(`modalImagen${tipo}`).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          document.getElementById(`modalImagen${tipo}`).style.display = 'none';
          document.getElementById(`imgModal${tipo}`).src = '';
        }
      });
    });
  }

  const lista = document.getElementById("emprendimientosList");
  try {
    const resp = await fetch("/api/traer-todo");
    const data = await resp.json();
    const emprendimientos = data.emprendimientos || [];
    if (emprendimientos.length === 0) {
      lista.innerHTML = '<div class="col-12"><div class="alert alert-info">No hay emprendimientos registrados.</div></div>';
      return;
    }
    emprendimientos.forEach(emp => {
      const card = crearCardEmprendimiento(emp);
      lista.appendChild(card);
      // Funcionamiento botón reenviar WhatsApp
      const btnReenviar = card.querySelector('.reenviar-wp');
      if (btnReenviar) {
        btnReenviar.addEventListener('click', async () => {
          btnReenviar.disabled = true;
          btnReenviar.textContent = 'Enviando...';
          let nombre = emp.nombrePersona || "-";
          let nombreEmprendimiento = emp.nombreEmprendimiento || "-";

          let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].emprendimientos;
          let caption = mensajeBase.replace('{nombreEmprendimiento}', nombreEmprendimiento).replace('{nombrePersona}', nombre);

          let respuestaServicio = "";
          try {
            const reqGreen = {
              urlFile: emp.boleta || "",
              fileName: `comprobante_${nombreEmprendimiento.replace(/\s+/g, '_')}.png`,
              caption: caption,
              numero: '573143300821' //emp.celularPersona ? `57${emp.celularPersona.replace(/[^\d]/g, '')}` : '573143300821'
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
            if (resp.ok) {
              alert('Mensaje reenviado exitosamente');
            } else {
              alert('No se pudo reenviar el mensaje de WhatsApp.');
            }
          } catch (err) {
            alert('Error al reenviar WhatsApp.');
          }
          btnReenviar.disabled = false;
          btnReenviar.textContent = 'Reenviar WhatsApp';
        });
      }
    });
  } catch (err) {
    lista.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error al cargar los emprendimientos.</div></div>';
  }

  // Delegación para abrir el modal al hacer click en los botones
  lista.addEventListener('click', function(e) {
    if (e.target.classList.contains('ver-imagen-modal')) {
      const url = e.target.getAttribute('data-img');
      const tipo = e.target.getAttribute('data-tipo');
      const modal = document.getElementById(`modalImagen${tipo}`);
      const img = document.getElementById(`imgModal${tipo}`);
      img.src = url;
      modal.style.display = 'flex';
    }
  });
});

function crearCardEmprendimiento(emp) {
  const div = document.createElement("div");
  div.className = "col-12 col-md-6 col-lg-4";
  div.innerHTML = `
    <div class="card h-100">
      ${emp.logoUrl ? `<img src='${emp.logoUrl}' class='card-img-top' alt='Logo' style='object-fit:contain;max-height:120px;background:#f8f8f8'>` : ""}
      <div class="card-body">
        <h5 class="card-title">${emp.nombreEmprendimiento || "Sin nombre"}</h5>
        <p><strong>Responsable:</strong> ${emp.nombrePersona || "-"}</p>
        <p><strong>celular:</strong> ${emp.celularPersona || "-"}</p>
        <p><strong>Categorías:</strong> ${Array.isArray(emp.categorias) ? emp.categorias.join(", ") : "-"}</p>
        <p><strong>Productos ofrecidos:</strong> ${Array.isArray(emp.productos) ? emp.productos.join(", ") : (emp.productos || "-")}</p>
        <div><strong>Redes sociales:</strong> ${renderRedes(emp.redes)}</div>
  <hr>
  <p><strong>Promoción:</strong> ${emp.promocion || "-"}</p>
  <p><strong>Valor promoción:</strong> $${emp.valorPromocion ? Number(emp.valorPromocion).toLocaleString('es-CO') : "-"}</p>
  <p><strong>Medio de pago:</strong> ${emp.medioPago || "-"}</p>
  <p><strong>Recibido por:</strong> ${emp.recibidoPor || "-"}</p>
  <button class="btn btn-sm btn-success mt-2 reenviar-wp">Reenviar WhatsApp</button>
  <div class="mt-2">
    ${emp.comprobanteUrl ? 
      `<button class="btn btn-sm btn-primary me-2 ver-imagen-modal" data-tipo="Comprobante" data-img="${emp.comprobanteUrl.replace("/upload/", `/upload/fl_attachment/`)}">
         Ver comprobante
       </button>` : ""}
    ${emp.boleta ? 
      `<button class="btn btn-sm btn-primary ver-imagen-modal" data-tipo="Boleta" data-img="${emp.boleta.replace("/upload/", `/upload/fl_attachment/`)}">
         Ver boleta
       </button>` : ""}
  </div>
  <p class="text-muted small">Registrado: ${emp.fechaRegistro ? new Date(emp.fechaRegistro).toLocaleString() : "-"}</p>
      </div>
    </div>
  `;
  return div;
}

function renderRedes(redes) {
  if (!Array.isArray(redes) || redes.length === 0) return "-";
  return redes.map(r => `<a href="${r.url}" target="_blank" rel="noopener" class="me-2">${r.tipo}</a>`).join("");
}
