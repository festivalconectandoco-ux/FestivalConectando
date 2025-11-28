const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();

let serviceAccount;

if (process.env.NODE_ENV === "production") {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} else {
  serviceAccount = require("./firebaseKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(express.static('public'));

app.get("/api/referencia-global", async (req, res) => {
  const tipo = req.query.tipo || "global";

  const tipoReferenciaMap = {
    artistas: "referenciaArtistas",
    asistentes: "referenciaAsistentes",
    emprendimientos: "referenciaEmprendimientos",
    logisticos: "referenciaLogisticos",
    micAbierto: "referenciaMicAbierto",
    transporte: "referenciaTransporte"
  };

  try {
    if (tipo === "global" || !tipoReferenciaMap[tipo]) {
      const referencia = await obtenerReferenciaGlobalIncremental();
      return res.json({ referencia });
    }

    const docId = tipoReferenciaMap[tipo];
    const ref = admin.firestore().collection("contadores").doc(docId);

    const referencia = await admin.firestore().runTransaction(async (t) => {
      const doc = await t.get(ref);
      const actual = doc.exists ? doc.data().valor : 0;
      const nuevoValor = actual + 1;
      t.set(ref, { valor: nuevoValor });
      return nuevoValor;
    });

    res.json({ referencia });
  } catch (error) {
    console.error("Error generando referencia:", error);
    res.status(500).json({ error: "Error al generar referencia" });
  }
});

app.post("/registrar-boleta/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    const nuevaBoleta = req.body;
    nuevaBoleta.id = Date.now().toString();

    if (!nuevaBoleta.referencia) {
      return res.status(400).json({ error: "Falta el campo referencia" });
    }
    const camposAReemplazar = [
      "nombreAsistente",
      "nombrePersona",
      "artista",
      "nombreComprador",
      "nombreEmprendimiento",
      "nombre",
      "agrupacion"
    ];

    camposAReemplazar.forEach((campo) => {
      if (nuevaBoleta[campo] && typeof nuevaBoleta[campo] === "string") {
        nuevaBoleta[campo] = nuevaBoleta[campo].trim().replace(/\s+/g, "_");
      }
    });

    const tipoMap = {
      asistente: { coleccion: "boletas", mensaje: "Boleta registrada con éxito" },
      logistico: { coleccion: "logisticos", mensaje: "Logístico registrado con éxito" },
      emprendimiento: { coleccion: "emprendimientos", mensaje: "Emprendimiento registrado con éxito" },
      micAbierto: { coleccion: "micAbierto", mensaje: "Micrófono Abierto registrado con éxito" },
      artista: { coleccion: "artistas", mensaje: "Artista registrado con éxito" },
      transporte: { coleccion: "transporte", mensaje: "Transporte registrado con éxito" },
    };

    const { coleccion, mensaje } = tipoMap[tipo] || tipoMap["asistente"];

    await db.collection(coleccion).doc(String(nuevaBoleta.referencia)).set(nuevaBoleta);

    res.status(200).json({ mensaje, id: nuevaBoleta.referencia });
  } catch (error) {
    console.error("Error guardando boleta:", error);
    res.status(500).json({ error: "Error al registrar boleta" });
  }
});

