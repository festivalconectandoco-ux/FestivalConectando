document.addEventListener("DOMContentLoaded", async function () {
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
      lista.appendChild(crearCardEmprendimiento(emp));
    });
  } catch (err) {
    lista.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error al cargar los emprendimientos.</div></div>';
  }
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
        <p><strong>Celular:</strong> ${emp.celularPersona || "-"}</p>
        <p><strong>Categorías:</strong> ${Array.isArray(emp.categorias) ? emp.categorias.join(", ") : "-"}</p>
        <p><strong>Productos ofrecidos:</strong> ${Array.isArray(emp.productos) ? emp.productos.join(", ") : (emp.productos || "-")}</p>
        <div><strong>Redes sociales:</strong> ${renderRedes(emp.redes)}</div>
  <hr>
  <p><strong>Promoción:</strong> ${emp.promocion || "-"}</p>
  <p><strong>Valor promoción:</strong> $${emp.valorPromocion ? Number(emp.valorPromocion).toLocaleString('es-CO') : "-"}</p>
  <p><strong>Medio de pago:</strong> ${emp.medioPago || "-"}</p>
  <p><strong>Recibido por:</strong> ${emp.recibidoPor || "-"}</p>
  <p><strong>Comprobante:</strong> ${emp.comprobanteUrl ? `<a href='${emp.comprobanteUrl}' target='_blank'>Ver comprobante</a>` : "-"}</p>
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
