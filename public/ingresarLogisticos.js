document.addEventListener("DOMContentLoaded", function () {
  // Cargar áreas de apoyo y tipos de documento desde catalogos.json
  fetch('data/catalogos.json')
    .then(resp => resp.json())
    .then(data => {
      // Áreas de apoyo
      const areas = Array.isArray(data.areasApoyoLogisticos) ? data.areasApoyoLogisticos : [];
      const container = document.getElementById('areasApoyoContainer');
      if (container) {
        container.innerHTML = '';
        areas.forEach(area => {
          const div = document.createElement('div');
          div.className = 'form-check form-check-inline';
          div.innerHTML = `<input class="form-check-input" type="checkbox" name="areasApoyo" value="${area}" id="area_${area}">
            <label class="form-check-label" for="area_${area}">${area.charAt(0).toUpperCase() + area.slice(1)}</label>`;
          container.appendChild(div);
        });
      }
      // Tipos de documento
      const tipos = Array.isArray(data.tiposDeDocumento) ? data.tiposDeDocumento : [];
      const selectTipo = document.getElementById('tipoDocumento');
      if (selectTipo) {
        selectTipo.innerHTML = '';
        tipos.forEach(t => {
          const option = document.createElement("option");
          option.value = t.id || t.nombre;
          option.textContent = t.nombre;
          selectTipo.appendChild(option);
        });
      }
        // Promociones logísticas
        const promociones = Array.isArray(data.PromocionLogistica) ? data.PromocionLogistica : [];
        const selectPromo = document.getElementById('promocionLogistica');
        if (selectPromo) {
          selectPromo.innerHTML = '';
          promociones.forEach(p => {
            const option = document.createElement("option");
            option.value = p.idPromocion || p.descripcion;
            option.textContent = p.descripcion;
            selectPromo.appendChild(option);
          });
        }
    });

  // Registrar logístico usando el endpoint /registrar-logistico
  const form = document.getElementById('formLogisticos');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
  const tipoDocSelect = form.querySelector('#tipoDocumento');
  const tipoDocumento = tipoDocSelect.options[tipoDocSelect.selectedIndex].text;
      const numeroDocumento = form.numeroDocumento.value.trim();
  const celular = form.celular.value.trim();
  const tareas = form.tareasLogistico ? form.tareasLogistico.value.trim() : '';
        const promoSelect = form.querySelector('#promocionLogistica');
        const promocion = promoSelect ? promoSelect.options[promoSelect.selectedIndex].text : '';
      let areas = Array.from(form.querySelectorAll('input[name="areasApoyo"]:checked')).map(cb => cb.value);
      // Si se seleccionó 'otro', agregar el valor escrito
      if (areas.includes('otro')) {
        const areaOtro = form.querySelector('#areaApoyoOtro').value.trim();
        if (areaOtro) {
          areas = areas.filter(a => a !== 'otro');
          areas.push(areaOtro);
        } else {
          alert('Por favor escriba el área de apoyo personalizada.');
          return;
        }
      }
      if (!nombre || !tipoDocumento || !numeroDocumento || !celular || !promocion || areas.length === 0 || !tareas) {
        alert('Por favor complete todos los campos, seleccione al menos un área de apoyo y promoción, y escriba las tareas.');
        return;
      }
      try {
        const resp = await fetch('/registrar-logistico', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre,
            tipoDocumento,
            numeroDocumento,
            celular,
            promocion,
            tareas,
            areasApoyo: areas,
            fechaRegistro: new Date().toISOString()
          })
        });
        const data = await resp.json();
        if (resp.ok) {
          document.getElementById('mensajeExito').classList.remove('d-none');
          setTimeout(() => {
            document.getElementById('mensajeExito').classList.add('d-none');
            form.reset();
          }, 2000);
        } else {
          alert('Error al guardar el logístico: ' + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        alert('Error al guardar el logístico: ' + err.message);
      }
    });
  }
});
