document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const artistas = data.artistas || [];
    renderTablaArtistas(artistas);
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
        <th>Celular</th>
        <th>Observaciones</th>
        <th>Fecha registro</th>
      </tr>
    </thead>
    <tbody>`;
  artistas.forEach(item => {
    html += `<tr>
      <td>${item.artista || ''}</td>
      <td>${item.nombrePersona || ''}</td>
      <td>${item.tipoDocumento || ''}</td>
      <td>${item.numeroDocumento || ''}</td>
      <td>${item.celular || ''}</td>
      <td>${item.observaciones || ''}</td>
      <td>${item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString() : ''}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('tablaArtistasContainer').innerHTML = html;
}
