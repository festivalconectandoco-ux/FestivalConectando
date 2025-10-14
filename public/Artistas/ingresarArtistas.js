// Funciones para el overlay
function mostrarOverlay(mensaje = 'Procesando...') {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  
  const contenido = document.createElement('div');
  contenido.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  `;
  
  const spinner = document.createElement('div');
  spinner.className = 'spinner-border text-primary';
  spinner.setAttribute('role', 'status');
  
  const texto = document.createElement('div');
  texto.style.marginTop = '10px';
  texto.textContent = mensaje;
  
  contenido.appendChild(spinner);
  contenido.appendChild(texto);
  overlay.appendChild(contenido);
  document.body.appendChild(overlay);
}

function ocultarOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.remove();
}

}document.addEventListener("DOMContentLoaded", async function () {
  // Cargar artistas y tipos de documento desde catalogos.json

  let catalogosGlobales = null;
  try {
    const resp = await fetch("../data/catalogos.json");
    catalogosGlobales = await resp.json();
  } catch (e) {
    catalogosGlobales = {};
  }
  if (catalogosGlobales && catalogosGlobales.Artistas) {
    // Artistas o agrupaciones
    const artistas = Array.isArray(catalogosGlobales.Artistas) ? catalogosGlobales.Artistas : [];
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
    const tipos = Array.isArray(catalogosGlobales.tiposDeDocumento) ? catalogosGlobales.tiposDeDocumento : [];
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
  }

  // Registrar artista
  const form = document.getElementById('formArtistas');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      mostrarOverlay('Registrando artista...');
      const artistaSelect = form.querySelector('#artista');
      const artista = artistaSelect ? artistaSelect.options[artistaSelect.selectedIndex].text : '';
      const nombrePersona = form.nombrePersona.value.trim().replace(/\s+/g, '_');
      const tipoDocSelect = form.querySelector('#tipoDocumento');
      const tipoDocumento = tipoDocSelect ? tipoDocSelect.options[tipoDocSelect.selectedIndex].text : '';
      const numeroDocumento = form.numeroDocumento.value.trim().replace(/\s+/g, '_');
      const celular = form.celular.value.trim();
      const observaciones = form.observaciones.value.trim();
      if (!artista || !nombrePersona || !tipoDocumento || !numeroDocumento || !celular) {
        alert('Por favor complete todos los campos obligatorios.');
        return;
      }
      try {
        const referencia = await obtenerReferenciaGlobal();
        imagenBase64 = await generarImagenBoletaArtistas({ nombreAgrupacion: artista, nombrePersona, documento: numeroDocumento, referencia });
        let artistaAsistente = { 
          artista,
          nombrePersona,
          tipoDocumento,
          numeroDocumento,
          celular,
          observaciones,
          referencia, 
          boleta: imagenBase64, 
          envioWhatsapp: 0,
          fechaRegistro: new Date().toISOString()
        };

        const resp = await fetch('/registrar-boleta/artista', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(artistaAsistente)
        });
        const data = await resp.json();
        if (resp.ok) {

        // Envío de WhatsApp y registro de historial solo para este artista

        let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].artistas;
        let caption = mensajeBase.replace('{nombreAgrupacion}', artistaAsistente.artista).replace('{nombreIntegrante}', artistaAsistente.nombrePersona);

        const reqGreen = {
          urlFile: artistaAsistente.boleta,
          fileName: `boleta_${artistaAsistente.nombrePersona.replace(/\s+/g, '_')}.png`,
          caption: caption,
          numero: (() => {
            let num = artistaAsistente.celular.trim();
            if (/^(\+|57|58|51|52|53|54|55|56|591|593|595|598|1|44|34)/.test(num)) {
              return num.replace(/[^\d+]/g, '');
            } else {
              return '+57' + num.replace(/[^\d]/g, '');
            }
          })()
        };

        let respuestaServicio = "";
        let envioOk = false;
        try {
          const respGreen = await fetch("/enviar-whatsapp/envio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqGreen)
          });
          try {
            respuestaServicio = await respGreen.text();
          } catch (e) {
            respuestaServicio = "Error leyendo respuesta";
          }
          envioOk = respGreen.ok;
        } catch (error) {
          respuestaServicio = error?.message || "Error en envío";
          envioOk = false;
        }
        artistaAsistente.envioWhatsapp = envioOk ? 1 : 0;
        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: respuestaServicio
        };
        await fetch("/actualizar-boleta/artista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referencia: artistaAsistente.referencia, envioWhatsapp: artistaAsistente.envioWhatsapp, historialEnvio })
        });

        ocultarOverlay();
        alert("Artista registrado exitosamente.");
        this.reset();
      } else {
          ocultarOverlay();
          alert('Error al guardar el artista: ' + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        ocultarOverlay();
        alert('Error al guardar el artista: ' + err.message);
      }
    });
  }
});

async function obtenerReferenciaGlobal() {
  const resp = await fetch("/api/referencia-global?tipo=artistas");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}

// Generar imagen boleta para artistas
async function generarImagenBoletaArtistas({ nombreAgrupacion, nombrePersona, documento, referencia }) {
  return new Promise((resolve, reject) => {

    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "../data/plantilla_boletas.png";
    let nombreAgrupacionLimpio = nombreAgrupacion.replace(/_/g, ' ');
    let nombreAsistenteLimpio = nombrePersona.replace(/_/g, ' ');
    img.onload = () => {
      canvas.width = img.width;   // 2000
      canvas.height = img.height; // 647

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0); // sin redimensionar

      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#000000ff";
      ctx.fillText(`Nombre completo:`, 1560, 275);
      ctx.fillText(`${nombreAsistenteLimpio}`, 1560, 295);
      ctx.fillText(`Número de documento:`, 1560, 315);
      ctx.fillText(`${documento}`, 1560, 335);

      ctx.font = "bold 25px Arial";
      ctx.fillText(`Agrupación:`, 1560, 450);
      ctx.fillText(`${nombreAgrupacionLimpio}`, 1560, 490);
      
      ctx.font = "bold 35px Arial";
      ctx.fillText(`# ${referencia}`, 1850, 180);
      ctx.fillText(`Artista`, 1535, 180);

      const imagenBase64 = canvas.toDataURL("image/png");
      const reqFb = { imagenBase64: imagenBase64, referencia: `${referencia}_${nombrePersona}` };
      fetch("/subir-imagen-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqFb),
      })
        .then(res => res.json())
        .then(data => {
          resolve(data.url);
        })
        .catch(err => console.error("Error enviando boleta:", err));
    };
    img.onerror = () => reject("Error al cargar la plantilla");
  });
}