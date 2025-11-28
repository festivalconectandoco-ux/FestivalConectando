let gastosRegistrados = [];
let presupuestoTotal = 0;
let totalVendidoFestival = 0;
let metaColchon = 0;
let currentPagos = []; // pagos temporales del formulario

// Helper: obtiene el abonado real de un gasto (suma de pagos si existen, o campo legacy)
function getGastoAbonado(g) {
  if (!g) return 0;
  if (Array.isArray(g.pagos) && g.pagos.length > 0) {
    return g.pagos.reduce((s, p) => s + Number(p.monto || 0), 0);
  }
  return Number(g.abonado || 0);
}

// Renderizar pagos en el formulario (expuesto globalmente)
function renderPagosFormulario() {
  const cont = document.getElementById('listaPagos');
  const total = currentPagos.reduce((s,p) => s + Number(p.monto||0), 0);
  const abonadoEl = document.getElementById('abonado');
  if (abonadoEl) abonadoEl.value = total;
  if (!cont) return;
  if (currentPagos.length === 0) { cont.innerHTML = '<small class="text-muted">Sin abonos agregados</small>'; return; }
  cont.innerHTML = currentPagos.map((p, i) => `
    <div class="d-flex justify-content-between align-items-center mb-1">
      <div><strong>$${Number(p.monto).toLocaleString('es-CO')}</strong> — ${p.origenDinero || '-'} <small class="text-muted">${p.fecha ? p.fecha.substring(0,10) : ''}</small></div>
      <div><button type="button" class="btn btn-sm btn-outline-danger" onclick="removePagoFormulario(${i})">Eliminar</button></div>
    </div>
  `).join('');
}

window.removePagoFormulario = function(index) {
  currentPagos.splice(index,1);
  renderPagosFormulario();
}

document.addEventListener("DOMContentLoaded", async function () {
  // Cargar datos iniciales
  await cargarPresupuestoTotal();
  await cargarTotalVendido();
  cargarGastos();
  
  // Mostrar resumen después de cargar todo
  mostrarResumenPresupuesto();
  
  // Evento del formulario
  document.getElementById("formPresupuesto").addEventListener("submit", async function (e) {
    e.preventDefault();
    await agregarGasto();
  });

  // Botones de reportes y export
  const btnResumen = document.getElementById('btnResumenOrigen');
  const btnExport = document.getElementById('btnExportExcel');
  if (btnResumen) btnResumen.addEventListener('click', () => mostrarResumenPorOrigen());
  if (btnExport) btnExport.addEventListener('click', () => exportarAExcel());
  // manejadores de pagos en formulario
  const btnAgregarPago = document.getElementById('btnAgregarPago');
  if (btnAgregarPago) btnAgregarPago.addEventListener('click', () => {
    const montoEl = document.getElementById('pagoMonto');
    const origenEl = document.getElementById('pagoOrigen');
    const fechaEl = document.getElementById('pagoFecha');
    const monto = Number(montoEl.value || 0);

    if (!monto || monto <= 0) { 
        alert('Ingrese un monto válido'); 
        return; 
    }

    const pago = { 
        monto, 
        origenDinero: origenEl.value || '', 
        fecha: fechaEl.value || new Date().toISOString() 
    };

    currentPagos.push(pago);
    // 🔑 Recalcular abonado y ajustar presupuesto si es necesario
    const abonado = currentPagos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const presEl = document.getElementById('presupuesto');
    const abonEl = document.getElementById('abonado');

    let presupuesto = Number(presEl.value || 0);
    if (abonado > presupuesto) {
        presupuesto = abonado;
        presEl.value = presupuesto;
    }
    if (abonEl) abonEl.value = abonado;

    // limpiar inputs
    montoEl.value = '';
    origenEl.value = '';
    fechaEl.value = '';

    renderPagosFormulario();
  });
      // render inicial de pagos
      renderPagosFormulario();
});


// --- Reportes por Origen y exportación a Excel ---
function calcularTotalesPorOrigen() {
  const totals = {};
  gastosRegistrados.forEach(g => {
    // Si el gasto tiene pagos individuales, sumar cada pago por su origen
    if (Array.isArray(g.pagos) && g.pagos.length > 0) {
      g.pagos.forEach(p => {
        const origen = (p.origenDinero || '').trim() || '(sin origen)';
        if (!totals[origen]) totals[origen] = { origen, totalAbonado: 0, totalPresupuesto: 0, count: 0 };
        totals[origen].totalAbonado += Number(p.monto || 0);
        totals[origen].count += 1;
      });
      // Además, sumar el presupuesto del gasto al origen principal si definido
      const gastoOrigen = (g.origenDinero || '').trim() || '(sin origen)';
      if (!totals[gastoOrigen]) totals[gastoOrigen] = { origen: gastoOrigen, totalAbonado: 0, totalPresupuesto: 0, count: 0 };
      totals[gastoOrigen].totalPresupuesto += Number(g.presupuesto || 0);
    } else {
      const origen = (g.origenDinero || '').trim() || '(sin origen)';
      if (!totals[origen]) totals[origen] = { origen, totalAbonado: 0, totalPresupuesto: 0, count: 0 };
      totals[origen].totalAbonado += getGastoAbonado(g);
      totals[origen].totalPresupuesto += Number(g.presupuesto || 0);
      totals[origen].count += 1;
    }
  });
  // Convertir a array y ordenar por totalAbonado descendente
  return Object.values(totals).sort((a,b) => b.totalAbonado - a.totalAbonado);
}

