document.addEventListener("DOMContentLoaded", async function () {
  // Agregar SheetJS por CDN si no está presente
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = function() {};
    document.head.appendChild(script);
  }
  // Botón para descargar Excel
  if (!document.getElementById('btnDescargarExcel')) {
    const btnExcel = document.createElement('button');
    btnExcel.id = 'btnDescargarExcel';
  btnExcel.className = 'btn btn-success btn-margin-abajo';
    btnExcel.innerText = 'Descargar reporte Excel por grupo';
    btnExcel.onclick = async function() {
      // Esperar que SheetJS esté cargado
      function waitForSheetJS(cb) {
        if (window.XLSX) cb();
        else setTimeout(() => waitForSheetJS(cb), 200);
      }
      waitForSheetJS(async function() {
        const resp = await fetch("/api/traer-todo");
        const data = await resp.json();
        const boletas = data.boletas || [];
        const emprendimientos = data.emprendimientos || [];
        const logisticos = data.logisticos || [];
        const micAbierto = data.micAbierto || [];
        const artistas = data.artistas || [];

        // Unificar asistentes y niños en una sola hoja "Boletas" con el esquema detallado
        const boletasSheet = boletas
          .map(b => ({
            "Tipo de asistente": b.tipoAsistente === "niño" ? "Niño" : "Asistente",
            "Nombre asistente": b.nombreAsistente || b.nombre || "",
            "Tipo de documento": b.TipoDocumentoAsistente || b.tipoDocumento || "",
            "Documento asistente": b.DocumentoAsistente || b.numeroDocumento || "",
            "Edad": b.edad || "",
            "Celular": b.celular || "",
            "Promoción": b.Promocion || "",
            "Nombre comprador": b.nombreComprador || "",
            "Medio de pago": b.MedioPago || b.medioPago || "",
            "Quien recibió": b.QuienRecibio || b.recibido || "",
            "Referencia": b.Referencia || "",
            "Fecha compra": b.FechaCompra || "",
            "Valor boleta": b.valorBoleta || "",
          }))
          .sort((a, b) => {
            if (a["Documento asistente"] === b["Documento asistente"]) {
              return a["Nombre asistente"].localeCompare(b["Nombre asistente"]);
            }
            return a["Documento asistente"].localeCompare(b["Documento asistente"]);
          });
        // Logísticos
        const logis = logisticos
          .map(l => ({
            "Tipo de asistente": "Logística",
            "Nombre": l.nombre || "",
            "Tipo de documento": l.tipoDocumento || "",
            "Número de documento": l.numeroDocumento || "",
            "Celular": l.celular || "",
            "Promoción": l.promocion || "",
            "Tareas": l.tareas || "",
            "Áreas de apoyo": Array.isArray(l.areasApoyo) ? l.areasApoyo.join(", ") : "",
          }))
          .sort((a, b) => a["Nombre"].localeCompare(b["Nombre"]));
        // Emprendimientos
        const emps = emprendimientos
          .map(e => ({
            "Tipo de asistente": "Emprendimiento",
            "Nombre emprendimiento": e.nombreEmprendimiento || "",
            "Nombre persona": e.nombrePersona || "",
            "Tipo de documento": e.tipoDocumento || "",
            "Número de documento": e.numeroDocumento || "",
            "Celular persona": e.celularPersona || "",
            "Promoción": e.promocion || "",
            "Valor promoción": e.valorPromocion || "",
            "Categorías": Array.isArray(e.categorias) ? e.categorias.join(", ") : "",
            "Productos": Array.isArray(e.productos) ? e.productos.join(", ") : "",
            "Medio de pago": e.medioPago || "",
            "Recibido por": e.recibidoPor || "",
          }))
          .sort((a, b) => a["Nombre emprendimiento"].localeCompare(b["Nombre emprendimiento"]));
        // Micrófono abierto
        const micros = micAbierto
          .map(m => ({
            "Tipo de asistente": "Micrófono Abierto",
            "Agrupación": m.agrupacion || m.nombreAgrupacion || "",
            "Nombre persona": m.nombrePersona || m.nombre || "",
            "Tipo de documento": m.tipoDocumento || "",
            "Número de documento": m.numeroDocumento || "",
            "Celular": m.celular || "",
            "Observaciones": m.observaciones || "",
          }))
          .sort((a, b) => a["Agrupación"].localeCompare(b["Agrupación"]));
        // Artistas principales
        const arts = artistas
          .map(a => ({
            "Tipo de asistente": "Artista Principal",
            "Artista": a.artista || a.nombre || "",
            "Nombre persona": a.nombrePersona || "",
            "Tipo de documento": a.tipoDocumento || "",
            "Número de documento": a.numeroDocumento || "",
            "Celular": a.celular || "",
            "Observaciones": a.observaciones || "",
          }))
          .sort((a, b) => a["Artista"].localeCompare(b["Artista"]));

        // Crear workbook y hojas
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(boletasSheet), 'Boletas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emps), 'Emprendimientos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(micros), 'Micrófono Abierto');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arts), 'Artistas Principales');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logis), 'Logística');

        // Descargar archivo
        XLSX.writeFile(wb, 'reporte_asistentes_grupos.xlsx');
      });
    };
    document.getElementById('reportesResumen').parentNode.insertBefore(btnExcel, document.getElementById('reportesResumen'));
  }
  // Traer valores de costos y metas desde catalogos.json
  let totalCostos = 0, reunidoPreviamente = 0, gananciaEsperada = 0;
  try {
    const respCat = await fetch("data/catalogos.json");
    const cat = await respCat.json();
    totalCostos = cat.totalCostos || 0;
    reunidoPreviamente = cat.reunidoPreviamente || 0;
    gananciaEsperada = cat.gananciaEsperada || 0;
  } catch {}
  const aforoMaximo = 200;
  const contenedor = document.getElementById("reportesResumen");
  let totalPersonas = 0;
  let totalBoletas = 0;
  let totalNinos = 0;
  let totalEmprendimientos = 0;
  let totalRecaudado = 0;

  try {
    // Traer boletas y emprendimientos
  const resp = await fetch("/api/traer-todo");
  const data = await resp.json();
  const boletas = data.boletas || [];
  const emprendimientos = data.emprendimientos || [];
  const logisticos = data.logisticos || [];
  const micAbierto = data.micAbierto || [];
  const artistas = data.artistas || [];

  // Boletas
  const boletasAdultos = boletas.filter(b => b.tipoAsistente !== "niño");
  const boletasNinos = boletas.filter(b => b.tipoAsistente === "niño");
  totalBoletas = boletasAdultos.length;
  totalNinos = boletasNinos.length;
  const totalBoletasVendidas = totalBoletas; // Solo adultos
  // Personas por boletas (adultos + niños)
  const totalPersonasBoletas = boletas.length;
  // Emprendimientos
  totalEmprendimientos = emprendimientos.length;
  // Logísticos
  const totalLogisticos = logisticos.length;
  // Micrófono abierto
  const totalMicAbierto = micAbierto.length;
  // Artistas
  const totalArtistas = artistas.length;
  // Personas por emprendimientos (1 por emprendimiento)
  const totalPersonasEmprendimientos = totalEmprendimientos;
  // Total personas
  // Para aforo, no contar niños, pero sí logísticos y micAbierto
  const totalPersonasAforo = boletasAdultos.length + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto + totalArtistas;
  totalPersonas = totalPersonasBoletas + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto;
  totalPersonas = totalPersonasBoletas + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto + totalArtistas;
  // Total recaudado: boletas (solo adultos) + emprendimientos
  // Sumar el valor de boletas pagas (adultos) usando Promocion
  let recaudadoBoletas = 0;
  boletasAdultos.forEach(b => {
    if (b.Promocion) {
      const match = b.Promocion.match(/\$([\d.,]+)/);
      if (match) {
        const valor = parseInt(match[1].replace(/[.,]/g, ""));
        recaudadoBoletas += valor;
      }
    } else if (b.valorBoleta) {
      recaudadoBoletas += Number(b.valorBoleta);
    }
  });
  // Sumar el valor real de cada emprendimiento según su promoción
  let recaudadoEmprendimientos = emprendimientos.reduce((acc, emp) => acc + (emp.valorPromocion ? Number(emp.valorPromocion) : 0), 0);
  totalRecaudado = recaudadoBoletas + recaudadoEmprendimientos;

    contenedor.innerHTML = `
      <!-- Grupo 1: Espacios libres y cantidad total personas -->
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Espacios libres</h5>
              <div class="display-6">${aforoMaximo - totalPersonasAforo}</div>
              <small class="text-muted">Aforo máximo: ${aforoMaximo}</small>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Cantidad total personas</h5>
              <div class="display-6">${totalPersonas}</div>
              <small class="text-muted">Asistentes, niños, emprendimientos, logísticos, artistas e invitados</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 2: Total recaudado, boletas, emprendimientos, niños -->
      <div class="row mb-3">
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total recaudado</h5>
              <div class="display-6">$${totalRecaudado.toLocaleString('es-CO')}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total boletas vendidas</h5>
              <div class="display-6">${totalBoletasVendidas}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total emprendimientos</h5>
              <div class="display-6">${totalEmprendimientos}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total logísticos</h5>
              <div class="display-6">${totalLogisticos}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Micrófono Abierto</h5>
              <div class="display-6">${totalMicAbierto}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Artistas principales</h5>
              <div class="display-6">${totalArtistas}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total niños</h5>
              <div class="display-6">${totalNinos}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 3: Meta de costos -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Meta de costos</h5>
              <div class="display-6">$${totalCostos.toLocaleString('es-CO')}</div>
              <small class="text-muted">Total a reunir para cubrir costos</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 4: Faltante para costos y promedio de boletas faltantes -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Faltante para costos</h5>
              <div class="display-6">$${Math.max(totalCostos - totalRecaudado, 0).toLocaleString('es-CO')}</div>
              <small class="text-muted">Meta: $${totalCostos.toLocaleString('es-CO')}</small>
              <br>
              <span class="text-info">
                Boletas faltantes por vender: 
                ${(() => {
                  const faltante = Math.max(totalCostos - totalRecaudado, 0);
                  let maxValor = 0;
                  boletasAdultos.forEach(b => {
                    let valor = 0;
                    if (b.Promocion) {
                      const match = b.Promocion.match(/\$([\d.,]+)/);
                      if (match) valor = parseInt(match[1].replace(/[.,]/g, ""));
                    } else if (b.valorBoleta) {
                      valor = Number(b.valorBoleta);
                    }
                    if (valor > maxValor) maxValor = valor;
                  });
                  return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                })()}
                <small class="text-muted">(Valor boleta: $${boletasAdultos.length > 0 ? (() => {
                  let maxValor = 0;
                  boletasAdultos.forEach(b => {
                    let valor = 0;
                    if (b.Promocion) {
                      const match = b.Promocion.match(/\$([\d.,]+)/);
                      if (match) valor = parseInt(match[1].replace(/[.,]/g, ""));
                    } else if (b.valorBoleta) {
                      valor = Number(b.valorBoleta);
                    }
                    if (valor > maxValor) maxValor = valor;
                  });
                  return maxValor.toLocaleString('es-CO');
                })() : '0'})</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 5: Faltante para reunido previamente + ganancia esperada -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Faltante para colchón Festival y ganancia esperada</h5>
              <div class="display-6">$${(() => {
                // Si no se ha cubierto el costo, mostrar '-'
                if (totalRecaudado < totalCostos) return '-';
                // Faltante para colchón Festival
                const faltanteReunido = Math.max(reunidoPreviamente - (totalRecaudado - totalCostos), 0);
                // Faltante para ganancia esperada
                const faltanteGanancia = (totalRecaudado < totalCostos + reunidoPreviamente)
                  ? gananciaEsperada
                  : Math.max(gananciaEsperada - (totalRecaudado - totalCostos - reunidoPreviamente), 0);
                // Sumar ambos
                return (faltanteReunido + faltanteGanancia).toLocaleString('es-CO');
              })()}</div>
              <small class="text-muted">Meta colchón Festival: $${reunidoPreviamente.toLocaleString('es-CO')} + Meta ganancia esperada: $${gananciaEsperada.toLocaleString('es-CO')}</small>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    contenedor.innerHTML = `<div class='alert alert-danger'>Error al cargar los reportes.</div>`;
  }
});
