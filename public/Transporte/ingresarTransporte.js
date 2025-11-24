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
  let asistentes = [];
  let catalogosGlobales = null;
  try {
    const resp = await fetch("../data/catalogos.json");
    catalogosGlobales = await resp.json();
  } catch (e) {
    catalogosGlobales = {};
  }

    const rutas = Array.isArray(catalogosGlobales.Rutas) ? catalogosGlobales.Rutas : [];
    const selectRutas = document.getElementById('ruta');
    if (selectRutas) {
      selectRutas.innerHTML = '';
      rutas.forEach(a => {
        const option = document.createElement("option");
          option.value = a.id || a.nombre || a;
          option.textContent = a.nombre || a;
          selectRutas.appendChild(option);
        });
    }
    
    const response = await fetch('/api/traer-todo');
    const data = await response.json();
    const boletas = data.boletas || [];
    const emprendimientos = data.emprendimientos || [];
    const logisticos = data.logisticos || [];
    const micAbierto = data.micAbierto || [];
    const artistas = data.artistas || [];

    // Normalizar y combinar en 'asistentes' para poblar el select
    asistentes = [];
    boletas.forEach(b => {
      asistentes.push({
        origen: 'Asistente',
        nombreAsistente: b.nombreAsistente || b.nombre || b.nombrePersona || '',
        tipoDocumentoAsistente: b.tipoDocumentoAsistente || b.tipoDocumento || '',
        documentoAsistente: b.documentoAsistente || b.numeroDocumento || '',
        celular: b.celular || ''
      });
    });
    emprendimientos.forEach(e => {
      asistentes.push({
        origen: 'Emprendimiento',
        nombreAsistente: e.nombrePersona || e.nombreEmprendimiento || '',
        tipoDocumentoAsistente: e.tipoDocumento || '',
        documentoAsistente: e.numeroDocumento || '',
        celular: e.celularPersona || e.celular || ''
      });
    });
    logisticos.forEach(l => {
      asistentes.push({
        origen: 'Logística',
        nombreAsistente: l.nombre || l.nombrePersona || '',
        tipoDocumentoAsistente: l.tipoDocumento || '',
        documentoAsistente: l.numeroDocumento || '',
        celular: l.celular || ''
      });
    });
    micAbierto.forEach(m => {
      asistentes.push({
        origen: 'Micrófono Abierto',
        nombreAsistente: m.nombrePersona || m.nombre || m.agrupacion || '',
        tipoDocumentoAsistente: m.tipoDocumento || '',
        documentoAsistente: m.numeroDocumento || '',
        celular: m.celular || ''
      });
    });
    artistas.forEach(a => {
      asistentes.push({
        origen: 'Artista',
        nombreAsistente: a.nombrePersona || a.nombre || a.artista || '',
        tipoDocumentoAsistente: a.tipoDocumento || '',
        documentoAsistente: a.numeroDocumento || '',
        celular: a.celular || ''
      });
    });

    const selectAsistentes = document.getElementById('asistentes');
    if (selectAsistentes) {
      selectAsistentes.innerHTML = '';
      asistentes.forEach((t, idx) => {
        const option = document.createElement("option");
        option.value = String(idx); // usar índice para referencia segura
        option.textContent = `${t.nombreAsistente}${t.origen ? ' (' + t.origen + ')' : ''}`;
        selectAsistentes.appendChild(option);
      });

      // Inicializa Select2
      $(selectAsistentes).select2({
        placeholder: "Busca un asistente",
        allowClear: true,
        width: '100%' // Asegura que se vea bien
      });
    }

  // Registrar Transporte
  const form = document.getElementById('formTransporte');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      mostrarOverlay('Registrando transporte...');
      const rutaSelect = form.querySelector('#ruta');
      const ruta = rutaSelect ? rutaSelect.options[rutaSelect.selectedIndex].text : '';
      let comprobanteFile = document.getElementById("comprobantePago").files[0];
      // obtener el índice seleccionado del select (valor es el índice en 'asistentes')
      const selectedIndex = form.asistentes.value;
      const asistenteEncontrado = asistentes[Number(selectedIndex)];
      let nombrePersona = asistenteEncontrado ? (asistenteEncontrado.nombreAsistente || '') : '';
      let tipoDocumento = asistenteEncontrado ? (asistenteEncontrado.tipoDocumentoAsistente || '') : '';
      let numeroDocumento = asistenteEncontrado ? (asistenteEncontrado.documentoAsistente || '') : '';
      let celular = asistenteEncontrado ? (asistenteEncontrado.celular || '') : '';

      if (!comprobanteFile) {
        alert("Por favor completa todos los campos de pago.");
        return;
      }

      if (asistenteEncontrado) {
        try {

          // Subir archivos a Cloudinary (o tu endpoint de imágenes)
          let comprobanteUrl = "";
          // Solo intentar subir el comprobante si no es promoción id 2
          try {
            comprobanteUrl = await subirArchivoCloudinary(comprobanteFile);
          } catch (err) {
            alert("Error al subir el comprobante de pago. Intenta nuevamente.");
            return;
          }

          const referencia = await obtenerReferenciaGlobal();
          imagenBase64 = await generarImagenBoletaTransporte({ ruta, nombrePersona: nombrePersona, documento: numeroDocumento, referencia });

          let transporteAsistente = { 
            ruta,
            nombrePersona,
            tipoDocumento,
            numeroDocumento,
            celular,
            referencia, 
            boleta: imagenBase64, 
            comprobanteUrl,
            envioWhatsapp: 0,
            fechaRegistro: new Date().toISOString()
          };

          const resp = await fetch('/registrar-boleta/transporte', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(transporteAsistente)
          });
          const data = await resp.json();
          if (resp.ok) {

            // Envío de WhatsApp y registro de historial solo para este artista

            let mensajeBase = catalogosGlobales.MensajesWhatsapp[0].transporteComprado;
            let caption = mensajeBase.replace('{ruta}', transporteAsistente.ruta).replace('{nombrePersona}', transporteAsistente.nombrePersona);

            const reqGreen = {
              urlFile: transporteAsistente.boleta,
              fileName: `boletaTransporte_${transporteAsistente.nombrePersona.replace(/\s+/g, '_')}.png`,
              caption: caption,
              numero: (() => {
                let num = transporteAsistente.celular.trim();
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
            transporteAsistente.envioWhatsapp = envioOk ? 1 : 0;
            const historialEnvio = {
              fecha: new Date().toISOString(),
              mensaje: caption,
              respuesta: respuestaServicio
            };
            await fetch("/actualizar-boleta/transporte", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referencia: transporteAsistente.referencia, envioWhatsapp: transporteAsistente.envioWhatsapp, historialEnvio })
            });

            ocultarOverlay();
            alert("Transporte registrado exitosamente.");
            this.reset();
        } else {
          ocultarOverlay();
          alert('Error al guardar el transporte: ' + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        ocultarOverlay();
        alert('Error al guardar el transporte: ' + err.message);
      }
      } else {
        ocultarOverlay();
        alert('Asistente no encontrado');
      }
    });
  }
});

