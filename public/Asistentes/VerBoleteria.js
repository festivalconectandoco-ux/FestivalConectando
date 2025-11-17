document.addEventListener('DOMContentLoaded', async () => {
  const cont = document.getElementById('lista');
  cont.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Cargando...</span></div>';
  try {
    const resp = await fetch('/api/traer-todo');
    const data = await resp.json();
    const boletas = data.boletas || [];
    if (!boletas.length) {
      cont.innerHTML = '<div class="alert alert-info">No hay boletas registradas.</div>';
      return;
    }
    const rows = boletas.map(b => {
      const valorBoleta = Number(b.valorBoleta || 0);
      const valorAbonado = Number(b.valorAbonado || 0);
      const saldo = valorBoleta - valorAbonado;
      return `
        <div class="card mb-2">
          <div class="card-body">
            <h5 class="card-title">Ref ${b.referencia} - ${b.nombreAsistente || b.nombre || ''}</h5>
            <p class="mb-1"><strong>Promoción:</strong> ${b.promocion || ''}</p>
            <p class="mb-1"><strong>Valor boleta:</strong> $${valorBoleta.toLocaleString('es-CO')}</p>
            <p class="mb-1"><strong>Valor abonado:</strong> $${valorAbonado.toLocaleString('es-CO')}</p>
            <p class="mb-1"><strong>Saldo:</strong> $${saldo.toLocaleString('es-CO')}</p>
            <p class="mb-1"><strong>Celular:</strong> ${b.celular || ''}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${b.fechaCompra || b.fechaRegistro || ''}</p>
          </div>
        </div>
      `;
    }).join('\n');
    cont.innerHTML = rows;
  } catch (error) {
    console.error(error);
    cont.innerHTML = '<div class="alert alert-danger">Error cargando boletas.</div>';
  }
});