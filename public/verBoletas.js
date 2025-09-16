document.addEventListener("DOMContentLoaded", () => {
  let asistentesGlobal = [];
  fetch("/api/boletas")
    .then(res => res.json())
    .then(data => {
      asistentesGlobal = data.Asistentes;
      mostrarBoletasAgrupadas(data.Asistentes);
    })
    .catch(err => console.error("Error cargando boletas:", err));

  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btnDescargarExcel') {
      if (!asistentesGlobal || asistentesGlobal.length === 0) {
        alert('No hay asistentes para exportar.');
        return;
      }
      const dataExcel = asistentesGlobal.map(a => ({
        'Nombre comprador': a.nombreComprador,
        'Nombre asistente': a.nombreAsistente,
        'Tipo documento': a.TipoDocumentoAsistente,
        'Documento': a.DocumentoAsistente,
        'Promoción': a.Promocion,
        'Medio de pago': a.MedioPago,
        'Recibido por': a.QuienRecibio,
        'Fecha compra': a.FechaCompra,
        'Celular': a.Celular,
        'Referencia': a.Referencia,
        'Envíos WhatsApp': a.EnvioWhatsapp,
        'Comprobante': a.Comprobante,
        'Boleta': a.Boleta
      }));
      const ws = XLSX.utils.json_to_sheet(dataExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistentes');
      XLSX.writeFile(wb, 'reporte_asistentes.xlsx');
    }
  });
});

