  let gruposData = {}; 
  let numerosPorGrupo = {};

  document.getElementById("cargarGrupos").addEventListener("click", async () => {
    const container = document.getElementById("gruposContainer");
    container.innerHTML = "🔄 Cargando listas...";

    try {
      const response = await fetch("/api/traer-todo");
      gruposData = await response.json();

      container.innerHTML = `
  <table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;">Seleccionar</th>
        <th style="text-align:left;">Grupo</th>
      </tr>
    </thead>
    <tbody id="tablaGruposBody"></tbody>
  </table>
`;

const tbody = document.getElementById("tablaGruposBody");
for (const grupo in gruposData) {
  const fila = document.createElement("tr");

  fila.innerHTML = `
    <td><input type="checkbox" value="${grupo}" /></td>
    <td>${grupo}</td>
  `;

  tbody.appendChild(fila);
}


      container.addEventListener("change", actualizarNumerosDesdeGrupos);
    } catch (err) {
      container.innerHTML = `❌ Error al cargar listas: ${err.message}`;
    }
  });

function actualizarNumerosDesdeGrupos() {
  const checkboxes = document.querySelectorAll("#gruposContainer input[type=checkbox]");
  numerosPorGrupo = {};

  let numerosGrupos = [];
  for (const checkbox of checkboxes) {
    const grupo = checkbox.value;
    if (checkbox.checked) {
      const lista = gruposData[grupo];
      if (lista) {
        const extraNumeros = lista.map(item => item.celular || item.celularPersona).filter(Boolean);
        numerosPorGrupo[grupo] = extraNumeros;
        numerosGrupos.push(...extraNumeros);
      }
    }
  }

  const campoNumeros = document.getElementById("numeros");
  const numerosManual = campoNumeros.value.trim().split(",").map(n => n.trim()).filter(n => n.length > 0);
  const todosGruposSet = new Set(numerosGrupos);
  const manualesFiltrados = numerosManual.filter(n => !todosGruposSet.has(n));

  const todosUnicos = Array.from(new Set([...manualesFiltrados, ...numerosGrupos]));
  campoNumeros.value = todosUnicos.join(", ");
}

  document.getElementById("whatsappForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const ahora = new Date();
    const fileName = `${String(ahora.getDate()).padStart(2, '0')}${String(ahora.getMonth() + 1).padStart(2, '0')}${ahora.getFullYear()}${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}${String(ahora.getSeconds()).padStart(2, '0')}`;

    const urlFile = await subirImagenBoleta(fileName);
    const caption = document.getElementById("caption").value.trim().replace(/ /g, "_");

    const numerosRaw = document.getElementById("numeros").value.trim();
    const numeros = numerosRaw.split(",").map(n => n.trim()).filter(n => n.length > 0);

    const resultDiv = document.getElementById("result");
    resultDiv.innerText = "Enviando mensajes...\n";

    for (const numero of numeros) {
      try {

        let numeroAux = (() => {
            let num = numero.trim();
            if (/^(\+|57|58|51|52|53|54|55|56|591|593|595|598|1|44|34)/.test(num)) {
              return num.replace(/[^\d+]/g, '');
            } else {
              return '+57' + num.replace(/[^\d]/g, '');
            }
          })()

        const response = await fetch(`/masivo-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlFile, fileName, caption, numero: numeroAux }),
        });

        const data = await response.json();
        if (response.ok) {
          resultDiv.innerText += `✅ Enviado a ${numero}: ${data.mensaje}\n`;
        } else {
          resultDiv.innerText += `❌ Error con ${numero}: ${JSON.stringify(data.error)}\n`;
        }
      } catch (err) {
        resultDiv.innerText += `⚠️ Fallo con ${numero}: ${err.message}\n`;
      }
    }

    resultDiv.innerText += "\n📨 Proceso completado.";
  });

async function subirImagenBoleta(nombreArchivo) {
  const fileInput = document.getElementById("imagenBoleta");
  const file = fileInput.files[0];
  if (!file) {
    console.error("No se seleccionó ninguna imagen.");
    return null;
  }

  const fileBase64 = await convertirArchivoABase64(file);
  try {
    const reqFb = { imagenBase64: fileBase64, fileName: `${nombreArchivo}` };
    const response = await fetch("/subir-masivo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqFb),
    });

    const data = await response.json();
    if (response.ok && data.url) {
      return data.url;
    } else {
      console.error("❌ Error al subir imagen:", data.error || data);
      return null;
    }
  } catch (err) {
    console.error("⚠️ Fallo en la subida:", err.message);
    return null;
  }
}

function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}