function mostrarResumenPorOrigen() {
  const cont = document.getElementById('origenResumen');
  const lista = calcularTotalesPorOrigen();
  if (!cont) return;
  if (lista.length === 0) {
    cont.innerHTML = '<div class="alert alert-info">No hay gastos registrados.</div>';
    return;
  }
  let html = '<div class="card mb-3"><div class="card-body">';
  html += '<h5 class="card-title">Resumen por Origen</h5>';
  html += '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Origen</th><th class="text-end">Abonado</th><th class="text-end">Presupuesto</th><th class="text-end">#</th></tr></thead><tbody>';
  lista.forEach(row => {
    html += `<tr><td>${row.origen}</td><td class="text-end">$${row.totalAbonado.toLocaleString('es-CO')}</td><td class="text-end">$${row.totalPresupuesto.toLocaleString('es-CO')}</td><td class="text-end">${row.count}</td></tr>`;
  });
  html += '</tbody></table></div></div></div>';
  cont.innerHTML = html;
}

function exportarAExcel() {
  if (typeof XLSX === 'undefined') {
    alert('La librería de Excel (SheetJS) no está cargada.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const fecha = new Date();
  const fechaStr = fecha.toISOString().slice(0,10);

  // Hoja 1: Resumen general
  const totalAbonado = gastosRegistrados.reduce((acc, g) => acc + getGastoAbonado(g), 0);
  const totalPresupuesto = gastosRegistrados.reduce((acc, g) => acc + Number(g.presupuesto || 0), 0);
  const faltantePorPagar = Math.max(presupuestoTotal - totalAbonado, 0);
  const faltantePorReunir = Math.max(presupuestoTotal - totalVendidoFestival, 0);
  const faltantePorReunirSinColchon = Math.max(faltantePorReunir - metaColchon, 0);

  const resumenRows = [
    { Campo: 'Fecha', Valor: fechaStr },
    { Campo: 'Presupuesto Total', Valor: presupuestoTotal },
    { Campo: 'Total Gastado (Abonado)', Valor: totalAbonado },
    { Campo: 'Total Presupuesto (suma)', Valor: totalPresupuesto },
    { Campo: 'Total Vendido Festival', Valor: totalVendidoFestival },
    { Campo: 'Faltante por Pagar', Valor: faltantePorPagar },
    { Campo: 'Faltante por Reunir', Valor: faltantePorReunir },
    { Campo: 'Faltante por Reunir (sin Colchón)', Valor: faltantePorReunirSinColchon }
  ];
  const wsResumen = XLSX.utils.json_to_sheet(resumenRows, { header: ['Campo','Valor'] });
  if (wsResumen['!ref']) wsResumen['!autofilter'] = { ref: wsResumen['!ref'] };
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General');

  // Hoja: Por Origen
  const porOrigen = calcularTotalesPorOrigen().map(r => ({ Origen: r.origen, Abonado: r.totalAbonado, Presupuesto: r.totalPresupuesto, Cantidad: r.count }));
  const wsOrigen = XLSX.utils.json_to_sheet(porOrigen);
  // ordenar por Origen A-Z
  porOrigen.sort((a,b) => String(a.Origen).localeCompare(String(b.Origen), 'es', { sensitivity: 'base' }));
  const wsOrigenSorted = XLSX.utils.json_to_sheet(porOrigen);
  // activar filtro
  if (wsOrigenSorted['!ref']) wsOrigenSorted['!autofilter'] = { ref: wsOrigenSorted['!ref'] };
  XLSX.utils.book_append_sheet(wb, wsOrigenSorted, 'Por Origen');

  // Hojas por Responsable
  const responsablesValidos = [
    'Henrry', 'Lorena', 'Camilo', 'David', 'Jennifer', 'Estefania'
  ];
  const byResp = {};
  // Inicializar todas las hojas vacías
  responsablesValidos.forEach(r => { byResp[r] = []; });
  byResp['Sin Responsable'] = [];
  gastosRegistrados.forEach(g => {
    let resp = (g.responsable || '').trim() || 'Sin Responsable';
    // Separar solo por ' y '
    let nombres = resp.split(/\s+y\s+/i).map(n => n.trim()).filter(n => n);
    if (nombres.length === 0) nombres = ['Sin Responsable'];
    let asignado = false;
    nombres.forEach(nombre => {
      // Solo agregar si es exactamente igual a un responsable válido
      let nombreNormalizado = responsablesValidos.find(r => r.toLowerCase() === nombre.toLowerCase());
      if (!nombreNormalizado) return;
      const abon = getGastoAbonado(g);
      const pres = Number(g.presupuesto || 0);
      byResp[nombreNormalizado].push({
        Responsable: (g.responsable || '').trim() || nombreNormalizado,
        Actividad: g.actividad || '',
        Tarea: g.tarea || '',
        Presupuesto: pres,
        Abonado: abon,
        Saldo: pres - abon,
        OrigenDinero: g.origenDinero || '',
        Observaciones: g.observaciones || ''
      });
      asignado = true;
    });
    // Si no se asignó a ningún responsable válido, agregar a 'Sin Responsable'
    if (!asignado) {
      const abon = getGastoAbonado(g);
      const pres = Number(g.presupuesto || 0);
      byResp['Sin Responsable'].push({
        Responsable: (g.responsable || '').trim() || 'Sin Responsable',
        Actividad: g.actividad || '',
        Tarea: g.tarea || '',
        Presupuesto: pres,
        Abonado: abon,
        Saldo: pres - abon,
        OrigenDinero: g.origenDinero || '',
        Observaciones: g.observaciones || ''
      });
    }
  });

  Object.entries(byResp).forEach(([resp, rows]) => {
    // Limitar nombre de hoja a 31 chars
    // Ordenar los rows por Actividad A-Z antes de crear la hoja
    rows.sort((a,b) => String(a.Actividad || '').localeCompare(String(b.Actividad || ''), 'es', { sensitivity: 'base' }));
    let nombre = resp.substring(0, 28);
    if (Object.keys(wb.Sheets).includes(nombre)) {
      // evitar colisiones
      nombre = nombre.substring(0, 25) + '_' + Math.floor(Math.random()*1000);
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  });

  // Hoja adicional con otros reportes (por actividad resumen)
  const porActividadArr = Object.entries(gastosRegistrados.reduce((acc, g) => {
    const key = g.actividad || '(sin actividad)';
    if (!acc[key]) acc[key] = { Actividad: key, Presupuesto: 0, Abonado: 0, Saldo: 0, Cantidad: 0 };
    const abon = getGastoAbonado(g);
    const pres = Number(g.presupuesto || 0);
    acc[key].Presupuesto += pres;
    acc[key].Abonado += abon;
    acc[key].Saldo += (pres - abon);
    acc[key].Cantidad += 1;
    return acc;
  }, {})).map(([k,v]) => v);
  // Ordenar por Actividad A-Z y agregar filtro
  porActividadArr.sort((a,b) => String(a.Actividad || '').localeCompare(String(b.Actividad || ''), 'es', { sensitivity: 'base' }));
  const wsAct = XLSX.utils.json_to_sheet(porActividadArr);
  if (wsAct['!ref']) wsAct['!autofilter'] = { ref: wsAct['!ref'] };
  XLSX.utils.book_append_sheet(wb, wsAct, 'Resumen por Actividad');

  // Hoja con todos los gastos (ordenada por Actividad) y con filtros
  const todosRows = gastosRegistrados.map(g => ({
    Actividad: g.actividad || '',
    Tarea: g.tarea || '',
    Presupuesto: Number(g.presupuesto || 0),
    Abonado: getGastoAbonado(g),
    Saldo: (Number(g.presupuesto || 0) - getGastoAbonado(g)),
    OrigenDinero: g.origenDinero || '',
    Responsable: g.responsable || '',
    Observaciones: g.observaciones || '',
    Fecha: g.fechaRegistro || ''
  }));
  todosRows.sort((a,b) => String(a.Actividad || '').localeCompare(String(b.Actividad || ''), 'es', { sensitivity: 'base' }));
  const wsTodos = XLSX.utils.json_to_sheet(todosRows);
  if (wsTodos['!ref']) wsTodos['!autofilter'] = { ref: wsTodos['!ref'] };
  XLSX.utils.book_append_sheet(wb, wsTodos, 'Todos');

  const filename = `presupuestos_report_${fechaStr}.xlsx`;
  // Aplicar formatos y anchos en cada hoja donde aplique
  const applyStyles = (ws, options = {}) => {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    // Encabezados en negrita (primera fila)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const headerCell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      if (!ws[headerCell]) continue;
      ws[headerCell].s = ws[headerCell].s || {};
      ws[headerCell].s.font = Object.assign(ws[headerCell].s.font || {}, { bold: true });
    }

    // Mapear cabeceras a columnas
    const headers = {};
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const val = ws[cell] && ws[cell].v ? String(ws[cell].v) : '';
      headers[val] = C;
    }

    // Aplicar formato moneda a las columnas indicadas por nombre
    const currencyCols = options.currencyCols || ['Presupuesto', 'Abonado', 'Saldo', 'Abonado', 'Valor', 'Total Gastado', 'Presupuesto Total'];
    currencyCols.forEach(colName => {
      const C = headers[colName];
      if (C === undefined) return;
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell]) continue;
        // Asegurar tipo numérico
        if (typeof ws[cell].v === 'string' && !isNaN(Number(ws[cell].v.replace(/[^0-9.-]/g, '')))) {
          ws[cell].v = Number(ws[cell].v.replace(/[^0-9.-]/g, ''));
          ws[cell].t = 'n';
        }
        if (typeof ws[cell].v === 'number') {
          ws[cell].z = '#,##0';
        }
      }
    });

    // Anchos de columna básicos
    if (options.colWidths && Array.isArray(options.colWidths)) {
      ws['!cols'] = options.colWidths.map(w => ({ wch: w }));
    }

    // Activar autofiltro si existe
    if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
  };

  // Aplicar estilos hoja por hoja
  try {
    applyStyles(wsResumen, { currencyCols: ['Valor'], colWidths: [30, 20] });
    applyStyles(wsOrigenSorted, { currencyCols: ['Abonado', 'Presupuesto'], colWidths: [30, 20, 20, 10] });
    // Hojas por responsable ya creadas en wb.Sheets con nombres variables
    Object.keys(wb.Sheets).forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      // Para hojas que tienen la columna 'Actividad' aplicar formato moneda y ancho
      const hasActividad = ws['A1'] && String(ws['A1'].v || '').toLowerCase().includes('actividad');
      if (hasActividad) {
        applyStyles(ws, { currencyCols: ['Presupuesto', 'Abonado', 'Saldo'], colWidths: [20, 30, 15, 15, 12, 20, 20, 30] });
      } else {
        applyStyles(ws, { colWidths: [30, 20, 20, 10] });
      }
    });
  } catch (e) {
    console.warn('No se pudieron aplicar estilos detallados al Excel:', e);
  }

  // Hoja con todos los pagos individuales
  const pagosRows = [];
  gastosRegistrados.forEach(g => {
    if (Array.isArray(g.pagos) && g.pagos.length > 0) {
      g.pagos.forEach(p => {
        pagosRows.push({
          GastoId: g.id,
          Actividad: g.actividad || '',
          Tarea: g.tarea || '',
          Responsable: g.responsable || '',
          Monto: Number(p.monto || 0),
          OrigenDinero: p.origenDinero || '',
          Fecha: p.fecha || '',
          Observaciones: g.observaciones || ''
        });
      });
    } else if (getGastoAbonado(g) > 0) {
      // registro legacy: crear fila de pago único
      pagosRows.push({
        GastoId: g.id,
        Actividad: g.actividad || '',
        Tarea: g.tarea || '',
        Responsable: g.responsable || '',
        Monto: getGastoAbonado(g),
        OrigenDinero: g.origenDinero || '',
        Fecha: g.fechaRegistro || '',
        Observaciones: g.observaciones || ''
      });
    }
  });
  if (pagosRows.length > 0) {
    const wsPagos = XLSX.utils.json_to_sheet(pagosRows);
    if (wsPagos['!ref']) wsPagos['!autofilter'] = { ref: wsPagos['!ref'] };
    XLSX.utils.book_append_sheet(wb, wsPagos, 'Pagos');
  }

  XLSX.writeFile(wb, filename);
}

