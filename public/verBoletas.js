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
      let historialHtml = "";
      // Historial de envíos WhatsApp
      if (Array.isArray(boleta.historialEnvio) && boleta.historialEnvio.length > 0) {
        historialHtml += `<details class='mt-2'><summary>Historial de envíos WhatsApp (${boleta.historialEnvio.length})</summary><ul class='list-group mt-2'>`;
        boleta.historialEnvio.slice().reverse().forEach(item => {
          historialHtml += `<li class='list-group-item'>
            <div><strong>Fecha:</strong> ${item.fecha ? new Date(item.fecha).toLocaleString() : "-"}</div>
            <div><strong>Mensaje:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.mensaje || "-"}</pre></div>
            <div><strong>Respuesta:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.respuesta || "-"}</pre></div>
          </li>`;
        });
        historialHtml += `</ul></details>`;
      }
      // Historial de comprobante
      if (Array.isArray(boleta.historialComprobante) && boleta.historialComprobante.length > 0) {
        historialHtml += `<details class='mt-2'><summary>Historial de comprobante (${boleta.historialComprobante.length})</summary><ul class='list-group mt-2'>`;
        boleta.historialComprobante.slice().reverse().forEach(item => {
          historialHtml += `<li class='list-group-item'>
            <div><strong>Paso:</strong> ${item.paso || "-"}</div>
            <div><strong>Fecha:</strong> ${item.fecha ? new Date(item.fecha).toLocaleString() : "-"}</div>
            <div><strong>Mensaje:</strong> <pre style='white-space:pre-wrap;font-size:12px;'>${item.mensaje || "-"}</pre></div>
          </li>`;
        });
        historialHtml += `</ul></details>`;
      }
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
            ${historialHtml}
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
        let caption = `🎉 ¡Gracias ${boleta.nombreAsistente} por ser parte del Festival Conectando! 🎶✨\n\n` +
          `🗓 Te esperamos el 29 de noviembre en el Restaurante Campestre Villa Valeria en Usme, Bogotá. Las puertas abren a las 9:00 a.m. En el ingreso recibirás un cupón para reclamar una bebida (chicha, té de coca, café o agua) . No olvides tu vaso reutilizable. 🌎💚\n\n` +
          `Habrá emprendimientos con alimentos y almuerzo. 🍔🥙 \nNo se permite el ingreso de alimentos y/o bebidas, ni el consumo de drogas, cannabis u hongos. 🚫🍫🚫🌿🚫🍄\n\n` +
          `Trae impermeable o sombrilla para la lluvia 🌧☔ y, si puedes, un cojín 🛋 o colchoneta para sentarte. \n🪑Las sillas serán prioridad para las personas mayores, mujeres embarazadas, y niños de brazos. 👵🤰👶\n\n` +
          `📲 Mantente pendiente de nuestras redes sociales para actualizaciones.\n\n` +
          `🌞 ¡Nos para celebrar la vida y hacer de esta primera edición del festival algo inolvidable! 🙌🌈`;
        let respuestaServicio = "";
        try {
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
          try {
            respuestaServicio = await resp.text();
          } catch (e) {
            respuestaServicio = "Error leyendo respuesta";
          }
          let actual = parseInt(contadorSpan.textContent, 10) || 0;
          if (resp.ok) {
            actual++;
            contadorSpan.textContent = actual;
            boleta.EnvioWhatsapp = actual;
          }
          const historialEnvio = {
            fecha: new Date().toISOString(),
            mensaje: caption,
            respuesta: respuestaServicio
          };
          await fetch("/actualizar-envio-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referencia: boleta.Referencia, EnvioWhatsapp: boleta.EnvioWhatsapp, historialEnvio })
          });
          if (resp.ok) {
            alert('Mensaje reenviado exitosamente');
          } else {
            alert('No se pudo reenviar el mensaje de WhatsApp.');
          }
        } catch (err) {
          const historialEnvio = {
            fecha: new Date().toISOString(),
            mensaje: caption,
            respuesta: err?.message || "Error en envío"
          };
          await fetch("/actualizar-envio-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referencia: boleta.Referencia, EnvioWhatsapp: boleta.EnvioWhatsapp, historialEnvio })
          });
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