app.post("/actualizar-boleta/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    const { referencia, envioWhatsapp, historialEnvio } = req.body;

    if (!referencia) {
      return res.status(400).json({ error: "referencia requerida" });
    }

    const tipoMap = {
      asistente: "boletas",
      logistico: "logisticos",
      emprendimiento: "emprendimientos",
      micAbierto: "micAbierto",
      artista: "artistas",
      transporte: "transporte"
    };

    const coleccion = tipoMap[tipo] || "boletas"; // Default a "boletas" si tipo no coincide

    const snapshot = await db.collection(coleccion).where("referencia", "==", referencia).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: `No se encontró el registro en ${coleccion} con esa referencia` });
    }

    const batch = db.batch();
    snapshot.forEach(doc => {
      const updateData = { envioWhatsapp };
      if (historialEnvio) {
        updateData.historialEnvio = admin.firestore.FieldValue.arrayUnion(historialEnvio);
      }
      batch.update(doc.ref, updateData);
    });

    await batch.commit();
    res.status(200).json({ mensaje: `envioWhatsapp actualizado en ${coleccion}` });
  } catch (error) {
    console.error("Error actualizando envioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/traer-todo", async (req, res) => {
  try {
    const [boletasSnap, emprendimientosSnap, artistasSnap, logisticosSnap, micAbiertoSnap, transporteSnap] = await Promise.all([
      db.collection("boletas").get(),
      db.collection("emprendimientos").get(),
      db.collection("artistas").get(),
      db.collection("logisticos").get(),
      db.collection("micAbierto").get(),
      db.collection("transporte").get()
    ]);

    const camposARevertir = [
      "nombreAsistente",
      "nombrePersona",
      "artista",
      "nombreComprador",
      "nombreEmprendimiento",
      "nombre",
      "agrupacion"
    ];

    const revertirCampos = (doc) => {
      const nuevoDoc = { ...doc };
      camposARevertir.forEach((campo) => {
        if (nuevoDoc[campo] && typeof nuevoDoc[campo] === "string") {
          nuevoDoc[campo] = nuevoDoc[campo].replace(/_/g, " ");
        }
      });
      return nuevoDoc;
    };

    const boletas = boletasSnap.docs.map(doc => revertirCampos(doc.data()));
    const emprendimientos = emprendimientosSnap.docs.map(doc => revertirCampos(doc.data()));
    const artistas = artistasSnap.docs.map(doc => revertirCampos(doc.data()));
    const logisticos = logisticosSnap.docs.map(doc => revertirCampos(doc.data()));
    const micAbierto = micAbiertoSnap.docs.map(doc => revertirCampos(doc.data()));
    const transporte = transporteSnap.docs.map(doc => revertirCampos(doc.data()));
    res.json({
      boletas,
      emprendimientos,
      artistas,
      logisticos,
      micAbierto,
      transporte
    });
  } catch (error) {
    console.error("Error al obtener datos:", error);
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

app.get("/api/traer-costos", async (req, res) => {
  try {
    const [costosSnap] = await Promise.all([
      db.collection("costos").get()
    ]);

    const costos = costosSnap.docs.map(doc => doc.data());
    res.json({
      costos
    });
  } catch (error) {
    console.error("Error al obtener datos:", error);
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

// Endpoint para verificar/crear documento de costos
app.get("/api/costos-status", async (req, res) => {
  try {
    const snap = await db.collection("costos").get();
    if (snap.empty) {
      // Crear documento por defecto
      const defaultCostos = {
        MetaCostosSubTotal: 5000000,
        MetaColchonFetival: 2000000,
        MetaGanancia: 3000000,
        PrecioBoleta: 120000
      };
      await db.collection("costos").doc("config").set(defaultCostos);
      res.json({ 
        status: "creado",
        costos: defaultCostos,
        mensaje: "Documento de costos creado con valores por defecto"
      });
    } else {
      const costos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ 
        status: "existe",
        costos: costos,
        mensaje: "Documento de costos existe"
      });
    }
  } catch (error) {
    console.error("Error verificando costos:", error);
    res.status(500).json({ error: error.message });
  }
});


app.post("/enviar-whatsapp/:tipo", async (req, res) => {
  try {
    let { urlFile, fileName, caption, numero } = req.body;
    const { tipo } = req.params;

    if (caption && typeof caption === "string") {
      caption = caption.replace(/_/g, " ");
    }

    const modo = tipo === "reenvio" ? process.env.REENVIO_WHATSAPP : process.env.MENSAJE_WHATSAPP;
    const url = process.env.URL_GREENAPI;
    numero = modo === "camilo" ? "573058626761" : modo === "festival" ? "573143300821" :  modo === "asistente" ? numero.replace(/[^\d+]/g, "").replace(/\+/g, "") : "573143300821";

    const chatId = `${numero}@c.us`;
    const payload = { chatId, urlFile, fileName, caption };

    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok) {
      res.status(200).json({ mensaje: "Archivo enviado con éxito", data });
    } else {
      res.status(500).json({ error: data });
    }
  } catch (error) {
    console.error("Error enviando archivo por GreenAPI:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/enviar-whatsapp-mensaje/:tipo", async (req, res) => {
  try {
    let { message, numero } = req.body;
    const { tipo } = req.params;

    if (message && typeof message === "string") {
      message = message.replace(/_/g, " ");
    }

    const modo = tipo === "reenvio" ? process.env.REENVIO_WHATSAPP : process.env.MENSAJE_WHATSAPP;
    // Usar URL_GREENAPI pero cambiar el endpoint a sendMessage
    let url = process.env.URL_GREENAPI_MESSAGE;
    if (url.includes('sendFile')) {
      url = url.replace('sendFile', 'sendMessage');
    }
    
    numero = modo === "camilo" ? "573058626761" : modo === "festival" ? "573143300821" :  modo === "asistente" ? numero.replace(/[^\d]/g, "") : "573143300821";

    const chatId = `${numero}@c.us`;
    const payload = { chatId, message };
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ mensaje: "Mensaje enviado con éxito", data });
    } else {
      res.status(500).json({ error: data });
    }
  } catch (error) {
    console.error("Error enviando mensaje por GreenAPI:", error);
    res.status(500).json({ error: error.message });
  }
});


app.post("/masivo-whatsapp", async (req, res) => {
  try {
    let { urlFile, fileName, caption, numero } = req.body;

    if (caption && typeof caption === "string") {
      caption = caption.replace(/_/g, " ");
    }

    const modo = process.env.MASIVO_WHATSAPP;
    const url = process.env.URL_GREENAPI;

    numero = modo === "camilo" ? "573058626761" : modo === "festival" ? "573143300821" : modo === "asistente" ? numero.replace(/[^\d]/g, "") : "573143300821";

    const chatId = `${numero}@c.us`;

    const payload = { chatId };
    if (caption) payload.caption = caption;
    if (urlFile) payload.urlFile = urlFile;
    if (fileName) payload.fileName = fileName;

    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      res.status(200).json({ mensaje: "Archivo enviado con éxito", data });
    } else {
      res.status(500).json({ error: data });
    }
  } catch (error) {
    console.error("Error enviando archivo por GreenAPI:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/subir-imagen-boleta", async (req, res) => {
  try {
    const { imagenBase64, referencia } = req.body;
    if (!imagenBase64 || !referencia) {
      return res.status(400).json({ error: "Faltan datos" });
    }
    const resultado = await cloudinary.uploader.upload(imagenBase64, {
      folder: "boletas",
      public_id: `boleta_${referencia}`,
      overwrite: true
    });    
    res.status(200).json({ url: resultado.secure_url });
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    res.status(500).json({ error: "Error al subir imagen a Cloudinary" });
  }
});

app.post("/subir-comprobante", async (req, res) => {
  try {
    const { imagenBase64, referencia } = req.body;
    if (!imagenBase64 || !referencia) {
      return res.status(400).json({ error: "Faltan datos" });
    }
    const resultado = await cloudinary.uploader.upload(imagenBase64, {
      folder: "comprobantes",
      public_id: `comprobante_${referencia}`,
      overwrite: true
    });    
    res.status(200).json({ url: resultado.secure_url });
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    res.status(500).json({ error: "Error al subir imagen a Cloudinary" });
  }
});

app.post("/subir-masivo", async (req, res) => {
  try {
    const { imagenBase64, fileName } = req.body;
    if (!imagenBase64 || !fileName) {
      return res.status(400).json({ error: "Faltan datos" });
    }
    const resultado = await cloudinary.uploader.upload(imagenBase64, {
      folder: "masivo",
      public_id: `masivo_${fileName}`,
      overwrite: true
    });    
    res.status(200).json({ url: resultado.secure_url });
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    res.status(500).json({ error: "Error al subir imagen a Cloudinary" });
  }
});

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(__dirname, "favicon.ico");
  res.sendFile(faviconPath);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Endpoints para separaciones (reservas / abonos)
app.post('/registrar-separacion', async (req, res) => {
  try {
    const { referencia, nombreComprador, nombreAsistente, tipoDocumento, numeroDocumento, celular, promocionId, promocionDescripcion, valorBoleta, valorAbonado, comprobante, recibidoPor, medioPago } = req.body;
    if (!referencia) return res.status(400).json({ error: 'referencia requerida' });
    const fechaRegistro = new Date().toISOString();
    const saldo = (Number(valorBoleta) || 0) - (Number(valorAbonado) || 0);
    const doc = {
      referencia,
      nombreComprador: nombreComprador || '',
      nombreAsistente: nombreAsistente || '',
      tipoDocumento: tipoDocumento || '',
  numeroDocumento: numeroDocumento ? String(numeroDocumento) : '',
      celular: celular || '',
      promocionId: promocionId || '',
      promocionDescripcion: promocionDescripcion || '',
      valorBoleta: Number(valorBoleta) || 0,
      valorAbonado: Number(valorAbonado) || 0,
      saldo: saldo,
      recibidoPor: recibidoPor || '',
      comprobante: comprobante || '',
      medioPago: medioPago || '',
      fechaRegistro
    };
    await db.collection('separaciones').doc(String(referencia)).set(doc);
    res.status(200).json({ mensaje: 'Separación registrada', referencia, saldo });
  } catch (error) {
    console.error('Error registrando separacion:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/separaciones', async (req, res) => {
  try {
    const snap = await db.collection('separaciones').get();
    const separaciones = snap.docs.map(d => d.data());
    res.json({ separaciones });
  } catch (error) {
    console.error('Error obteniendo separaciones:', error);
    res.status(500).json({ error: 'Error al obtener separaciones' });
  }
});

// Endpoint para obtener dinero agrupado por persona que lo recibió
app.get('/api/dinero-por-persona', async (req, res) => {
  try {
    const [boletasSnap, emprendimientosSnap, transporteSnap, separacionesSnap] = await Promise.all([
      db.collection('boletas').get(),
      db.collection('emprendimientos').get(),
      db.collection('transporte').get(),
      db.collection('separaciones').get()
    ]);

    const dineroAcumulado = {};

    // Función auxiliar para extraer el nombre de quien recibió
    const getRecibidoPor = (doc) => {
      let recibidor = doc.recibidoPor || doc.quienRecibio || null;
      if (recibidor && typeof recibidor === 'string') {
        recibidor = recibidor.trim();
        return recibidor.length > 0 ? recibidor : null;
      }
      return null;
    };

    // Función auxiliar para extraer el valor (intenta múltiples campos)
    const getValor = (doc, campos = []) => {
      for (const campo of campos) {
        const valor = Number(doc[campo]);
        if (!isNaN(valor) && valor > 0) {
          return valor;
        }
      }
      return 0;
    };

    // Procesar boletas (solo si tienen recibidoPor o quienRecibio)
    boletasSnap.docs.forEach(doc => {
      const boleta = doc.data();
      const recibidoPor = getRecibidoPor(boleta);
      if (recibidoPor) {
        const valor = getValor(boleta, ['valorBoleta', 'valorPromocion', 'valorAbonado']);
        if (valor > 0) {
          if (!dineroAcumulado[recibidoPor]) {
            dineroAcumulado[recibidoPor] = { total: 0, boletas: 0, emprendimientos: 0, transporte: 0, separaciones: 0 };
          }
          dineroAcumulado[recibidoPor].total += valor;
          dineroAcumulado[recibidoPor].boletas += valor;
        }
      }
    });

    // Procesar emprendimientos (solo si tienen recibidoPor o quienRecibio)
    emprendimientosSnap.docs.forEach(doc => {
      const emp = doc.data();
      const recibidoPor = getRecibidoPor(emp);
      if (recibidoPor) {
        const valor = getValor(emp, ['valorPromocion', 'valorBoleta', 'valorAbonado']);
        if (valor > 0) {
          if (!dineroAcumulado[recibidoPor]) {
            dineroAcumulado[recibidoPor] = { total: 0, boletas: 0, emprendimientos: 0, transporte: 0, separaciones: 0 };
          }
          dineroAcumulado[recibidoPor].total += valor;
          dineroAcumulado[recibidoPor].emprendimientos += valor;
        }
      }
    });

    // Procesar transporte (sumar monto fijo por persona que recibió)
    // Asumiendo que cada transporte = $25.000
    const montoTransporte = 25000;
    transporteSnap.docs.forEach(doc => {
      const transporte = doc.data();
      const recibidoPor = getRecibidoPor(transporte);
      if (recibidoPor) {
        const valor = montoTransporte;
        if (!dineroAcumulado[recibidoPor]) {
          dineroAcumulado[recibidoPor] = { total: 0, boletas: 0, emprendimientos: 0, transporte: 0, separaciones: 0 };
        }
        dineroAcumulado[recibidoPor].total += valor;
        dineroAcumulado[recibidoPor].transporte += valor;
      }
    });

    // Procesar separaciones (intenta valorAbonado, valorBoleta, valorPromocion)
    separacionesSnap.docs.forEach(doc => {
      const sep = doc.data();
      const recibidoPor = getRecibidoPor(sep);
      if (recibidoPor) {
        const valor = getValor(sep, ['valorAbonado', 'valorBoleta', 'valorPromocion']);
        if (valor > 0) {
          if (!dineroAcumulado[recibidoPor]) {
            dineroAcumulado[recibidoPor] = { total: 0, boletas: 0, emprendimientos: 0, transporte: 0, separaciones: 0 };
          }
          dineroAcumulado[recibidoPor].total += valor;
          dineroAcumulado[recibidoPor].separaciones += valor;
        }
      }
    });

    // Convertir a array y ordenar por total descendente
    const resultado = Object.keys(dineroAcumulado)
      .map(persona => ({
        persona,
        ...dineroAcumulado[persona]
      }))
      .sort((a, b) => b.total - a.total);

    res.json({ dinerosPorPersona: resultado, totalGlobal: resultado.reduce((acc, item) => acc + item.total, 0) });
  } catch (error) {
    console.error('Error obteniendo dineros por persona:', error);
    res.status(500).json({ error: 'Error al obtener dineros por persona' });
  }
});

// Endpoint para migrar registros existentes - asignar recibidoPor y valorTransporte por defecto
app.post("/api/migrar-campos-defecto", async (req, res) => {
  try {
    let actualizacionesSeparaciones = 0;
    let actualizacionesTransporte = 0;

    // Migrar Separaciones
    const separacionesSnapshot = await db.collection('separaciones').get();
    const batch1 = db.batch();
    
    separacionesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Si no tiene recibidoPor, asignar "Jennifer"
      if (!data.recibidoPor) {
        batch1.update(doc.ref, { recibidoPor: "Jennifer" });
        actualizacionesSeparaciones++;
      }
    });
    
    if (actualizacionesSeparaciones > 0) {
      await batch1.commit();
    }

    // Migrar Transporte
    const transporteSnapshot = await db.collection('transporte').get();
    const batch2 = db.batch();
    
    transporteSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const actualizaciones = {};
      
      // Si no tiene recibidoPor, asignar "Jennifer"
      if (!data.recibidoPor) {
        actualizaciones.recibidoPor = "Jennifer";
      }
      
      // Si no tiene valorTransporte, asignar 25000
      if (!data.valorTransporte) {
        actualizaciones.valorTransporte = 25000;
      }
      
      if (Object.keys(actualizaciones).length > 0) {
        batch2.update(doc.ref, actualizaciones);
        actualizacionesTransporte++;
      }
    });
    
    if (actualizacionesTransporte > 0) {
      await batch2.commit();
    }

    res.json({
      success: true,
      mensaje: `Migración completada. Separaciones actualizadas: ${actualizacionesSeparaciones}. Transporte actualizado: ${actualizacionesTransporte}`
    });
  } catch (error) {
    console.error('Error en migración:', error);
    res.status(500).json({ error: 'Error al migrar registros', detalles: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Endpoints para Presupuestos (CRUD)
app.get('/api/presupuestos', async (req, res) => {
  try {
    const snap = await db.collection('Presupuestos').get();
    const presupuestos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ presupuestos });
  } catch (error) {
    console.error('Error obteniendo presupuestos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presupuestos', async (req, res) => {
  try {
    const gasto = req.body;
    // Usar id proporcionado o timestamp
    const docId = gasto.id ? String(gasto.id) : String(Date.now());
    gasto.fechaRegistro = gasto.fechaRegistro || new Date().toISOString();
    await db.collection('Presupuestos').doc(docId).set(gasto);
    res.status(200).json({ mensaje: 'Gasto guardado', id: docId });
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/presupuestos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gasto = req.body;
    await db.collection('Presupuestos').doc(String(id)).set(gasto, { merge: true });
    res.status(200).json({ mensaje: 'Gasto actualizado', id });
  } catch (error) {
    console.error('Error actualizando presupuesto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/presupuestos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('Presupuestos').doc(String(id)).delete();
    res.status(200).json({ mensaje: 'Gasto eliminado', id });
  } catch (error) {
    console.error('Error eliminando presupuesto:', error);
    res.status(500).json({ error: error.message });
  }
});