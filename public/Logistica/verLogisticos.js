document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const logisticos = Array.isArray(data.logisticos) ? data.logisticos : [];
    renderTablaLogisticos(logisticos);
    // Insertar modal de imagen para boleta si no existe
    const modalBoletaHtml = `
      <div id="modalImagenBoletaLogisticos" class="modal-imagen-boleta" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
        <div style="position:relative;max-width:90vw;max-height:90vh;">
          <button id="cerrarModalBoletaLogisticos" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
          <img id="imgModalBoletaLogisticos" src="" alt="Imagen boleta" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
        </div>
      </div>
    `;
    if (!document.getElementById('modalImagenBoletaLogisticos')) {
      document.body.insertAdjacentHTML('beforeend', modalBoletaHtml);
      // Eventos para cerrar modal
      document.getElementById('cerrarModalBoletaLogisticos').addEventListener('click', () => {
        document.getElementById('modalImagenBoletaLogisticos').style.display = 'none';
        document.getElementById('imgModalBoletaLogisticos').src = '';
      });
      document.getElementById('modalImagenBoletaLogisticos').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          document.getElementById('modalImagenBoletaLogisticos').style.display = 'none';
          document.getElementById('imgModalBoletaLogisticos').src = '';
        }
      });
    }

    // Encapsular el listener solo para esta página
    const tabla = document.getElementById('tablaLogisticosContainer');
    if (tabla) {
      tabla.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('ver-imagen-modal-mic')) {
          const url = e.target.getAttribute('data-img');
          const modal = document.getElementById('modalImagenBoletaLogisticos');
          const img = document.getElementById('imgModalBoletaLogisticos');
          if (img && modal) {
            img.src = url;
            modal.style.display = 'flex';
          }
        }
      });
    }
  } catch (err) {
    document.getElementById('tablaLogisticosContainer').innerHTML = '<div class="alert alert-danger">Error al cargar los datos.</div>';
  }
});

function renderTablaLogisticos(Logisticos) {
  if (!Logisticos.length) {
    document.getElementById('tablaLogisticosContainer').innerHTML = '<div class="alert alert-warning">No hay logisticos registrados.</div>';
    return;
  }
  let html = `<div class="table-responsive"><table class="table table-bordered table-striped">
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Tipo de documento</th>
        <th>Número de documento</th>
        <th>celular</th>
        <th>Áreas de apoyo</th>
        <th>Promoción</th>
        <th>Tareas</th>
        <th>Fecha registro</th>
        <th>Boleta</th>
        <th>WhatsApp</th>
      </tr>
    </thead>
    <tbody>`;
  Logisticos.forEach((item, idx) => {
    html += `<tr data-idx="${idx}">
      <td>${item.nombre || ''}</td>
      <td>${item.tipoDocumento || ''}</td>
      <td>${item.numeroDocumento || ''}</td>
      <td>${item.celular || ''}</td>
      <td>${Array.isArray(item.areasApoyo) ? item.areasApoyo.join(', ') : ''}</td>
      <td>${item.promocion || ''}</td>
      <td>${item.tareas || ''}</td>
      <td>${item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString('es-CO') : ''}</td>
      <td style="white-space:nowrap;">${item.boleta ? `<button class="btn btn-sm btn-primary ver-imagen-modal-mic" data-img="${item.boleta.replace('/upload/', '/upload/fl_attachment/')}">Ver boleta</button>` : ''}</td>
      <td><button class="btn btn-sm btn-success reenviar-wp-logistico">Reenviar WhatsApp</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('tablaLogisticosContainer').innerHTML = html;

  // Manejador para reenviar WhatsApp
  document.querySelectorAll('.reenviar-wp-logistico').forEach((btn, idx) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      const row = btn.closest('tr');
      const logisticos = Logisticos[row.getAttribute('data-idx')];
      let catalogosGlobales = null;
      try {
        const resp = await fetch('../data/catalogos.json');
        catalogosGlobales = await resp.json();
      } catch (e) {
        alert('No se pudo cargar el catálogo de mensajes');
        btn.disabled = false;
        btn.textContent = 'Reenviar WhatsApp';
        return;
      }
      let nombreAsistenteLimpio = logisticos.nombre.replace(/_/g, ' ');
      let caption,mensajeBase;
      if(logisticos.promocion==='Logistica'){
        mensajeBase = catalogosGlobales.MensajesWhatsapp[0].logisticos;
        caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);
      }else{
        mensajeBase = catalogosGlobales.MensajesWhatsapp[0].invitados;
        caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);
      }
      let respuestaServicio = '';
      try {
        const reqGreen = {
          urlFile: logisticos.boleta || '',
          fileName: `boleta_${logisticos.nombre.replace(/\s+/g, '_')}.png`,
          caption: caption,
          numero: (() => {
            let num = logisticos.celular.trim();
            if (/^(\+|57|58|51|52|53|54|55|56|591|593|595|598|1|44|34)/.test(num)) {
              return num.replace(/[^\d+]/g, '');
            } else {
              return '57' + num.replace(/[^\d]/g, '');
            }
          })()
        };
        const resp = await fetch('/enviar-whatsapp/reenvio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqGreen)
        });
        try {
          respuestaServicio = await resp.text();
        } catch (e) {
          respuestaServicio = 'Error leyendo respuesta';
        }
        const envioOk = resp.ok;
        logisticos.envioWhatsapp = envioOk ? (logisticos.envioWhatsapp ? logisticos.envioWhatsapp + 1 : 1) : logisticos.envioWhatsapp || 0;

        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: respuestaServicio
        };
        await fetch('/actualizar-boleta/logistico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencia: logisticos.referencia, envioWhatsapp: logisticos.envioWhatsapp, historialEnvio })
        });
        alert(envioOk ? 'Mensaje reenviado exitosamente' : 'No se pudo reenviar el mensaje de WhatsApp.');
      } catch (err) {
        alert('Error al reenviar WhatsApp.');
      }
      btn.disabled = false;
      btn.textContent = 'Reenviar WhatsApp';
    });
  });
}
