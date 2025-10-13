document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const micAbierto = data.micAbierto || [];
    renderTablaMicAbierto(micAbierto);
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
      </tr>
    </thead>
    <tbody>`;
  micAbierto.forEach(item => {
    html += `<tr>
      <td>${item.nombrePersona || ''}</td>
      <td>${item.numeroDocumento || ''}</td>
      <td>${item.tipoDocumento || ''}</td>
      <td>${item.celular || ''}</td>
      <td>${item.agrupacion || ''}</td>
      <td>${item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString() : ''}</td>
      <td>${item.observaciones || ''}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('tablaMicAbiertoContainer').innerHTML = html;
}
