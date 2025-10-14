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
}

document.addEventListener("DOMContentLoaded", async function () {
  // Cargar agrupaciones y tipos de documento desde catalogos.json

  let catalogosGlobales = null;
  try {
    const resp = await fetch("../data/catalogos.json");
    catalogosGlobales = await resp.json();
  } catch (e) {
    catalogosGlobales = {};
  }

    // Cargar promociones de micrófono abierto
  if (catalogosGlobales && catalogosGlobales.microfonoAbierto) {
    // Agrupaciones microfonoAbierto
    const agrupaciones = Array.isArray(catalogosGlobales.microfonoAbierto) ? catalogosGlobales.microfonoAbierto : [];
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

  // Registrar artista de micrófono abierto
  const form = document.getElementById('formMicAbierto');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      mostrarOverlay('Registrando artista de micrófono abierto...');
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
        const referencia = await obtenerReferenciaGlobal();
        imagenBase64 = await generarImagenBoletaMicAbierto({ nombreAgrupacion: agrupacion, nombrePersona, documento: numeroDocumento, referencia });
        let micAbiertoAsistente = { 
          agrupacion,
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

        const resp = await fetch('/registrar-boleta/micAbierto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(micAbiertoAsistente)
        });
        const data = await resp.json();
        if (resp.ok) {

        // Envío de WhatsApp y registro de historial solo para este artista

        let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].micAbierto;
        let caption = mensajeBase.replace('{nombreAgrupacion}', micAbiertoAsistente.agrupacion).replace('{nombreIntegrante}', micAbiertoAsistente.nombrePersona);

        const reqGreen = {
          urlFile: micAbiertoAsistente.boleta,
          fileName: `boleta_${micAbiertoAsistente.nombrePersona.replace(/\s+/g, '_')}.png`,
          caption: caption,
          numero: (() => {
            let num = micAbiertoAsistente.celular.trim();
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
        micAbiertoAsistente.envioWhatsapp = envioOk ? 1 : 0;
        const historialEnvio = {
          fecha: new Date().toISOString(),
          mensaje: caption,
          respuesta: respuestaServicio
        };
        await fetch("/actualizar-boleta/micAbierto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referencia: micAbiertoAsistente.referencia, envioWhatsapp: micAbiertoAsistente.envioWhatsapp, historialEnvio })
        });

        ocultarOverlay();
        alert("Micrófono Abierto registrado exitosamente.");
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
  const resp = await fetch("/api/referencia-global?tipo=micAbierto");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}

// Generar imagen boleta para micrófono abierto
async function generarImagenBoletaMicAbierto({ nombreAgrupacion, nombrePersona, documento, referencia }) {
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
      ctx.fillText(`Micrófono abierto`, 1535, 180);

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