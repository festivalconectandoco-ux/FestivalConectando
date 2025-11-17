document.addEventListener('DOMContentLoaded', async () => {
  const promoSelect = document.getElementById('promocion');
  const valorBoleta = document.getElementById('valorBoleta');
  const msg = document.getElementById('msg');

  let catalogos = null;
  try {
    const resp = await fetch('../data/catalogos.json');
    catalogos = await resp.json();
  } catch (e) {
    console.error('No se pudo cargar catalogos.json', e);
  }
  if (catalogos && Array.isArray(catalogos.promocion)) {
    catalogos.promocion.forEach(p => {
      if (!p.activo) return;
      const opt = document.createElement('option'); opt.value = JSON.stringify(p); opt.textContent = `${p.descripcion} - $${Number(p.precio).toLocaleString('es-CO')}`; promoSelect.appendChild(opt);
    });
    if (promoSelect.options.length) {
      const p = JSON.parse(promoSelect.options[0].value); valorBoleta.value = p.precio;
    }
  }
  promoSelect.addEventListener('change', () => {
    if (!promoSelect.value) return; const p = JSON.parse(promoSelect.value); valorBoleta.value = p.precio;
  });

  // poblar medios de pago y responsables
  if (catalogos) {
    const medioPagoSelect = document.getElementById('medioPago');
    const quienRecibioSelect = document.getElementById('quienRecibio');
    if (Array.isArray(catalogos.mediosDePago)) {
      catalogos.mediosDePago.forEach(m => {
        const opt = document.createElement('option'); opt.value = m.nombre; opt.textContent = m.nombre; medioPagoSelect.appendChild(opt);
      });
    }
    if (Array.isArray(catalogos.responsables)) {
      const opt0 = document.createElement('option'); opt0.value = ''; opt0.textContent = 'Seleccionar...'; quienRecibioSelect.appendChild(opt0);
      catalogos.responsables.forEach(r => {
        const opt = document.createElement('option'); opt.value = r.nombre; opt.textContent = r.nombre; quienRecibioSelect.appendChild(opt);
      });
    }
  }

  document.getElementById('formSeparacion').addEventListener('submit', async (e) => {
    e.preventDefault(); msg.innerHTML = '';
    const referenciaInput = document.getElementById('referencia').value.trim();
    let referencia = referenciaInput;
    if (!referencia) {
      // pedir referencia al servidor
      try {
        const r = await fetch('/api/referencia-global?tipo=asistentes'); const d = await r.json(); referencia = d.referencia;
      } catch (err) { console.error('No se pudo obtener referencia', err); referencia = Date.now().toString(); }
    }
    const promocionObj = promoSelect.options[promoSelect.selectedIndex] ? JSON.parse(promoSelect.options[promoSelect.selectedIndex].value) : null;
    const medioPago = document.getElementById('medioPago').value || '';
    const quienRecibio = document.getElementById('quienRecibio').value || '';
    const comprobanteFile = document.getElementById('comprobante').files[0];

    const payload = {
      referencia,
      nombreComprador: document.getElementById('nombreComprador').value.trim().replace(/\s+/g, '_'),
      nombreAsistente: document.getElementById('nombreAsistente').value.trim().replace(/\s+/g, '_'),
      numeroDocumento: document.getElementById('numeroDocumento').value.trim().replace(/\s+/g, '_'),
      promocionId: promocionObj ? promocionObj.idPromocion : '',
      promocionDescripcion: promocionObj ? promocionObj.descripcion : '',
      valorBoleta: Number(document.getElementById('valorBoleta').value) || 0,
      valorAbonado: Number(document.getElementById('valorAbonado').value) || 0,
      celular: document.getElementById('celular').value.trim(),
      medioPago: medioPago,
      recibidoPor: quienRecibio
    };

    // Si hay comprobante, subirlo primero a /subir-comprobante
    if (comprobanteFile) {
      try {
        const toBase64 = await (new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(comprobanteFile);
        }));
        const subirResp = await fetch('/subir-comprobante', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ imagenBase64: toBase64, referencia })
        });
        const subirData = await subirResp.json();
        if (subirResp.ok && subirData.url) {
          payload.comprobante = subirData.url;
        } else {
          console.warn('No se subió comprobante:', subirData);
        }
      } catch (err) {
        console.error('Error subiendo comprobante:', err);
      }
    }
    try {
      const resp = await fetch('/registrar-separacion', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await resp.json();
      if (resp.ok) {
        msg.innerHTML = `<div class="alert alert-success">Separación registrada. Referencia: ${data.referencia} - Saldo: $${Number(data.saldo).toLocaleString('es-CO')}</div>`;
        document.getElementById('formSeparacion').reset();
      } else {
        msg.innerHTML = `<div class="alert alert-danger">Error: ${data.error || 'error'}</div>`;
      }
    } catch (err) {
      console.error(err); msg.innerHTML = '<div class="alert alert-danger">Error registrando separación</div>';
    }
  });
});