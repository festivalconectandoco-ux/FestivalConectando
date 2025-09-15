document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/boletas")
    .then(res => res.json())
    .then(data => {
      mostrarBoletasAgrupadas(data.Asistentes);
      console.log("data.Asistentes", data.Asistentes);
    })
    .catch(err => console.error("Error cargando boletas:", err));
});

function mostrarBoletasAgrupadas(lista) {
  const container = document.getElementById("boletasContainer");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p class="text-muted">No hay boletas registradas.</p>`;
    return;
  }

  // Agrupar por nombreComprador + Celular
  const grupos = {};
  lista.forEach(boleta => {
    const clave = `${boleta.nombreComprador} - ${boleta.Celular}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(boleta);
  });

  // Mostrar cada grupo
  Object.entries(grupos).forEach(([clave, boletas]) => {
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "mb-4";

    grupoDiv.innerHTML = `
      <div class="card border-primary mb-3">
        <div class="card-header bg-primary text-white">
          <strong>Comprador:</strong> ${boletas[0].nombreComprador}<br>
          <strong>Celular:</strong> ${boletas[0].Celular}
        </div>
        <div class="card-body">
          <div class="row g-3" id="grupo-${clave.replace(/\s+/g, "-")}"></div>
        </div>
      </div>
    `;
    container.appendChild(grupoDiv);

    const grupoContainer = grupoDiv.querySelector(".row");
    boletas.forEach(boleta => {
      const urlDescarga = boleta.Boleta.replace("/upload/", `/upload/fl_attachment/`);
      const card = document.createElement("div");
      card.className = "col-md-6";

      card.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${boleta.nombreAsistente}</h5>
            <p class="mb-1"><strong>Documento:</strong> ${boleta.DocumentoAsistente}</p>
            <p class="mb-1"><strong>Tipo:</strong> ${boleta.TipoAsistente}</p>
            <p class="mb-1"><strong>Promoción:</strong> ${boleta.Promocion}</p>
            <p class="mb-1"><strong>Medio de pago:</strong> ${boleta.MedioPago}</p>
            <p class="mb-1"><strong>Recibido por:</strong> ${boleta.QuienRecibio}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${new Date(boleta.FechaCompra).toLocaleString()}</p>
            <p class="mb-1"><strong>Referencia:</strong> ${boleta.Referencia}</p>
            <a href="${urlDescarga}" class="btn btn-sm btn-primary mt-2">Descargar boleta PNG</a>
            <a href="${boleta.Qr || "#"}" target="_blank" class="btn btn-sm btn-outline-secondary mt-2">Ver QR</a>
          </div>
        </div>
      `;
      grupoContainer.appendChild(card);
    });
  });
  // Calcular totales
let totalVendidas = lista.length;
let totalRecaudo = 0;

lista.forEach(boleta => {
  const match = boleta.Promocion.match(/\$([\d.,]+)/);
  if (match) {
    const valor = parseInt(match[1].replace(/[.,]/g, ""));
    totalRecaudo += valor;
  }
});

// Mostrar resumen
const resumen = document.createElement("div");
resumen.className = "alert alert-info mt-4";
resumen.innerHTML = `
  <h5 class="mb-2">Resumen de ventas</h5>
  <p><strong>Total boletas vendidas:</strong> ${totalVendidas}</p>
  <p><strong>Total recaudado:</strong> $${totalRecaudo.toLocaleString("es-CO")}</p>
`;
container.appendChild(resumen);
}
