document.addEventListener('DOMContentLoaded', async () => {
  const lista = document.getElementById('lista');
  // Insertar modal de imagen comprobante si no existe
  const modalId = 'modalImagenComprobanteSeparacion';
  if (!document.getElementById(modalId)) {
    const modalHtml = `
      <div id="${modalId}" class="modal-imagen-comprobante" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;">
        <div style="position:relative;max-width:90vw;max-height:90vh;">
          <button id="cerrarModalComprobanteSeparacion" style="position:absolute;top:10px;right:10px;z-index:2;" class="btn btn-danger">Cerrar</button>
          <img id="imgModalComprobanteSeparacion" src="" alt="Imagen comprobante" style="max-width:100%;max-height:80vh;display:block;margin:auto;border-radius:8px;box-shadow:0 0 10px #000;" />
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('cerrarModalComprobanteSeparacion').addEventListener('click', () => {
      const m = document.getElementById(modalId);
      if (m) { m.style.display = 'none'; document.getElementById('imgModalComprobanteSeparacion').src = ''; }
    });
    document.getElementById(modalId).addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.style.display = 'none';
        document.getElementById('imgModalComprobanteSeparacion').src = '';
      }
    });
  }
  lista.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Cargando...</span></div>';
  try {
    const resp = await fetch('/api/separaciones');
    const data = await resp.json();
    const items = data.separaciones || [];
    if (!items.length) { lista.innerHTML = '<div class="alert alert-info">No hay separaciones registradas.</div>'; return; }

    // Agrupar por nombreComprador
    const grupos = {};
    items.forEach(s => {
      const compradorRaw = s.nombreComprador || 'Sin comprador';
      const comprador = String(compradorRaw).replace(/_/g, ' ');
      if (!grupos[comprador]) grupos[comprador] = [];
      grupos[comprador].push(s);
    });

    // Construir HTML por comprador con totales
    const html = Object.keys(grupos).map(comprador => {
      const listaSep = grupos[comprador];
      let totalBoleta = 0, totalAbonado = 0, totalSaldo = 0;
      const filas = listaSep.map(s => {
        const valorBoleta = Number(s.valorBoleta || 0);
        const valorAbonado = Number(s.valorAbonado || 0);
        const saldo = Number(s.saldo || (valorBoleta - valorAbonado));
        totalBoleta += valorBoleta;
        totalAbonado += valorAbonado;
        totalSaldo += saldo;
        return `
          <div class="card mb-1">
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <div>
                  <strong>Ref ${s.referencia}</strong> - ${s.nombreAsistente ? s.nombreAsistente.replace(/_/g,' ') : '-'}
                  <div><small>Documento: ${s.numeroDocumento || '-'}</small></div>
                  <div><small>Promoción: ${s.promocionDescripcion || '-'}</small></div>
                </div>
                <div class="text-end">
                  <div><strong>$${Number(valorBoleta).toLocaleString('es-CO')}</strong></div>
                  <div><small>Abonado: $${Number(valorAbonado).toLocaleString('es-CO')}</small></div>
                  <div><small>Saldo: $${Number(saldo).toLocaleString('es-CO')}</small></div>
                </div>
              </div>
              ${s.comprobante ? `<div class="mt-2"><a href="#" class="ver-comprobante" data-img="${s.comprobante}">Ver comprobante</a></div>` : ''}
              <div class="text-muted small mt-1">Celular: ${s.celular || '-'} · Registrado: ${s.fechaRegistro || '-'}</div>
            </div>
          </div>
        `;
      }).join('\n');

      return `
        <div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div><strong>${comprador}</strong></div>
            <div class="text-end">
              <div>Total boleta: $${Number(totalBoleta).toLocaleString('es-CO')}</div>
              <div>Total abonado: $${Number(totalAbonado).toLocaleString('es-CO')}</div>
              <div>Saldo: $${Number(totalSaldo).toLocaleString('es-CO')}</div>
            </div>
          </div>
          <div class="card-body">${filas}</div>
        </div>
      `;
    }).join('\n');

    lista.innerHTML = html;

    // Delegación para abrir modal de comprobante
    document.addEventListener('click', function(e) {
      const target = e.target;
      if (target && target.classList && target.classList.contains('ver-comprobante')) {
        e.preventDefault();
        const img = target.getAttribute('data-img');
        if (img) {
          const modal = document.getElementById(modalId);
          const imgEl = document.getElementById('imgModalComprobanteSeparacion');
          imgEl.src = img;
          modal.style.display = 'flex';
        }
      }
    });
  } catch (err) {
    console.error(err); lista.innerHTML = '<div class="alert alert-danger">Error cargando separaciones</div>';
  }
});