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
        selectTipo.innerHTML = '<option value="">Seleccione...</option>';
        tipos.forEach(t => {
          const option = document.createElement("option");
          option.value = t.id || t.nombre;
          option.textContent = t.nombre;
          selectTipo.appendChild(option);
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
      const areas = Array.from(form.querySelectorAll('input[name="areasApoyo"]:checked')).map(cb => cb.value);
      if (!nombre || !tipoDocumento || !numeroDocumento || !celular || areas.length === 0) {
        alert('Por favor complete todos los campos y seleccione al menos un área de apoyo.');
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
