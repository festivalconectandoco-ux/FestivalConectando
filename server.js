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
app.use(express.static(path.join(__dirname, "public"))); // donde está tu ventaBoleteria.html

app.post("/registrar-boleta", async (req, res) => {
  try {
    const nuevaBoleta = req.body;
    nuevaBoleta.id = Date.now().toString();
    await db.collection("boletas").add(nuevaBoleta);
    res.status(200).json({ mensaje: "Boleta registrada con éxito", id: nuevaBoleta.id });
  } catch (error) {
    console.error("Error guardando boleta:", error);
    res.status(500).json({ error: "Error al registrar boleta" });
  }
});

app.get("/api/boletas", async (req, res) => {
  try {
    const snapshot = await db.collection("boletas").get();
    const boletas = snapshot.docs.map(doc => doc.data());
    res.json({ Asistentes: boletas });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener boletas" });
  }
});

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(__dirname, "favicon.ico");
  res.sendFile(faviconPath);
});


app.post("/enviar-mensaje-boleta", async (req, res) => {
  try {
    const mensaje = req.body;
    const message = await client.messages.create({
      from: mensaje.from,
      body: mensaje.body,
      to: mensaje.to,
      mediaUrl: [mensaje.mediaUrl],
    });
    if (message.error) {
      console.warn("Twilio respondió con error lógico:", message);
      return res.status(500).json({
        error: message.error,
      });
    }
    res.status(200).json({
      mensaje: "mensaje enviado con éxito",
      sid: message.sid,
      status: message.status,
    });
  } catch (error) {
    console.error("Error enviando boleta:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar archivo por WhatsApp usando GreenAPI
app.post("/enviar-mensaje-boleta-greenapi", async (req, res) => {
  try {
    let { urlFile, fileName, caption, numero } = req.body;
    const url = process.env.URL_GREENAPI;
    // Si no viene el número, usar el de prueba
    if (!numero) numero = "573058626761";
    // Limpiar y asegurar formato
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

// Actualizar el campo EnvioWhatsapp de un asistente por referencia
app.post("/actualizar-envio-whatsapp", async (req, res) => {
  try {
    const { referencia, EnvioWhatsapp } = req.body;
    if (!referencia) {
      return res.status(400).json({ error: "Referencia requerida" });
    }
    // Buscar el documento por referencia
    const snapshot = await db.collection("boletas").where("Referencia", "==", referencia).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontró la boleta con esa referencia" });
    }
    // Actualizar todos los documentos que coincidan (debería ser solo uno)
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { EnvioWhatsapp });
    });
    await batch.commit();
    res.status(200).json({ mensaje: "EnvioWhatsapp actualizado" });
  } catch (error) {
    console.error("Error actualizando EnvioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});