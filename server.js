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
  // En Render u otro servidor
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} else {
  // En local
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

app.post("/enviar-mensaje-boleta", async (req, res) => {
  try {
    const mensaje = req.body;

    console.log("enviar-mensaje-boleta mensaje:", mensaje);

    const message = await client.messages.create({
      from: mensaje.from,
      body: mensaje.body,
      to: mensaje.to,
      mediaUrl: [mensaje.mediaUrl],
    });

    console.log("enviar-mensaje-boleta response:", message);

    // Validación adicional por si Twilio responde con un objeto que contiene error
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
console.log('req.body',req.body)
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