document.addEventListener("DOMContentLoaded", function () {
  // Cargar artistas y tipos de documento desde catalogos.json
  fetch('../data/catalogos.json')
    .then(resp => resp.json())
    .then(data => {
      // Artistas o agrupaciones
      const artistas = Array.isArray(data.Artistas) ? data.Artistas : [];
      const selectArtista = document.getElementById('artista');
      if (selectArtista) {
        selectArtista.innerHTML = '';
        artistas.forEach(a => {
          const option = document.createElement("option");
          option.value = a;
          option.textContent = a;
          selectArtista.appendChild(option);
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

  // Registrar artista
  const form = document.getElementById('formArtistas');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const artistaSelect = form.querySelector('#artista');
      const artista = artistaSelect ? artistaSelect.options[artistaSelect.selectedIndex].text : '';
      const nombrePersona = form.nombrePersona.value.trim();
      const tipoDocSelect = form.querySelector('#tipoDocumento');
      const tipoDocumento = tipoDocSelect ? tipoDocSelect.options[tipoDocSelect.selectedIndex].text : '';
      const numeroDocumento = form.numeroDocumento.value.trim();
      const celular = form.celular.value.trim();
      const observaciones = form.observaciones.value.trim();
      if (!artista || !nombrePersona || !tipoDocumento || !numeroDocumento || !celular) {
        alert('Por favor complete todos los campos obligatorios.');
        return;
      }
      try {
        const resp = await fetch('/registrar-artista', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            artista,
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
