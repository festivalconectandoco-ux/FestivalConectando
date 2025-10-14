const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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

    // Mapeo de tipo a colección y mensaje
    const tipoMap = {
      asistente: { coleccion: "boletas", mensaje: "Boleta registrada con éxito" },
      logistico: { coleccion: "logisticos", mensaje: "Logístico registrado con éxito" },
      emprendimiento: { coleccion: "emprendimientos", mensaje: "Emprendimiento registrado con éxito" },
      micAbierto: { coleccion: "micAbierto", mensaje: "Micrófono Abierto registrado con éxito" },
      artista: { coleccion: "artistas", mensaje: "Artista registrado con éxito" },
    };

    const { coleccion, mensaje } = tipoMap[tipo] || tipoMap["asistente"]; // Default a "boletas"

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
    const [boletasSnap, emprendimientosSnap, artistasSnap, logisticosSnap, micAbiertoSnap] = await Promise.all([
      db.collection("boletas").get(),
      db.collection("emprendimientos").get(),
      db.collection("artistas").get(),
      db.collection("logisticos").get(),
      db.collection("micAbierto").get()
    ]);
    const boletas = boletasSnap.docs.map(doc => doc.data());
    const emprendimientos = emprendimientosSnap.docs.map(doc => doc.data());
    const artistas = artistasSnap.docs.map(doc => doc.data());
    const logisticos = logisticosSnap.docs.map(doc => doc.data());
    const micAbierto = micAbiertoSnap.docs.map(doc => doc.data());
    res.json({
      boletas,
      emprendimientos,
      artistas,
      logisticos,
      micAbierto
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(__dirname, "favicon.ico");
  res.sendFile(faviconPath);
});

app.post("/enviar-mensaje-boleta-greenapi", async (req, res) => {
  try {
    let { urlFile, fileName, caption, numero } = req.body;
    caption = caption.replace(/_/g, ' ');
    const url = process.env.URL_GREENAPI;
    if (!numero) numero = "573143300821";
    numero = numero.replace(/[^\d]/g, "");
    const chatId = `${numero}@c.us`;
    const payload = {
      chatId,
      urlFile,
      fileName,
      caption
    };
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});