function mostrarBoletasAgrupadas(lista) {
  const container = document.getElementById("boletasContainer");
  if (!container) return;
  container.innerHTML = `
    <div class="mb-3">
      <input type="text" class="form-control" id="filtroBoletas" placeholder="Filtrar por nombre, documento, celular o referencia">
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
  const maxBoletas = 170;
  const porcentajeVendidas = ((totalVendidas / maxBoletas) * 100).toFixed(2);
  const resumen = document.createElement("div");
  resumen.className = "mt-2";
  resumen.innerHTML = `
    <div class="accordion" id="acordeonResumenVentas">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingResumen">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseResumen" aria-expanded="false" aria-controls="collapseResumen">
            Resumen de ventas
          </button>
        </h2>
        <div id="collapseResumen" class="accordion-collapse collapse" aria-labelledby="headingResumen" data-bs-parent="#acordeonResumenVentas">
          <div class="accordion-body">
            <p><strong>Total boletas vendidas:</strong> ${totalVendidas}</p>
            <p><strong>Total recaudado:</strong> $${totalRecaudo.toLocaleString("es-CO")}</p>
            <p><strong>Porcentaje de boletas vendidas:</strong> ${porcentajeVendidas}% (máximo ${maxBoletas})</p>
            <canvas id="graficoVentasSemana" height="100"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(resumen);
  const ventasPorSemana = {};
  lista.forEach(boleta => {
    const fecha = new Date(boleta.FechaCompra);
    const year = fecha.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (fecha - firstDayOfYear) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const key = `${year}-S${week}`;
    ventasPorSemana[key] = (ventasPorSemana[key] || 0) + 1;
  });
  const semanas = Object.keys(ventasPorSemana).sort();
  const datos = semanas.map(sem => ventasPorSemana[sem]);
  function renderGrafico() {
    const ctx = document.getElementById('graficoVentasSemana').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: semanas,
        datasets: [{
          label: 'Boletas vendidas por semana',
          data: datos,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Ventas por semana' }
        },
        scales: {
          y: { beginAtZero: true, precision: 0 }
        }
      }
    });
  }
  if (window.Chart) {
    renderGrafico();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = renderGrafico;
    document.head.appendChild(script);
  }
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
      const urlBoleta = boleta.Boleta ? boleta.Boleta.replace("/upload/", `/upload/fl_attachment/`) : '';
      const urlComprobante = boleta.Comprobante.replace("/upload/", `/upload/fl_attachment/`);
      const card = document.createElement("div");
      card.className = "col-12 col-md-6 tarjeta-boleta";
      card.dataset.nombre = boleta.nombreAsistente.toLowerCase();
      card.dataset.documento = boleta.DocumentoAsistente.toLowerCase();
      card.dataset.celular = boleta.Celular.toLowerCase();
      card.dataset.referencia = boleta.Referencia ? boleta.Referencia.toLowerCase() : "";
      const enviosWhatsapp = boleta.EnvioWhatsapp && !isNaN(boleta.EnvioWhatsapp) ? boleta.EnvioWhatsapp : 0;
      card.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${boleta.nombreAsistente}</h5>
            <p class="mb-1"><strong>Documento:</strong> ${boleta.DocumentoAsistente}</p>
            <p class="mb-1"><strong>Promoción:</strong> ${boleta.Promocion}</p>
            <p class="mb-1"><strong>Medio de pago:</strong> ${boleta.MedioPago}</p>
            <p class="mb-1"><strong>Recibido por:</strong> ${boleta.QuienRecibio}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${new Date(boleta.FechaCompra).toLocaleString()}</p>
            <p class="mb-1"><strong>Referencia:</strong> ${boleta.Referencia}</p>
            <p class="mb-1"><strong>Envíos WhatsApp:</strong> <span class="contador-wp">${enviosWhatsapp}</span></p>
            <button class="btn btn-sm btn-success mt-2 reenviar-wp">Reenviar WhatsApp</button>
            <a href="${urlBoleta}" class="btn btn-sm btn-primary mt-2">Descargar boleta PNG</a>
            <a href="${urlComprobante}" class="btn btn-sm btn-primary mt-2">Descargar comprobante de pago</a>
          </div>
        </div>
      `;
      grupoContainer.appendChild(card);
    });
    todosGrupos.push(grupoDiv);
    grupoContainer.querySelectorAll('.tarjeta-boleta').forEach(tarjeta => {
      const btnReenviar = tarjeta.querySelector('.reenviar-wp');
      const contadorSpan = tarjeta.querySelector('.contador-wp');
      btnReenviar.addEventListener('click', async () => {
        btnReenviar.disabled = true;
        btnReenviar.textContent = 'Enviando...';
        const nombre = tarjeta.querySelector('.card-title').textContent;
        const boleta = lista.find(b => b.nombreAsistente === nombre);
        if (!boleta) {
          alert('No se encontró la información de la boleta.');
          btnReenviar.disabled = false;
          btnReenviar.textContent = 'Reenviar WhatsApp';
          return;
        }
        try {
          const caption = `🎉 ¡Gracias ${boleta.nombreAsistente} por ser parte del Festival Conectando! 🎶✨\n\n` +
            `🗓 Te esperamos el 29 de noviembre en el Restaurante Campestre Villa Valeria en Usme, Bogotá. Las puertas abren a las 9:00 a.m. En el ingreso recibirás un cupón para reclamar una bebida (chicha, té de coca, café o agua) . No olvides tu vaso reutilizable. 🌎💚\n\n` +
            `Habrá emprendimientos con alimentos y almuerzo. 🍔🥙 \nNo se permite el ingreso de alimentos y/o bebidas, ni el consumo de drogas, cannabis u hongos. 🚫🍫🚫🌿🚫🍄\n\n` +
            `Trae impermeable o sombrilla para la lluvia 🌧☔ y, si puedes, un cojín 🛋 o colchoneta para sentarte. \n🪑Las sillas serán prioridad para las personas mayores, mujeres embarazadas, y niños de brazos. 👵🤰👶\n\n` +
            `📲 Mantente pendiente de nuestras redes sociales para actualizaciones.\n\n` +
            `🌞 ¡Nos para celebrar la vida y hacer de esta primera edición del festival algo inolvidable! 🙌🌈`;
          const reqGreen = {
            urlFile: boleta.Boleta,
            fileName: `boleta_${boleta.nombreAsistente.replace(/\s+/g, '_')}.png`,
            caption: caption,
            numero: '573058626761'//boleta.Celular
          };
          const resp = await fetch("/enviar-mensaje-boleta-greenapi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqGreen)
          });
          if (resp.ok) {
            let actual = parseInt(contadorSpan.textContent, 10) || 0;
            actual++;
            contadorSpan.textContent = actual;
            boleta.EnvioWhatsapp = actual;
            await fetch("/actualizar-envio-whatsapp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referencia: boleta.Referencia, EnvioWhatsapp: actual })
            });
            alert('Mensaje reenviado exitosamente');
          } else {
            alert('No se pudo reenviar el mensaje de WhatsApp.');
          }
        } catch (err) {
          alert('Error al reenviar WhatsApp.');
        }
        btnReenviar.disabled = false;
        btnReenviar.textContent = 'Reenviar WhatsApp';
      });
    });
  });

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
          tarjeta.dataset.celular.includes(texto) ||
          (tarjeta.dataset.referencia && tarjeta.dataset.referencia.includes(texto));
        tarjeta.style.display = match ? "block" : "none";
        if (match) visible = true;
      });
      grupo.style.display = visible ? "block" : "none";
    });
  });
}