async function cargarPresupuestoTotal() {
  try {
    const resp = await fetch("/api/traer-costos");
    const data = await resp.json();
    const costos = data.costos || [];
    
    if (costos.length === 0) {
      // Intentar crear por defecto
      try {
        const statusResp = await fetch("/api/costos-status");
        const statusData = await statusResp.json();
        if (statusData.costos && statusData.costos.length > 0) {
          costos.push(statusData.costos[0]);
        } else if (statusData.status === "creado") {
          costos.push(statusData.costos);
        }
      } catch (e) {
        console.error("Error verificando costos:", e);
      }
    }

    if (costos.length > 0) {
      const metaCostos = costos[0]?.MetaCostosSubTotal || 0;
      metaColchon = costos[0]?.MetaColchonFetival || 0;
      presupuestoTotal = metaCostos + metaColchon;
    }
  } catch (error) {
    console.error("Error cargando presupuesto total:", error);
  }
}

async function cargarTotalVendido() {
  try {
    const resp = await fetch("/api/traer-todo");
    const data = await resp.json();
    const boletas = data.boletas || [];
    const emprendimientos = data.emprendimientos || [];
    const transporte = data.transporte || [];
    
    // Cargar separaciones
    let separaciones = [];
    try {
      const respSep = await fetch('/api/separaciones');
      const dataSep = await respSep.json();
      separaciones = dataSep.separaciones || [];
    } catch (e) {
      console.warn('No se pudieron cargar separaciones:', e);
    }

    // Calcular recaudado boletas (solo adultos)
    const boletasAdultos = boletas.filter(b => b.tipoAsistente !== "niño");
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

    // Recaudado emprendimientos
    const recaudadoEmprendimientos = emprendimientos.reduce((acc, emp) => acc + (emp.valorPromocion ? Number(emp.valorPromocion) : 0), 0);
    
    // Recaudado transporte
    const totalTransportes = transporte.length;
    const totalRecaudoTransportes = totalTransportes * 25000;
    
    // Recaudado separaciones (abonado)
    const totalAbonadoSeparaciones = separaciones.reduce((acc, s) => acc + (Number(s.valorAbonado) || 0), 0);
    
    totalVendidoFestival = recaudadoBoletas + recaudadoEmprendimientos + totalAbonadoSeparaciones;
  } catch (error) {
    console.error("Error cargando total vendido:", error);
  }
}

