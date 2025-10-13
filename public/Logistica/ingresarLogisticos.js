let catalogosGlobales = null;
document.addEventListener("DOMContentLoaded", function () {
  let asistentesGlobal = [];
  fetch("../data/catalogos.json")
    .then(res => res.json())
    .then(catalogos => {
      catalogosGlobales = catalogos;
      fetch("/api/boletas")
        .then(res => res.json())
        .then(data => {
          asistentesGlobal = data.Asistentes;
          mostrarBoletasAgrupadas(data.Asistentes);
        })
        .catch(err => console.error("Error cargando boletas:", err));
    })
    .catch(err => console.error("Error cargando catálogo:", err));

  const form = document.getElementById("formLogisticos");
  const submitBtn = form.querySelector('button[type="submit"]');
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(255,255,255,0.7)';
  overlay.style.display = 'none';
  overlay.style.zIndex = 9999;
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.innerHTML = `<div style="text-align:center"><div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status"><span class="visually-hidden">Cargando...</span></div><div class="mt-2">Procesando...</div></div>`;
  document.body.appendChild(overlay);

  function mostrarOverlay() {
    overlay.style.display = 'flex';
  }
  function ocultarOverlay() {
    overlay.style.display = 'none';
  }

  // Cargar áreas de apoyo y tipos de documento desde catalogos.json
  fetch('../data/catalogos.json')
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
      let  imagenBase64;
      mostrarOverlay();
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
        const referencia = await obtenerReferenciaGlobal();
        imagenBase64 = await generarImagenBoleta({ nombre: nombre, documento: numeroDocumento, referencia, areas: areas.join(', ') });
        let asistente = { 
          nombre, 
          tipoDocumento, 
          numeroDocumento, 
          celular, 
          promocion, 
          tareas, 
          areasApoyo: areas, 
          referencia, 
          boleta: imagenBase64, 
          envioWhatsapp: 0,
          fechaRegistro: new Date().toISOString(),
        };
        const resp = await fetch('/registrar-logistico', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(asistente)
        });
        const data = await resp.json();
        if (resp.ok) {
          try{
            // Envío de WhatsApp y registro de historial solo para este asistente
            let nombreAsistenteLimpio = asistente.nombre.replace(/_/g, ' ');
            let caption,mensajeBase;
            if(asistente.promocion==='Logistica'){
              mensajeBase = catalogosGlobales.MensajesWhatsapp[0].logisticos;
              caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);
            }else{
              mensajeBase = catalogosGlobales.MensajesWhatsapp[0].invitados;
              caption = mensajeBase.replace('{nombrePersona}', nombreAsistenteLimpio);
            }
            

            const reqGreen = {
              urlFile: asistente.boleta,
              fileName: `boleta_${asistente.nombre.replace(/\s+/g, '_')}.png`,
              caption: caption,
              numero: '573058626761'//asistente.celular
            };
            let respuestaServicio = "";
            let envioOk = false;
            try {
              const resp = await fetch("/enviar-mensaje-boleta-greenapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqGreen)
              });
              try {
                respuestaServicio = await resp.text();
              } catch (e) {
                respuestaServicio = "Error leyendo respuesta";
              }
              envioOk = resp.ok;
            } catch (error) {
              respuestaServicio = error?.message || "Error en envío";
              envioOk = false;
            }
            asistente.envioWhatsapp = envioOk ? 1 : 0;
            const historialEnvio = {
              fecha: new Date().toISOString(),
              mensaje: caption,
              respuesta: respuestaServicio
            };
            await fetch("/actualizar-envio-whatsapp-logistica", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referencia:asistente.referencia, envioWhatsapp: asistente.envioWhatsapp, historialEnvio })
            });
            mensajeAlert='¡Logístico registrado exitosamente!';
          }catch(e){
            mensajeAlert = 'Error al guardar el logístico: ' + (data.error || 'Error desconocido');
          }
        } else {
          mensajeAlert ='Error al guardar el logístico: ' + (data.error || 'Error desconocido');
        }
      } catch (err) {
        mensajeAlert='Error al guardar el logístico: ' + err.message;
      }
      alert(mensajeAlert);
      ocultarOverlay();
      form.reset();
    });
  }
});

async function obtenerReferenciaGlobal() {
  const resp = await fetch("/api/referencia-global?tipo=logisticos");
  const data = await resp.json();
  return data.referencia; // El backend debe responder { referencia: valor }
}

async function generarImagenBoleta({ nombre, documento, referencia, areas }) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById("canvasBoleta");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "../data/plantilla_boletas.png";

    img.onload = () => {
     canvas.width = img.width;   // 2000
  canvas.height = img.height; // 647

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0); // sin redimensionar

      let nombreAsistenteLimpio = nombre.replace(/_/g, ' ');

      ctx.font = "bold 25px Arial";
      ctx.fillStyle = "#000000ff";
      ctx.fillText(`Nombre completo:`, 1560, 290);
      ctx.font = "bold 19px Arial";
      ctx.fillText(`${nombreAsistenteLimpio}`, 1560, 330);
      ctx.font = "bold 25px Arial";
      ctx.fillText(`Número de documento:`, 1560, 450);
      ctx.fillText(`${documento}`, 1560, 490);
      ctx.font = "bold 35px Arial";
      ctx.fillText(`# ${referencia}`, 1850, 180);
      ctx.fillText(`Logística`, 1535, 180);
      ctx.font = "bold 19px Arial";
      ctx.fillText(`(${areas})`, 1535, 220);
      const imagenBase64 = canvas.toDataURL("image/png");

      const reqFb = { imagenBase64: imagenBase64, referencia: `${referencia}${nombre}`};
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