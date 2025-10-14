document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const micAbierto = data.micAbierto || [];
    renderTablaMicAbierto(micAbierto);
    // Insertar modal de imagen para boleta si no existe
    const modalBoletaHtml = `
      <div id="modalImagenBoletaMicAbierto" class="modal-imagen-boleta" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
        <div style="position:relative;max-width:90vw;max-height:90vh;">
          <button id="cerrarModalBoletaMicAbierto" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
          <img id="imgModalBoletaMicAbierto" src="" alt="Imagen boleta" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
        </div>
      </div>
    `;
    if (!document.getElementById('modalImagenBoletaMicAbierto')) {
      document.body.insertAdjacentHTML('beforeend', modalBoletaHtml);
      // Eventos para cerrar modal
      document.getElementById('cerrarModalBoletaMicAbierto').addEventListener('click', () => {
        document.getElementById('modalImagenBoletaMicAbierto').style.display = 'none';
        document.getElementById('imgModalBoletaMicAbierto').src = '';
      });
      document.getElementById('modalImagenBoletaMicAbierto').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          document.getElementById('modalImagenBoletaMicAbierto').style.display = 'none';
          document.getElementById('imgModalBoletaMicAbierto').src = '';
        }
      });
    }

    // Encapsular el listener solo para esta página
    const tabla = document.getElementById('tablaMicAbiertoContainer');
    if (tabla) {
      tabla.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('ver-imagen-modal-mic')) {
          const url = e.target.getAttribute('data-img');
          const modal = document.getElementById('modalImagenBoletaMicAbierto');
          const img = document.getElementById('imgModalBoletaMicAbierto');
          if (img && modal) {
            img.src = url;
            modal.style.display = 'flex';
          }
        }
      });
    }
  } catch (error) {
    document.getElementById('tablaMicAbiertoContainer').innerHTML = '<div class="alert alert-danger">Error al cargar los datos.</div>';
  }
});

function renderTablaMicAbierto(micAbierto) {
  if (!micAbierto.length) {
    document.getElementById('tablaMicAbiertoContainer').innerHTML = '<div class="alert alert-warning">No hay artistas registrados.</div>';
    return;
  }
  let html = `<div class="table-responsive"><table class="table table-bordered table-striped">
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Documento</th>
        <th>Tipo de documento</th>
        <th>celular</th>
        <th>Grupo/Agrupación</th>
        <th>Fecha registro</th>
        <th>Observaciones</th>
        <th>Boleta</th>
        <th>WhatsApp</th>
      </tr>
    </thead>
    <tbody>`;
  micAbierto.forEach((item, idx) => {
    html += `<tr data-idx="${idx}">
      <td>${item.nombrePersona || ''}</td>
      <td>${item.numeroDocumento || ''}</td>
      <td>${item.tipoDocumento || ''}</td>
      <td>${item.celular || ''}</td>
      <td>${item.agrupacion || ''}</td>
      <td>${item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString() : ''}</td>
      <td>${item.observaciones || ''}</td>
      <td style="white-space:nowrap;">${item.boleta ? `<button class="btn btn-sm btn-primary ver-imagen-modal-mic" data-img="${item.boleta.replace('/upload/', '/upload/fl_attachment/')}">Ver boleta</button>` : ''}</td>
      <td><button class="btn btn-sm btn-success reenviar-wp-mic">Reenviar WhatsApp</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('tablaMicAbiertoContainer').innerHTML = html;

  // Manejador para reenviar WhatsApp
  document.querySelectorAll('.reenviar-wp-mic').forEach((btn, idx) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      const row = btn.closest('tr');
      const artista = micAbierto[row.getAttribute('data-idx')];
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
      let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].micAbierto;
      let caption = mensajeBase
        .replace('{nombreAgrupacion}', artista.agrupacion || '-')
        .replace('{nombreIntegrante}', artista.nombrePersona || '-');
      let respuestaServicio = '';
      try {
        const reqGreen = {
          urlFile: artista.boleta || '',
          fileName: `boleta_${(artista.agrupacion || '').replace(/\s+/g, '_')}_${(artista.nombrePersona || '').replace(/\s+/g, '_')}.png`,
          caption: caption,
          numero: artista.celular ? `57${artista.celular.replace(/[^\d]/g, '')}` : '573143300821'
        };
        const resp = await fetch('/enviar-mensaje-boleta-greenapi', {
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
        artista.envioWhatsapp = envioOk ? (artista.envioWhatsapp ? artista.envioWhatsapp + 1 : 1) : artista.envioWhatsapp || 0;
        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: respuestaServicio
        };
        await fetch('/actualizar-microfono-abierto-envio-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencia: artista.referencia, envioWhatsapp: artista.envioWhatsapp, historialEnvio })
        });
        btn.nextElementSibling.textContent = artista.envioWhatsapp;
        alert(envioOk ? 'Mensaje reenviado exitosamente' : 'No se pudo reenviar el mensaje de WhatsApp.');
      } catch (err) {
        alert('Error al reenviar WhatsApp.');
      }
      btn.disabled = false;
      btn.textContent = 'Reenviar WhatsApp';
    });
  });
}