function cargarGastos() {
  // Intentar cargar desde Firestore vía API
  fetch('/api/presupuestos')
    .then(r => r.json())
    .then(data => {
      if (data && Array.isArray(data.presupuestos)) {
        // Normalizar ids numéricos si vienen como strings
        gastosRegistrados = data.presupuestos.map(p => ({
          ...p,
          id: p.id && !isNaN(Number(p.id)) ? Number(p.id) : p.id
        }));
        // Asegurar que abonado y saldo reflejen pagos si existen
        gastosRegistrados = gastosRegistrados.map(g => {
          const abon = getGastoAbonado(g);
          const pres = Number(g.presupuesto || 0);
          return Object.assign({}, g, { abonado: abon, saldo: pres - abon });
        });
        // Guardar copia local
        localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
      } else {
        // Fallback a localStorage
        const gastosGuardados = localStorage.getItem("gastosPresupuesto");
        if (gastosGuardados) gastosRegistrados = JSON.parse(gastosGuardados);
      }
      actualizarTabla();
      mostrarReportes();
      mostrarResumenPresupuesto();
    })
    .catch(err => {
      console.warn('No se pudo cargar presupuestos desde servidor, usando localStorage:', err);
      const gastosGuardados = localStorage.getItem("gastosPresupuesto");
      if (gastosGuardados) gastosRegistrados = JSON.parse(gastosGuardados);
      actualizarTabla();
      mostrarReportes();
      mostrarResumenPresupuesto();
    });
}

