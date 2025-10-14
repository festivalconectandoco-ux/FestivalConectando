document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const artistas = data.artistas || [];
    renderTablaArtistas(artistas);
    // Insertar modal de imagen para boleta si no existe (ids únicos)
    const modalBoletaHtml = `
      <div id="modalImagenBoletaArtistas" class="modal-imagen-boleta" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
        <div style="position:relative;max-width:90vw;max-height:90vh;">
          <button id="cerrarModalBoletaArtistas" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
          <img id="imgModalBoletaArtistas" src="" alt="Imagen boleta" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
        </div>
      </div>
    `;
    if (!document.getElementById('modalImagenBoletaArtistas')) {
      document.body.insertAdjacentHTML('beforeend', modalBoletaHtml);
      // Eventos para cerrar modal
      document.getElementById('cerrarModalBoletaArtistas').addEventListener('click', () => {
        document.getElementById('modalImagenBoletaArtistas').style.display = 'none';
        document.getElementById('imgModalBoletaArtistas').src = '';
      });
      document.getElementById('modalImagenBoletaArtistas').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          document.getElementById('modalImagenBoletaArtistas').style.display = 'none';
          document.getElementById('imgModalBoletaArtistas').src = '';
        }
      });
    }
  } catch (error) {
    document.getElementById('tablaArtistasContainer').innerHTML = '<div class="alert alert-danger">Error al cargar los datos.</div>';
  }
});

function renderTablaArtistas(artistas) {
  if (!artistas.length) {
    document.getElementById('tablaArtistasContainer').innerHTML = '<div class="alert alert-warning">No hay artistas registrados.</div>';
    return;
  }
  let html = `<div class="table-responsive"><table class="table table-bordered table-striped">
    <thead>
      <tr>
        <th>Artista/Agrupación</th>
        <th>Nombre persona</th>
        <th>Tipo de documento</th>
        <th>Número de documento</th>
        <th>celular</th>
        <th>Observaciones</th>
        <th>Fecha registro</th>
        <th>Boleta</th>
        <th>WhatsApp</th>
      </tr>
    </thead>
    <tbody>`;
  artistas.forEach((item, idx) => {
    html += `<tr data-idx="${idx}">
      <td>${item.artista || ''}</td>
      <td>${item.nombrePersona || ''}</td>
      <td>${item.tipoDocumento || ''}</td>
      <td>${item.numeroDocumento || ''}</td>
      <td>${item.celular || ''}</td>
      <td>${item.observaciones || ''}</td>
      <td>${item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString() : ''}</td>
      <td style="white-space:nowrap;">${item.boleta ? `<button class="btn btn-sm btn-primary ver-imagen-modal-artista" data-img="${item.boleta.replace('/upload/', '/upload/fl_attachment/')}">Ver boleta</button>` : ''}</td>
      <td><button class="btn btn-sm btn-success reenviar-wp-artista">Reenviar WhatsApp</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('tablaArtistasContainer').innerHTML = html;

  // Manejador para reenviar WhatsApp
  document.querySelectorAll('.reenviar-wp-artista').forEach((btn, idx) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      const row = btn.closest('tr');
      const artista = artistas[row.getAttribute('data-idx')];
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
      let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].artistas;
      let caption = mensajeBase
        .replace('{nombreAgrupacion}', artista.artista || '-')
        .replace('{nombreIntegrante}', artista.nombrePersona || '-');
      let respuestaServicio = '';
      try {
        const reqGreen = {
          urlFile: artista.boleta || '',
          fileName: `boleta_${(artista.artista || '').replace(/\s+/g, '_')}_${(artista.nombrePersona || '').replace(/\s+/g, '_')}.png`,
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
        await fetch('/actualizar-artistas-envio-whatsapp', {
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

// Delegación para abrir el modal al hacer click en los botones (único para Artistas)
document.addEventListener('click', function(e) {
  if (e.target && e.target.classList && e.target.classList.contains('ver-imagen-modal-artista')) {
    const url = e.target.getAttribute('data-img');
    const modal = document.getElementById('modalImagenBoletaArtistas');
    const img = document.getElementById('imgModalBoletaArtistas');
    if (img && modal) {
      img.src = url;
      modal.style.display = 'flex';
    }
  }
});
