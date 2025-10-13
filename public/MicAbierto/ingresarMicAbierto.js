document.addEventListener("DOMContentLoaded", function () {
  // Cargar agrupaciones y tipos de documento desde catalogos.json
  fetch('../data/catalogos.json')
    .then(resp => resp.json())
    .then(data => {
      // Agrupaciones microfonoAbierto
      const agrupaciones = Array.isArray(data.microfonoAbierto) ? data.microfonoAbierto : [];
      const selectAgrupacion = document.getElementById('agrupacion');
      if (selectAgrupacion) {
        selectAgrupacion.innerHTML = '';
        agrupaciones.forEach(a => {
          const option = document.createElement("option");
          option.value = a.id || a.nombre || a;
          option.textContent = a.nombre || a;
          selectAgrupacion.appendChild(option);
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
    });

  // Registrar artista de micrófono abierto
  const form = document.getElementById('formMicAbierto');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const agrupacionSelect = form.querySelector('#agrupacion');
      const agrupacion = agrupacionSelect ? agrupacionSelect.options[agrupacionSelect.selectedIndex].text : '';
      const nombrePersona = form.nombrePersona.value.trim();
      const tipoDocSelect = form.querySelector('#tipoDocumento');
      const tipoDocumento = tipoDocSelect ? tipoDocSelect.options[tipoDocSelect.selectedIndex].text : '';
      const numeroDocumento = form.numeroDocumento.value.trim();
      const celular = form.celular.value.trim();
      const observaciones = form.observaciones.value.trim();
      if (!agrupacion || !nombrePersona || !tipoDocumento || !numeroDocumento || !celular) {
        alert('Por favor complete todos los campos obligatorios.');
        return;
      }
      try {
        const resp = await fetch('/registrar-microfono-abierto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agrupacion,
            nombrePersona,
            tipoDocumento,
            numeroDocumento,
            celular,
            observaciones,
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
          alert('Error al guardar el artista: ' + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        alert('Error al guardar el artista: ' + err.message);
      }
    });
  }
});