async function obtenerReferenciaGlobal() {
  const resp = await fetch("/api/referencia-global?tipo=transporte");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}

// Generar imagen boleta para transporte
async function generarImagenBoletaTransporte({ ruta, nombrePersona, documento, referencia }) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "../data/plantilla_boletas.png";
    let nombreRutaLimpio = ruta.replace(/_/g, ' ');
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
      ctx.fillText(`Ruta:`, 1560, 450);
      ctx.fillText(`${nombreRutaLimpio}`, 1560, 490);

      ctx.font = "bold 35px Arial";
      ctx.fillText(`# ${referencia}`, 1850, 180);
      ctx.fillText(`Ruta`, 1535, 180);

      const imagenBase64 = canvas.toDataURL("image/png");
      const reqFb = { imagenBase64: imagenBase64, referencia: `Ruta_${referencia}_${nombrePersona}` };
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
// Función para subir archivos a Cloudinary (o tu endpoint)
async function subirArchivoCloudinary(file) {
  // Convertir archivo a base64 como en ventaBoleteria.js
  const base64 = await convertirArchivoABase64(file);
  // Subir a tu endpoint (ejemplo: /subir-comprobante)
  const response = await fetch("/subir-comprobante", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenBase64: base64, referencia: Date.now().toString() })
  });
  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new Error(data.error || "No se pudo subir el archivo");
  }
  return data.url;
}
// Utilidad para convertir archivo a base64
function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}