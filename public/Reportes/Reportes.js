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
        const transporte = data.transporte || [];
        // Unificar asistentes y niños en una sola hoja "Boletas" con el esquema detallado
        const boletasSheet = boletas
          .map(b => ({
            "Referencia": b.referencia || "",
            "Tipo de asistente": b.tipoAsistente === "niño" ? "Niño" : "Asistente",
            "Nombre asistente": b.nombreAsistente || b.nombre || "",
            "Tipo de documento": b.tipoDocumentoAsistente || b.tipoDocumento || "",
            "Documento asistente": b.documentoAsistente || b.numeroDocumento || "",
            "Edad": b.edad || "",
            "Celular": b.celular || "",
            "Promoción": b.promocion || "",
            "Nombre comprador": b.nombreComprador || "",
            "Medio de pago": b.medioPago || b.medioPago || "",
            "Quien recibió": b.quienRecibio || b.recibido || "",
            "Fecha compra": b.fechaCompra || "",
            "Valor boleta": b.valorBoleta || "",
          }))
          .sort((a, b) => {
            if (a["Referencia"] === b["Referencia"]) {
              return a["Documento asistente"].localeCompare(b["Documento asistente"]);
            }
            return String(a["Referencia"]).localeCompare(String(b["Referencia"]));
          });
        // Logísticos
        const logis = logisticos
          .map(l => ({
            "Referencia": l.referencia || "",
            "Tipo de asistente": "Logística",
            "Nombre": l.nombre || "",
            "Tipo de documento": l.tipoDocumento || "",
            "Número de documento": l.numeroDocumento || "",
            "celular": l.celular || "",
            "Promoción": l.promocion || "",
            "Tareas": l.tareas || "",
            "Áreas de apoyo": Array.isArray(l.areasApoyo) ? l.areasApoyo.join(", ") : "",
            "Almuerzo": l.almuerzo || "",
          }))
          .sort((a, b) => String(a["referencia"]).localeCompare(String(b["referencia"])));
        // Emprendimientos
        const emps = emprendimientos
          .map(e => ({
            "Referencia": e.referencia || "",
            "Tipo de asistente": "Emprendimiento",
            "Nombre emprendimiento": e.nombreEmprendimiento || "",
            "Nombre persona": e.nombrePersona || "",
            "Tipo de documento": e.tipoDocumento || "",
            "Número de documento": e.numeroDocumento || "",
            "celular persona": e.celularPersona || "",
            "Promoción": e.promocion || "",
            "Valor promoción": e.valorPromocion || "",
            "Categorías": Array.isArray(e.categorias) ? e.categorias.join(", ") : "",
            "Productos": Array.isArray(e.productos) ? e.productos.join(", ") : "",
            "Medio de pago": e.medioPago || "",
            "Recibido por": e.recibidoPor || "",
            "Almuerzo": e.almuerzo || "",
          }))
          .sort((a, b) => String(a["Referencia"]).localeCompare(String(b["Referencia"])));
        // Micrófono abierto
        const micros = micAbierto
          .map(m => ({
            "Referencia": m.referencia || "",
            "Tipo de asistente": "Micrófono Abierto",
            "Agrupación": m.agrupacion || m.nombreAgrupacion || "",
            "Nombre persona": m.nombrePersona || m.nombre || "",
            "Tipo de documento": m.tipoDocumento || "",
            "Número de documento": m.numeroDocumento || "",
            "celular": m.celular || "",
            "Observaciones": m.observaciones || "",
            "Almuerzo": m.almuerzo || "",
          }))
          .sort((a, b) => String(a["Referencia"]).localeCompare(String(b["Referencia"])));
        // Artistas principales
        const arts = artistas
          .map(a => ({
            "Referencia": a.referencia || "",
            "Tipo de asistente": "Artista Principal",
            "Artista": a.artista || a.nombre || "",
            "Nombre persona": a.nombrePersona || "",
            "Tipo de documento": a.tipoDocumento || "",
            "Número de documento": a.numeroDocumento || "",
            "celular": a.celular || "",
            "Observaciones": a.observaciones || "",
            "Almuerzo": a.almuerzo || "",
          }))
          .sort((a, b) => String(a["Referencia"]).localeCompare(String(b["Referencia"])));
        
          // Artistas principales
        const transp = transporte
          .map(a => ({
            "Referencia": a.referencia || "",
            "Tipo de asistente": "Transporte",
            "Nombre persona": a.nombrePersona || "",
            "Tipo de documento": a.tipoDocumento || "",
            "Número de documento": a.numeroDocumento || "",
            "Celular": a.celular || "",
            "Ruta": a.ruta || "",
          }))
          .sort((a, b) => String(a["Referencia"]).localeCompare(String(b["Referencia"])));

        // Función para crear hoja tipo tabla y ajustar ancho
        function crearHojaTabla(data) {
          if (!data || !data.length) return XLSX.utils.aoa_to_sheet([[]]);
          const headers = Object.keys(data[0]);
          const aoa = [headers].concat(data.map(obj => headers.map(h => obj[h])));
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          // Ajustar ancho de columnas
          const cols = headers.map((h, i) => {
            let maxLen = h.length;
            data.forEach(row => {
              const val = row[h] ? String(row[h]) : "";
              if (val.length > maxLen) maxLen = val.length;
            });
            return { wch: maxLen + 2 };
          });
          ws['!cols'] = cols;
          // Agregar autofiltro en la primera fila
          ws['!autofilter'] = { ref: XLSX.utils.encode_range({s: {c:0, r:0}, e: {c: headers.length-1, r: aoa.length-1}}) };
          // Colorear encabezados (solo algunos lectores lo muestran)
          headers.forEach((h, i) => {
            const cell = ws[XLSX.utils.encode_cell({c: i, r: 0})];
            if (cell) {
              cell.s = {
                fill: { fgColor: { rgb: "D9E1F2" } }, // azul claro
                font: { bold: true }
              };
            }
          });
          return ws;
        }

        // Traer separaciones desde la API para incluir en el reporte
        let separaciones = [];
        try {
          const respSep = await fetch('/api/separaciones');
          const dataSep = await respSep.json();
          separaciones = (dataSep.separaciones || []).map(s => ({
            Referencia: s.referencia || '',
            'Nombre comprador': s.nombreComprador ? s.nombreComprador.replace(/_/g, ' ') : '',
            'Nombre asistente': s.nombreAsistente ? s.nombreAsistente.replace(/_/g, ' ') : '',
            'Promoción': s.promocionDescripcion || '',
            'Valor boleta': s.valorBoleta || 0,
            'Valor abonado': s.valorAbonado || 0,
            'Saldo': s.saldo || 0,
            'Celular': s.celular || '',
            'Fecha registro': s.fechaRegistro || ''
          }));
        } catch (e) {
          console.warn('No se pudieron cargar separaciones para el reporte:', e);
        }

        // Traer dinero por persona desde la API
        let dinerosPorPersona = [];
        try {
          const respDinero = await fetch('/api/dinero-por-persona');
          const dataDinero = await respDinero.json();
          dinerosPorPersona = (dataDinero.dinerosPorPersona || []).map(d => ({
            'Persona': d.persona || '',
            'Total': d.total || 0,
            'Boletas': d.boletas || 0,
            'Emprendimientos': d.emprendimientos || 0,
            'Transporte': d.transporte || 0,
            'Separaciones': d.separaciones || 0
          }));
        } catch (e) {
          console.warn('No se pudieron cargar dineros por persona para el reporte:', e);
        }

        const almuerzos = [];
        // Emprendimientos
        (emprendimientos || []).forEach(e => {
          if ((String(e.almuerzo || '').toLowerCase()) === 'si') {
            almuerzos.push({
              Nombre: e.nombreEmprendimiento || e.nombrePersona || e.nombre || '',
              Documento: e.numeroDocumento || e.documento || '',
              Origen: 'Emprendimiento',
              Detalle: '',
              Observaciones: e.observaciones || ''
            });
          }
        });
        // Logísticos
        (logisticos || []).forEach(l => {
          if ((String(l.almuerzo || '').toLowerCase()) === 'si') {
            almuerzos.push({
              Nombre: l.nombre || l.nombrePersona || '',
              Documento: l.numeroDocumento || l.documento || '',
              Origen: 'Logística',
              Detalle: Array.isArray(l.areasApoyo) ? l.areasApoyo.join(", ") : "",
              Observaciones: l.observaciones || ''
            });
          }
        });
        // Micrófono Abierto
        (micAbierto || []).forEach(m => {
          if ((String(m.almuerzo || '').toLowerCase()) === 'si') {
            almuerzos.push({
              Nombre: m.agrupacion || m.nombrePersona || m.nombre || '',
              Documento: m.numeroDocumento || m.documento || '',
              Origen: 'Micrófono Abierto',
              Detalle: '',
              Observaciones: m.observaciones || ''
            });
          }
        });
        // Artistas
        (artistas || []).forEach(a => {
          if ((String(a.almuerzo || '').toLowerCase()) === 'si') {
            almuerzos.push({
              Nombre: a.nombrePersona,
              Documento: a.numeroDocumento || a.documento || '',
              Origen: 'Artista',
              Detalle: a.artista,
              Observaciones: a.observaciones || ''
            });
          }
        });

        // Crear workbook y hojas tipo tabla
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(boletasSheet), 'Boletas');
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(emps), 'Emprendimientos');
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(micros), 'Micrófono Abierto');
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(arts), 'Artistas Principales');
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(logis), 'Logística');
        XLSX.utils.book_append_sheet(wb, crearHojaTabla(transp), 'Transporte');
        // Agregar hoja de almuerzos si hay datos
        if (almuerzos && almuerzos.length) {
          XLSX.utils.book_append_sheet(wb, crearHojaTabla(almuerzos), 'Almuerzos');
        }
        // Agregar hoja de separaciones si hay datos
        if (separaciones && separaciones.length) {
          XLSX.utils.book_append_sheet(wb, crearHojaTabla(separaciones), 'Separaciones');
        }
        // Agregar hoja de dinero por persona si hay datos
        if (dinerosPorPersona && dinerosPorPersona.length) {
          XLSX.utils.book_append_sheet(wb, crearHojaTabla(dinerosPorPersona), 'Dinero por Persona');
        }
        // Descargar archivo con fecha
        const ahora = new Date();
        const fechaFormato = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()}`;
        XLSX.writeFile(wb, `Reporte Festival Conectando ${fechaFormato}.xlsx`);
      });
    };
    document.getElementById('reportesResumen').parentNode.insertBefore(btnExcel, document.getElementById('reportesResumen'));
  }

  const resp = await fetch("/api/traer-costos");
  const data = await resp.json();
  const costos = data.costos || [];
  
  // Si no hay costos, verificar y crear por defecto
  if (costos.length === 0) {
    try {
      const statusResp = await fetch("/api/costos-status");
      const statusData = await statusResp.json();
      console.log("Status de costos:", statusData);
      if (statusData.costos && statusData.costos.length > 0) {
        costos.push(statusData.costos[0]);
      } else if (statusData.status === "creado") {
        costos.push(statusData.costos);
      }
    } catch (e) {
      console.error("Error verificando costos:", e);
    }
  }

  // Traer valores de costos y metas desde catalogos.json
  let totalCostos = 0, reunidoPreviamente = 0, gananciaEsperada = 0, precioBoleta=0;
  try {
    //const respCat = await fetch("../data/catalogos.json");
    //const cat = await respCat.json();
    console.log("Costos cargados:", costos);
    totalCostos = costos[0]?.MetaCostosSubTotal || 0;
    reunidoPreviamente = costos[0]?.MetaColchonFetival || 0;
    gananciaEsperada = costos[0]?.MetaGanancia || 0;
    precioBoleta = costos[0]?.PrecioBoleta || 0;
    console.log("totalCostos:", totalCostos, "reunidoPreviamente:", reunidoPreviamente, "gananciaEsperada:", gananciaEsperada, "precioBoleta:", precioBoleta);
  } catch (e) {
    console.error("Error cargando costos:", e);
  }
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
  const transporte = data.transporte || [];

  // Traer separaciones para métricas
  let separaciones = [];
  try {
    const respSep = await fetch('/api/separaciones');
    const dataSep = await respSep.json();
    separaciones = dataSep.separaciones || [];
  } catch (e) {
    console.warn('No se pudieron cargar separaciones:', e);
  }
  const totalSeparadas = separaciones.length;

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
  // Transportes
  const totalTransportes = transporte.length;
  const totalRecaudoTransportes = totalTransportes*25000;
  // Personas por emprendimientos (1 por emprendimiento)
  const totalPersonasEmprendimientos = totalEmprendimientos;
  // Total personas
  // Para aforo, no contar niños, pero sí logísticos y micAbierto
  const totalPersonasAforo = boletasAdultos.length + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto + totalArtistas;
  totalPersonas = totalPersonasBoletas + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto;
  totalPersonas = totalPersonasBoletas + totalPersonasEmprendimientos + totalLogisticos + totalMicAbierto + totalArtistas + totalSeparadas;
  // Total recaudado: boletas (solo adultos) + emprendimientos
  // Sumar el valor de boletas pagas (adultos) usando promocion
  let recaudadoBoletas = 0;
  boletasAdultos.forEach(b => {
    if (b.promocion) {
      const match = b.promocion.match(/\$([\d.,]+)/);
      if (match) {
        const valor = parseInt(match[1].replace(/[.,]/g, ""));
        recaudadoBoletas += valor;
      }
    } else if (b.valorBoleta) {
      recaudadoBoletas += Number(b.valorBoleta);
    }
  });
  

  
  const totalAbonadoSeparaciones = separaciones.reduce((acc, s) => acc + (Number(s.valorAbonado) || 0), 0);
  const totalValorSeparadas = separaciones.reduce((acc, s) => acc + (Number(s.valorBoleta) || 0), 0);
  const espaciosLibresConSeparacion = Math.max(aforoMaximo - totalPersonasAforo - totalSeparadas, 0);

  // Sumar el valor real de cada emprendimiento según su promoción
  let recaudadoEmprendimientos = emprendimientos.reduce((acc, emp) => acc + (emp.valorPromocion ? Number(emp.valorPromocion) : 0), 0);
  totalRecaudado = recaudadoBoletas + recaudadoEmprendimientos + totalAbonadoSeparaciones;

  // Calcular total de almuerzos (mismo cálculo que en el botón Excel)
  let totalAlmuerzos = 0;
  try {
    let almuerzosCont = [];
    (emprendimientos || []).forEach(e => {
      if ((String(e.almuerzo || '').toLowerCase()) === 'si') almuerzosCont.push(e);
    });
    (logisticos || []).forEach(l => {
      if ((String(l.almuerzo || '').toLowerCase()) === 'si') almuerzosCont.push(l);
    });
    (micAbierto || []).forEach(m => {
      if ((String(m.almuerzo || '').toLowerCase()) === 'si') almuerzosCont.push(m);
    });
    (artistas || []).forEach(a => {
      if ((String(a.almuerzo || '').toLowerCase()) === 'si') almuerzosCont.push(a);
    });
    totalAlmuerzos = almuerzosCont.length;
  } catch (e) {
    console.warn('Error al calcular total almuerzos:', e);
  }

  // Traer dinero por persona
  let dinerosPorPersona = [];
  try {
    const respDinero = await fetch('/api/dinero-por-persona');
    const dataDinero = await respDinero.json();
    dinerosPorPersona = dataDinero.dinerosPorPersona || [];
  } catch (e) {
    console.warn('No se pudieron cargar dineros por persona:', e);
  }

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

      <!-- Grupo 1b: Separaciones y espacios libres considerando separaciones -->
      <div class="row mb-3">
        <div class="col-md-4">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Boletas separadas</h5>
              <div class="display-6">${totalSeparadas}</div>
              <small class="text-muted">Abonos: $${Number(totalAbonadoSeparaciones).toLocaleString('es-CO')}</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Estimado si se completan</h5>
              <div class="display-6">$${Number(totalValorSeparadas).toLocaleString('es-CO')}</div>
              <small class="text-muted">Suma valores boleta separadas</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Espacios libres (con separaciones)</h5>
              <div class="display-6">${espaciosLibresConSeparacion}</div>
              <small class="text-muted">Incluye ${totalSeparadas} separadas</small>
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
              <div class="display-6">${totalBoletasVendidas} </br> $${recaudadoBoletas.toLocaleString('es-CO')}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total emprendimientos</h5>
              <div class="display-6">${totalEmprendimientos}</br> $${recaudadoEmprendimientos.toLocaleString('es-CO')}</div>
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
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total transporte</h5>
              <div class="display-6">${totalTransportes}</br> $${totalRecaudoTransportes.toLocaleString('es-CO')}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total almuerzos</h5>
              <div class="display-6">${totalAlmuerzos}</div>
              <small class="text-muted">Emprendimientos, logística, micrófono, artistas</small>
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
                  let maxValor = precioBoleta;
                  return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                })()}
                <small class="text-muted">(Valor boleta: $${boletasAdultos.length > 0 ? (() => {
                  let maxValor = precioBoleta;
                  return maxValor.toLocaleString('es-CO');
                })() : '0'})</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 4b: Boletas faltantes considerando separaciones completadas -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Boletas faltantes por vender (con separaciones)</h5>
              <span class="text-info">
                Si se completan ${totalSeparadas} separadas ($${totalValorSeparadas.toLocaleString('es-CO')}), faltarían:
                <div class="display-6 mt-2">
                  ${(() => {
                    const recaudoConSeparaciones = totalRecaudado + totalValorSeparadas -totalAbonadoSeparaciones;
                    const faltante = Math.max(totalCostos - recaudoConSeparaciones, 0);
                    let maxValor = precioBoleta;
                    return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                  })()}
                </div>
                <small class="text-muted">boletas</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 4c: Faltante para colchón Festival (sin ganancia) -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Faltante para colchón Festival</h5>
              <div class="display-6">$${(() => {
                // Faltante solo para colchón (sin ganancia esperada)
                const metaTotal = totalCostos + reunidoPreviamente;
                const faltante = Math.max(metaTotal - totalRecaudado, 0);
                return faltante.toLocaleString('es-CO');
              })()}</div>
              <small class="text-muted">Meta: $${(totalCostos + reunidoPreviamente).toLocaleString('es-CO')}</small>
              <br>
              <span class="text-info">
                Boletas faltantes por vender: 
                ${(() => {
                  const metaTotal = totalCostos + reunidoPreviamente;
                  const faltante = Math.max(metaTotal - totalRecaudado, 0);
                  let maxValor = precioBoleta;
                  return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                })()}
                <small class="text-muted">(Valor boleta: $${precioBoleta.toLocaleString('es-CO')})</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 4d: Faltante para colchón Festival (con separaciones, sin ganancia) -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Faltante para colchón Festival (con separaciones)</h5>
              <span class="text-info">
                Si se completan ${totalSeparadas} separadas ($${totalValorSeparadas.toLocaleString('es-CO')}), faltarían:
                <div class="display-6 mt-2">
                  ${(() => {
                    const recaudoConSeparaciones = totalRecaudado + (totalValorSeparadas - totalAbonadoSeparaciones);
                    const metaTotal = totalCostos + reunidoPreviamente;
                    const faltante = Math.max(metaTotal - recaudoConSeparaciones, 0);
                    let maxValor = precioBoleta;
                    return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                  })()}
                </div>
                <small class="text-muted">boletas</small>
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
                // Faltante considerando: reunidoPreviamente (colchón) + gananciaEsperada
                // Recaudo sin considerar separaciones completadas
                const metaTotal = totalCostos + reunidoPreviamente + gananciaEsperada;
                const faltante = Math.max(metaTotal - totalRecaudado, 0);
                return faltante.toLocaleString('es-CO');
              })()}</div>
              <small class="text-muted">Meta: $${(totalCostos + reunidoPreviamente + gananciaEsperada).toLocaleString('es-CO')}</small>
              <br>
              <span class="text-info">
                Boletas faltantes por vender: 
                ${(() => {
                  const metaTotal = totalCostos + reunidoPreviamente + gananciaEsperada;
                  const faltante = Math.max(metaTotal - totalRecaudado, 0);
                  let maxValor = precioBoleta;
                  return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                })()}
                <small class="text-muted">(Valor boleta: $${precioBoleta.toLocaleString('es-CO')})</small>
              </span>
              </div>
          </div>
        </div>
      </div>

      <!-- Grupo 5b: Faltante para colchón Festival y ganancia esperada (con separaciones) -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Faltante para colchón Festival y ganancia esperada (con separaciones)</h5>
              <div class="display-6">$${(() => {
                // Calcular recaudo considerando separaciones completadas
                const recaudoConSeparaciones = totalRecaudado + (totalValorSeparadas - totalAbonadoSeparaciones);
                // Meta total a alcanzar
                const metaTotal = totalCostos + reunidoPreviamente + gananciaEsperada;
                const faltante = Math.max(metaTotal - recaudoConSeparaciones, 0);
                return faltante.toLocaleString('es-CO');
              })()}</div>
              <small class="text-muted">Si se completan ${totalSeparadas} separadas ($${totalValorSeparadas.toLocaleString('es-CO')})</small>
              <br>
              <span class="text-info">
                Boletas faltantes por vender: 
                ${(() => {
                  const recaudoConSeparaciones = totalRecaudado + (totalValorSeparadas - totalAbonadoSeparaciones);
                  const metaTotal = totalCostos + reunidoPreviamente + gananciaEsperada;
                  const faltante = Math.max(metaTotal - recaudoConSeparaciones, 0);
                  let maxValor = precioBoleta;
                  return maxValor > 0 ? Math.ceil(faltante / maxValor) : '-';
                })()}
                <small class="text-muted">boletas</small>
              </span>
              </div>
          </div>
        </div>
      </div>

      <!-- Grupo 6: Dinero recolectado por persona -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card card-report shadow">
            <div class="card-body">
              <h5 class="card-title">Dinero recolectado por persona</h5>
              <div style="overflow-x: auto;">
                <table class="table table-sm table-striped">
                  <thead class="table-light">
                    <tr>
                      <th>Persona</th>
                      <th class="text-end">Total</th>
                      <th class="text-end">Boletas</th>
                      <th class="text-end">Emprendimientos</th>
                      <th class="text-end">Transporte</th>
                      <th class="text-end">Separaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dinerosPorPersona.length > 0 ? dinerosPorPersona.map(d => '<tr><td><strong>' + d.persona + '</strong></td><td class="text-end"><strong>$' + (d.total || 0).toLocaleString('es-CO') + '</strong></td><td class="text-end">$' + (d.boletas || 0).toLocaleString('es-CO') + '</td><td class="text-end">$' + (d.emprendimientos || 0).toLocaleString('es-CO') + '</td><td class="text-end">$' + (d.transporte || 0).toLocaleString('es-CO') + '</td><td class="text-end">$' + (d.separaciones || 0).toLocaleString('es-CO') + '</td></tr>').join('') : '<tr><td colspan="6" class="text-center text-muted">Sin datos</td></tr>'}
                  </tbody>
                  <tfoot class="table-light">
                    <tr>
                      <th>TOTAL</th>
                      <th class="text-end"><strong>$${dinerosPorPersona.reduce((acc, d) => acc + (d.total || 0), 0).toLocaleString('es-CO')}</strong></th>
                      <th class="text-end">$${dinerosPorPersona.reduce((acc, d) => acc + (d.boletas || 0), 0).toLocaleString('es-CO')}</th>
                      <th class="text-end">$${dinerosPorPersona.reduce((acc, d) => acc + (d.emprendimientos || 0), 0).toLocaleString('es-CO')}</th>
                      <th class="text-end">$${dinerosPorPersona.reduce((acc, d) => acc + (d.transporte || 0), 0).toLocaleString('es-CO')}</th>
                      <th class="text-end">$${dinerosPorPersona.reduce((acc, d) => acc + (d.separaciones || 0), 0).toLocaleString('es-CO')}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    contenedor.innerHTML = `<div class='alert alert-danger'>Error al cargar los reportes.</div>`;
  }
});
