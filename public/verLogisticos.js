document.addEventListener("DOMContentLoaded", async function () {
  const contenedor = document.getElementById("tablaLogisticosContainer");
  contenedor.innerHTML = `<div class='text-center'><div class='spinner-border text-primary' role='status'></div><br>Cargando...</div>`;
  try {
    const resp = await fetch("/api/traer-todo");
    const data = await resp.json();
    const logisticos = Array.isArray(data.logisticos) ? data.logisticos : [];
    if (logisticos.length === 0) {
      contenedor.innerHTML = `<div class='alert alert-info'>No hay logísticos registrados.</div>`;
      return;
    }
    let html = `<div class='table-responsive'><table class='table table-bordered table-striped'>
      <thead class='table-dark'>
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Tipo de documento</th>
          <th>Número de documento</th>
          <th>Celular</th>
          <th>Áreas de apoyo</th>
          <th>Promoción</th>
          <th>Tareas</th>
          <th>Fecha registro</th>
        </tr>
      </thead>
      <tbody>`;
    logisticos.forEach((l, idx) => {
      html += `<tr>
        <td>${idx + 1}</td>
        <td>${l.nombre || ''}</td>
        <td>${l.tipoDocumento || ''}</td>
        <td>${l.numeroDocumento || ''}</td>
        <td>${l.celular || ''}</td>
        <td>${Array.isArray(l.areasApoyo) ? l.areasApoyo.join(', ') : ''}</td>
        <td>${l.promocion || ''}</td>
        <td>${l.tareas || ''}</td>
        <td>${l.fechaRegistro ? new Date(l.fechaRegistro).toLocaleString('es-CO') : ''}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
  } catch (err) {
    contenedor.innerHTML = `<div class='alert alert-danger'>Error al cargar los logísticos.</div>`;
  }
});
