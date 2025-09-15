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

  container.innerHTML = `
    <div class="mb-3">
      <input type="text" class="form-control" id="filtroBoletas" placeholder="Filtrar por nombre, documento o celular">
    </div>
  `;

  if (lista.length === 0) {
    container.innerHTML += `<p class="text-muted">No hay boletas registradas.</p>`;
    return;
  }

  let totalVendidas = lista.length;
  let totalRecaudo = 0;

  lista.forEach(boleta => {
    const match = boleta.Promocion.match(/\$([\d.,]+)/);
    if (match) {
      const valor = parseInt(match[1].replace(/[.,]/g, ""));
      totalRecaudo += valor;
    }
  });

  const resumen = document.createElement("div");
  resumen.className = "alert alert-info mt-2";
  resumen.innerHTML = `
    <h5 class="mb-2">Resumen de ventas</h5>
    <p><strong>Total boletas vendidas:</strong> ${totalVendidas}</p>
    <p><strong>Total recaudado:</strong> $${totalRecaudo.toLocaleString("es-CO")}</p>
  `;
  container.appendChild(resumen);
  // Ordenar por FechaCompra descendente (más reciente primero)
  lista.sort((a, b) => new Date(b.FechaCompra) - new Date(a.FechaCompra));
  const grupos = {};
  lista.forEach(boleta => {
    const clave = `${boleta.nombreComprador} - ${boleta.Celular}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(boleta);
  });

  const todosGrupos = [];

  Object.entries(grupos).forEach(([clave, boletas]) => {
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "mb-4 grupo-boleta";

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
      const urlBoleta = boleta.Boleta.replace("/upload/", `/upload/fl_attachment/`);
      const urlComprobante = boleta.Comprobante.replace("/upload/", `/upload/fl_attachment/`);
      const card = document.createElement("div");
      card.className = "col-12 col-md-6 tarjeta-boleta";
      card.dataset.nombre = boleta.nombreAsistente.toLowerCase();
      card.dataset.documento = boleta.DocumentoAsistente.toLowerCase();
      card.dataset.celular = boleta.Celular.toLowerCase();

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
            <a href="${urlBoleta}" class="btn btn-sm btn-primary mt-2">Descargar boleta PNG</a>
            <a href="${urlComprobante}" class="btn btn-sm btn-primary mt-2">Descargar comprobante de pago</a>
          </div>
        </div>
      `;
      grupoContainer.appendChild(card);
    });

    todosGrupos.push(grupoDiv);
  });

  // Filtro en tiempo real
  const inputFiltro = document.getElementById("filtroBoletas");
  inputFiltro.addEventListener("input", () => {
    const texto = inputFiltro.value.toLowerCase();
    todosGrupos.forEach(grupo => {
      const tarjetas = grupo.querySelectorAll(".tarjeta-boleta");
      let visible = false;
      tarjetas.forEach(tarjeta => {
        const match =
          tarjeta.dataset.nombre.includes(texto) ||
          tarjeta.dataset.documento.includes(texto) ||
          tarjeta.dataset.celular.includes(texto);
        tarjeta.style.display = match ? "block" : "none";
        if (match) visible = true;
      });
      grupo.style.display = visible ? "block" : "none";
    });
  });
}