async function agregarGasto() {
  const form = document.getElementById("formPresupuesto");
  const editId = form.dataset.editId;
  
  let presRaw = document.getElementById("presupuesto").value.trim();
  let presupuesto;
  if (presRaw === '' || presRaw === '0') {
    presupuesto = 0;
  } else if (/^(n\/a|no aplica)$/i.test(presRaw)) {
    presupuesto = 'N/A';
  } else if (!isNaN(Number(presRaw))) {
    presupuesto = Number(presRaw);
  } else {
    presupuesto = presRaw;
  }

  const gasto = {
    id: editId ? Number(editId) : Date.now(),
    actividad: document.getElementById("actividad").value,
    tarea: document.getElementById("tarea").value.trim(),
    presupuesto: presupuesto,
    // abonado será la suma de los pagos (currentPagos)
    abonado: Array.isArray(currentPagos) && currentPagos.length > 0 ? currentPagos.reduce((s,p) => s + Number(p.monto||0), 0) : Number(document.getElementById("abonado").value || 0),
    responsable: (document.getElementById("responsable") ? document.getElementById("responsable").value.trim() : ''),
    observaciones: (document.getElementById("observaciones") ? document.getElementById("observaciones").value.trim() : ''),
    origenDinero: (document.getElementById("origenDinero") ? document.getElementById("origenDinero").value : ''),
    pagos: Array.isArray(currentPagos) ? JSON.parse(JSON.stringify(currentPagos)) : [],
    fechaRegistro: new Date().toISOString()
  };

  gasto.saldo = gasto.presupuesto - gasto.abonado;

  if (editId) {
    // Actualizar gasto existente
    try {
      const resp = await fetch(`/api/presupuestos/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gasto)
      });
      if (!resp.ok) throw new Error('Error actualizando en servidor');
      const index = gastosRegistrados.findIndex(g => String(g.id) === String(editId));
      if (index >= 0) gastosRegistrados[index] = gasto;
      localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
      alert("Gasto actualizado exitosamente");
    } catch (e) {
      console.error('Error actualizando gasto en servidor:', e);
      alert('Error actualizando gasto en servidor, se actualizó solo localmente');
    }
    delete form.dataset.editId;
    document.querySelector('button[type="submit"]').textContent = "Registrar Gasto";
  } else {
    // Agregar nuevo gasto
    try {
      // Enviar al servidor y usar el id que devuelva
      const resp = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gasto)
      });
      const data = await resp.json();
      if (resp.ok && data.id) {
        gasto.id = isNaN(Number(data.id)) ? data.id : Number(data.id);
      }
      gastosRegistrados.push(gasto);
      localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
      alert("Gasto registrado exitosamente");
    } catch (e) {
      console.error('Error guardando gasto en servidor:', e);
      // Fallback local
      gastosRegistrados.push(gasto);
      localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
      alert('No se pudo guardar en servidor. Gasto guardado localmente');
    }
  }

  localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
  form.reset();
  // reset pagos temporales
  currentPagos = [];
  renderPagosFormulario();
  actualizarTabla();
  mostrarReportes();
  mostrarResumenPresupuesto();
}

function actualizarTabla() {
  const cuerpo = document.getElementById("cuerpoTabla");
  if (gastosRegistrados.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Sin gastos registrados</td></tr>';
  } else {
    cuerpo.innerHTML = gastosRegistrados.map(gasto => {
      const gastoAbonado = getGastoAbonado(gasto);
      let presDisplay = (typeof gasto.presupuesto === 'number') ? `$${gasto.presupuesto.toLocaleString('es-CO')}` : (gasto.presupuesto || 'N/A');
      let saldoDisplay;
      if (typeof gasto.presupuesto === 'number') {
        saldoDisplay = `$${(gasto.presupuesto - gastoAbonado).toLocaleString('es-CO')}`;
      } else {
        saldoDisplay = 'N/A';
      }
      gasto.abonado = gastoAbonado;
      gasto.saldo = (typeof gasto.presupuesto === 'number') ? (gasto.presupuesto - gastoAbonado) : 'N/A';
      // Mostrar el origen del dinero del último pago si existen pagos, si no, usar el campo principal
      let origenDisplay = '-';
      if (Array.isArray(gasto.pagos) && gasto.pagos.length > 0) {
        origenDisplay = gasto.pagos[gasto.pagos.length - 1].origenDinero || '-';
      } else {
        origenDisplay = gasto.origenDinero || '-';
      }
      return `
      <tr class="${(typeof gasto.presupuesto === 'number' && gastoAbonado >= gasto.presupuesto) ? 'estado-pagado' : 'estado-activo'}">
        <td><strong>${gasto.actividad}</strong></td>
        <td>${gasto.tarea}</td>
        <td class="text-end">${presDisplay}</td>
        <td class="text-end">$${Number(gastoAbonado).toLocaleString('es-CO')}</td>
        <td class="text-end ${(typeof gasto.presupuesto === 'number' && (gasto.presupuesto - gastoAbonado) > 0) ? 'text-danger-custom' : 'text-success-custom'}">${saldoDisplay}</td>
        <td>${gasto.responsable || '-'}</td>
        <td><small>${origenDisplay}</small></td>
        <td><small>${gasto.observaciones || '-'}</small></td>
        <td class="text-center">
          <button class="btn btn-sm btn-warning" onclick="editarGasto(${gasto.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarGasto(${gasto.id})">Eliminar</button>
        </td>
      </tr>
      `;
    }).join('');
  }
  // Actualizar totales
  const totalPresupuesto = gastosRegistrados.reduce((acc, g) => acc + Number(g.presupuesto || 0), 0);
  const totalAbonado = gastosRegistrados.reduce((acc, g) => acc + getGastoAbonado(g), 0);
  const totalSaldo = gastosRegistrados.reduce((acc, g) => acc + (Number(g.presupuesto || 0) - getGastoAbonado(g)), 0);

  document.getElementById("totalPresupuesto").textContent = `$${totalPresupuesto.toLocaleString('es-CO')}`;
  document.getElementById("totalAbonado").textContent = `$${totalAbonado.toLocaleString('es-CO')}`;
  document.getElementById("totalSaldo").textContent = `$${totalSaldo.toLocaleString('es-CO')}`;

  // Inicializar DataTables solo si hay datos
  var $tabla = jQuery('#tablaGastos');
  if ($tabla.length && gastosRegistrados.length > 0) {
    // Destruir instancia previa si existe
    if ($tabla.hasClass('dataTable')) {
      $tabla.DataTable().destroy();
    }
    // Eliminar todas las filas de filtros previas en el thead (todas excepto la primera)
    var $thead = $tabla.find('thead');
    $thead.find('tr').not(':first').remove();
    // Crear fila de filtros
    var $filterRow = jQuery('<tr></tr>');
    $tabla.find('thead tr:first th').each(function(i) {
      if (jQuery(this).hasClass('acciones')) {
        $filterRow.append('<th></th>');
      } else {
        $filterRow.append('<th><input type="text" class="form-control form-control-sm" placeholder="Filtrar" /></th>');
      }
    });
    $tabla.find('thead').append($filterRow);
    $filterRow.find('input').each(function(i) {
      jQuery(this).on('keyup change', function() {
        if ($tabla.DataTable().column(i).search() !== this.value) {
          $tabla.DataTable().column(i).search(this.value).draw();
        }
      });
    });
    $tabla.DataTable({
      orderCellsTop: true,
      fixedHeader: true,
      paging: false,
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      }
    });
  }
}

function editarGasto(id) {
  const gasto = gastosRegistrados.find(g => g.id === id);
  if (!gasto) return;

  const actividadEl = document.getElementById("actividad");
  if (actividadEl) actividadEl.value = gasto.actividad || '';

  const tareaEl = document.getElementById("tarea");
  if (tareaEl) tareaEl.value = gasto.tarea || '';

  const presEl = document.getElementById("presupuesto");
  const abonEl = document.getElementById("abonado");

  // calcular abonado
  const abonado = getGastoAbonado(gasto);

  // si abonado > presupuesto, actualizar presupuesto
  let presupuesto = gasto.presupuesto || 0;
  if (abonado > presupuesto) {
    presupuesto = abonado;
    gasto.presupuesto = abonado; // opcional: también actualizas el objeto en memoria
  }

  if (presEl) presEl.value = presupuesto;
  if (abonEl) abonEl.value = abonado;

  const respEl = document.getElementById("responsable");
  if (respEl) respEl.value = gasto.responsable || '';

  const obsEl = document.getElementById("observaciones");
  if (obsEl) obsEl.value = gasto.observaciones || '';

  const origenEl = document.getElementById("origenDinero");
  if (origenEl) origenEl.value = gasto.origenDinero || '';

  // cargar pagos al formulario
  currentPagos = Array.isArray(gasto.pagos) ? JSON.parse(JSON.stringify(gasto.pagos)) : [];

  // render pagos list
  if (typeof renderPagosFormulario === 'function') renderPagosFormulario();

  // Marcar para edición
  document.getElementById("formPresupuesto").dataset.editId = id;
  document.querySelector('button[type="submit"]').textContent = "Actualizar Gasto";

  // 🔝 Ir hasta arriba de la página automáticamente
  window.scrollTo({ top: 0, behavior: 'smooth' });
}



function eliminarGasto(id) {
  if (confirm("¿Está seguro de que desea eliminar este gasto?")) {
    // Intentar eliminar en servidor
    fetch(`/api/presupuestos/${id}`, { method: 'DELETE' })
      .then(resp => {
        if (!resp.ok) throw new Error('Error eliminando en servidor');
        // Quitar localmente
        gastosRegistrados = gastosRegistrados.filter(g => String(g.id) !== String(id));
        localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
        actualizarTabla();
        mostrarReportes();
        mostrarResumenPresupuesto();
      })
      .catch(err => {
        console.warn('No se pudo eliminar en servidor, eliminando localmente:', err);
        gastosRegistrados = gastosRegistrados.filter(g => String(g.id) !== String(id));
        localStorage.setItem("gastosPresupuesto", JSON.stringify(gastosRegistrados));
        actualizarTabla();
        mostrarReportes();
        mostrarResumenPresupuesto();
      });
  }
}

function mostrarResumenPresupuesto() {
  const resumen = document.getElementById("resumenPresupuesto");
    // Calcular presupuesto total como suma de todos los registros
    const presupuestoTotalSum = gastosRegistrados.reduce((acc, g) => {
      if (typeof g.presupuesto === 'number') return acc + g.presupuesto;
      return acc;
    }, 0);
    const totalAbonado = gastosRegistrados.reduce((acc, g) => acc + getGastoAbonado(g), 0);
    const faltantePorPagar = Math.max(presupuestoTotalSum - totalAbonado, 0);
    const faltantePorReunir = Math.max(presupuestoTotalSum - totalVendidoFestival, 0);
    const faltantePorReunirSinColchon = Math.max(faltantePorReunir - metaColchon, 0);
    const porcentajeGastado = presupuestoTotalSum > 0 ? ((totalAbonado / presupuestoTotalSum) * 100).toFixed(2) : 0;

    // Calcular valores individuales
    let colchon = metaColchon;
    let costoFestival = presupuestoTotalSum - colchon;
    resumen.innerHTML = `
      <div class="col-md-3">
        <div class="card card-presupuesto shadow">
          <div class="card-body text-center">
            <h6 class="card-title">Presupuesto Total</h6>
            <div class="display-6">$${presupuestoTotalSum.toLocaleString('es-CO')}</div>
            <small class="text-muted">Costo Festival ($${costoFestival.toLocaleString('es-CO')}) y colchón ($${colchon.toLocaleString('es-CO')})</small>
          </div>
        </div>
      </div>
    <div class="col-md-3">
      <div class="card card-presupuesto shadow">
        <div class="card-body text-center">
          <h6 class="card-title">Total Gastado</h6>
          <div class="display-6">$${totalAbonado.toLocaleString('es-CO')}</div>
          <small class="text-muted">${porcentajeGastado}% del presupuesto</small>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card card-presupuesto shadow">
        <div class="card-body text-center">
          <h6 class="card-title">Total Vendido Festival</h6>
          <div class="display-6 text-success">$${totalVendidoFestival.toLocaleString('es-CO')}</div>
          <small class="text-muted">Boletas + Emprendimientos + Transporte + Separaciones</small>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card card-presupuesto shadow">
        <div class="card-body text-center">
          <h6 class="card-title">Faltante por Pagar</h6>
          <div class="display-6 ${faltantePorPagar > 0 ? 'text-danger' : 'text-success'}">
            $${faltantePorPagar.toLocaleString('es-CO')}
          </div>
          <small class="text-muted">Presupuesto - Gastado</small>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card card-presupuesto shadow">
        <div class="card-body text-center">
          <h6 class="card-title">Faltante por Reunir</h6>
          <div class="display-6 ${faltantePorReunir > 0 ? 'text-warning' : 'text-success'}">
            $${faltantePorReunir.toLocaleString('es-CO')}
          </div>
          <small class="text-muted">Presupuesto Total - Vendido en Festival</small>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card card-presupuesto shadow">
        <div class="card-body text-center">
          <h6 class="card-title">Faltante por Reunir (sin Colchón)</h6>
          <div class="display-6 ${faltantePorReunirSinColchon > 0 ? 'text-warning' : 'text-success'}">
            $${faltantePorReunirSinColchon.toLocaleString('es-CO')}
          </div>
          <small class="text-muted">Faltante - Meta Colchón</small>
        </div>
      </div>
    </div>
  `;
}

function mostrarReportes() {
  const reportes = document.getElementById("reportesPresupuesto");
  
  // Agrupar por actividad
  const porActividad = {};
  gastosRegistrados.forEach(g => {
    if (!porActividad[g.actividad]) {
      porActividad[g.actividad] = { presupuesto: 0, abonado: 0, saldo: 0, cantidad: 0 };
    }
    const gAbonado = getGastoAbonado(g);
    const gSaldo = Number(g.presupuesto || 0) - gAbonado;
    porActividad[g.actividad].presupuesto += Number(g.presupuesto || 0);
    porActividad[g.actividad].abonado += gAbonado;
    porActividad[g.actividad].saldo += gSaldo;
    porActividad[g.actividad].cantidad += 1;
  });

  let htmlReportes = '<h4 class="mt-4 mb-3">Reportes por Actividad</h4><div class="row">';
  
  Object.entries(porActividad).forEach(([actividad, datos]) => {
    const porcentaje = datos.presupuesto > 0 ? ((datos.abonado / datos.presupuesto) * 100).toFixed(1) : 0;
    htmlReportes += `
      <div class="col-md-6 mb-3">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title">${actividad}</h6>
            <p class="mb-1"><strong>Presupuesto:</strong> $${datos.presupuesto.toLocaleString('es-CO')}</p>
            <p class="mb-1"><strong>Abonado:</strong> $${datos.abonado.toLocaleString('es-CO')} (${porcentaje}%)</p>
            <p class="mb-0"><strong>Saldo:</strong> <span class="${datos.saldo > 0 ? 'text-danger-custom' : 'text-success-custom'}">$${datos.saldo.toLocaleString('es-CO')}</span></p>
            <small class="text-muted">${datos.cantidad} gasto(s)</small>
          </div>
        </div>
      </div>
    `;
  });

  htmlReportes += '</div>';
  reportes.innerHTML = htmlReportes;
}

