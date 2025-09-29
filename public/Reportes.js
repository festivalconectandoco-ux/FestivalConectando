document.addEventListener("DOMContentLoaded", async function () {
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
    // Personas por emprendimientos (1 por emprendimiento)
    const totalPersonasEmprendimientos = totalEmprendimientos;
    // Total personas
    // Para aforo, no contar niños
    const totalPersonasAforo = boletasAdultos.length + totalPersonasEmprendimientos;
    totalPersonas = totalPersonasBoletas + totalPersonasEmprendimientos;
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
              <small class="text-muted">Aforo máximo: ${aforoMaximo} (no se cuentan niños)</small>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Cantidad total personas</h5>
              <div class="display-6">${totalPersonas}</div>
              <small class="text-muted">Incluye asistentes adultos, niños y emprendimientos</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo 2: Total recaudado, boletas, emprendimientos, niños -->
      <div class="row mb-3">
        <div class="col-md-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total recaudado</h5>
              <div class="display-6">$${totalRecaudado.toLocaleString('es-CO')}</div>
              <small class="text-muted">Boletas (adultos) + emprendimientos</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total boletas vendidas</h5>
              <div class="display-6">${totalBoletasVendidas}</div>
              <small class="text-muted">Solo adultos (niños no pagan)</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-report shadow">
            <div class="card-body text-center">
              <h5 class="card-title">Total emprendimientos</h5>
              <div class="display-6">${totalEmprendimientos}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
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
                  const ultimaBoleta = boletasAdultos.length > 0 ? (() => {
                    const b = boletasAdultos[boletasAdultos.length - 1];
                    if (b.Promocion) {
                      const match = b.Promocion.match(/\$([\d.,]+)/);
                      if (match) return parseInt(match[1].replace(/[.,]/g, ""));
                    }
                    return b.valorBoleta ? Number(b.valorBoleta) : 0;
                  })() : 0;
                  return ultimaBoleta > 0 ? Math.ceil(faltante / ultimaBoleta) : '-';
                })()}
                <small class="text-muted">(Valor última boleta: $${boletasAdultos.length > 0 ? (() => {
                  const b = boletasAdultos[boletasAdultos.length - 1];
                  if (b.Promocion) {
                    const match = b.Promocion.match(/\$([\d.,]+)/);
                    if (match) return parseInt(match[1].replace(/[.,]/g, "")).toLocaleString('es-CO');
                  }
                  return b.valorBoleta ? Number(b.valorBoleta).toLocaleString('es-CO') : '0';
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
