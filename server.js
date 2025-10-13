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

async function obtenerReferenciaArtistas() {
  const ref = admin.firestore().collection("contadores").doc("referenciaArtistas");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let actual = doc.exists ? doc.data().valor : 0;
    actual++;
    t.set(ref, { valor: actual });
    return actual;
  });
}

async function obtenerReferenciaAsistentes() {
  const ref = admin.firestore().collection("contadores").doc("referenciaAsistentes");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let actual = doc.exists ? doc.data().valor : 0;
    actual++;
    t.set(ref, { valor: actual });
    return actual;
  });
}

async function obtenerReferenciaEmprendimientos() {
  const ref = admin.firestore().collection("contadores").doc("referenciaEmprendimientos");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let actual = doc.exists ? doc.data().valor : 0;
    actual++;
    t.set(ref, { valor: actual });
    return actual;
  });
}

async function obtenerReferenciaLogisticos() {
  const ref = admin.firestore().collection("contadores").doc("referenciaLogisticos");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let actual = doc.exists ? doc.data().valor : 0;
    actual++;
    t.set(ref, { valor: actual });
    return actual;
  });
}

async function obtenerReferenciaMicAbierto() {
  const ref = admin.firestore().collection("contadores").doc("referenciaMicAbierto");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let actual = doc.exists ? doc.data().valor : 0;
    actual++;
    t.set(ref, { valor: actual });
    return actual;
  });
}

app.get("/api/referencia-global", async (req, res) => {
  const tipo = req.query.tipo || "global";
  let referencia;
  switch (tipo) {
    case "artistas":
      referencia = await obtenerReferenciaArtistas();
      break;
    case "asistentes":
      referencia = await obtenerReferenciaAsistentes();
      break;
    case "emprendimientos":
      referencia = await obtenerReferenciaEmprendimientos();
      break;
    case "logisticos":
      referencia = await obtenerReferenciaLogisticos();
      break;
    case "micAbierto":
      referencia = await obtenerReferenciaMicAbierto();
      break;
    case "global":
    default:
      referencia = await obtenerReferenciaGlobalIncremental();
      break;
  }
  res.json({ referencia });
});

app.post("/registrar-boleta", async (req, res) => {
  try {
    const nuevaBoleta = req.body;
    nuevaBoleta.id = Date.now().toString();
    if (!nuevaBoleta.referencia) {
      return res.status(400).json({ error: "Falta el campo referencia" });
    }
    await db.collection("boletas").doc(String(nuevaBoleta.referencia)).set(nuevaBoleta);    
    res.status(200).json({ mensaje: "boleta registrada con éxito", id: nuevaBoleta.referencia });
  } catch (error) {
    console.error("Error guardando boleta:", error);
    res.status(500).json({ error: "Error al registrar boleta" });
  }
});

app.post("/registrar-logistico", async (req, res) => {
  try {
    const nuevoLogistico = req.body;
    nuevoLogistico.id = Date.now().toString();
    await db.collection("logisticos").doc(String(nuevoLogistico.referencia)).set(nuevoLogistico);
    res.status(200).json({ mensaje: "Logistico registrada con éxito", id: nuevoLogistico.referencia });
  } catch (error) {
    console.error("Error guardando Logistico:", error);
    res.status(500).json({ error: "Error al registrar Logistico" });
  }
});

app.post("/registrar-artista", async (req, res) => {
  try {
    const nuevoArtista = req.body;
    nuevoArtista.id = Date.now().toString();
    await db.collection("artistas").add(nuevoArtista);
    res.status(200).json({ mensaje: "Artista registrada con éxito", id: nuevoArtista.id });
  } catch (error) {
    console.error("Error guardando Artista:", error);
    res.status(500).json({ error: "Error al registrar Artista" });
  }
});

app.post("/registrar-emprendimiento", async (req, res) => {
  try {
    const nuevoEmprendimiento = req.body;
    nuevoEmprendimiento.id = Date.now().toString();
    await db.collection("emprendimientos").doc(String(nuevoEmprendimiento.referencia)).set(nuevoEmprendimiento);
    res.status(200).json({ mensaje: "Emprendimiento registrada con éxito", id: nuevoEmprendimiento.referencia });
  } catch (error) {
    console.error("Error guardando Emprendimiento:", error);
    res.status(500).json({ error: "Error al registrar Emprendimiento" });
  }
});

app.post("/registrar-microfono-abierto", async (req, res) => {
  try {
    const nuevoArtista = req.body;
    nuevoArtista.id = Date.now().toString();
    await db.collection("micAbierto").doc(String(nuevoArtista.id)).set(nuevoArtista);
    res.status(200).json({ mensaje: "Micrófono Abierto registrada con éxito", id: nuevoArtista.referencia });

  } catch (error) {
    console.error("Error guardando Micrófono Abierto:", error);
    res.status(500).json({ error: "Error al registrar Micrófono Abierto" });
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

app.post("/enviar-mensaje-boleta-greenapi", async (req, res) => {
  try {
    let { urlFile, fileName, caption, numero } = req.body;
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

app.post("/actualizar-envio-whatsapp", async (req, res) => {
  try {
    const { referencia, envioWhatsapp, historialEnvio } = req.body;
    if (!referencia) {
      return res.status(400).json({ error: "referencia requerida" });
    }
    const snapshot = await db.collection("boletas").where("referencia", "==", referencia).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontró la boleta con esa referencia" });
    }
    const batch = db.batch();
    snapshot.forEach(doc => {
      const updateData = { envioWhatsapp };
      if (historialEnvio) {
        batch.update(doc.ref, {
          ...updateData,
          historialEnvio: admin.firestore.FieldValue.arrayUnion(historialEnvio)
        });
      } else {
        batch.update(doc.ref, updateData);
      }
    });
    await batch.commit();
    res.status(200).json({ mensaje: "envioWhatsapp actualizado" });
  } catch (error) {
    console.error("Error actualizando envioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/actualizar-envio-whatsapp-logistica", async (req, res) => {
  try {
    const { referencia, envioWhatsapp, historialEnvio } = req.body;
    if (!referencia) {
      return res.status(400).json({ error: "referencia requerida" });
    }
    const snapshot = await db.collection("logisticos").where("referencia", "==", referencia).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontró la boleta con esa referencia" });
    }
    const batch = db.batch();
    snapshot.forEach(doc => {
      const updateData = { envioWhatsapp };
      if (historialEnvio) {
        batch.update(doc.ref, {
          ...updateData,
          historialEnvio: admin.firestore.FieldValue.arrayUnion(historialEnvio)
        });
      } else {
        batch.update(doc.ref, updateData);
      }
    });
    await batch.commit();
    res.status(200).json({ mensaje: "envioWhatsapp actualizado" });
  } catch (error) {
    console.error("Error actualizando envioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/actualizar-emprendimientos-envio-whatsapp", async (req, res) => {
  try {
    const { referencia, envioWhatsapp, historialEnvio } = req.body;
    if (!referencia) {
      return res.status(400).json({ error: "referencia requerida" });
    }
    const snapshot = await db.collection("emprendimientos").where("referencia", "==", referencia).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontró el emprendimiento con esa referencia" });
    }
    const batch = db.batch();
    snapshot.forEach(doc => {
      const updateData = { envioWhatsapp };
      if (historialEnvio) {
        batch.update(doc.ref, {
          ...updateData,
          historialEnvio: admin.firestore.FieldValue.arrayUnion(historialEnvio)
        });
      } else {
        batch.update(doc.ref, updateData);
      }
    });
    await batch.commit();
    res.status(200).json({ mensaje: "envioWhatsapp actualizado" });
  } catch (error) {
    console.error("Error actualizando envioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/actualizar-microfono-abierto-envio-whatsapp", async (req, res) => {
  try {
    const { referencia, envioWhatsapp, historialEnvio } = req.body;
    if (!referencia) {
      return res.status(400).json({ error: "referencia requerida" });
    }
    const snapshot = await db.collection("micAbierto").where("referencia", "==", referencia).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontró el micrófono abierto con esa referencia" });
    }
    const batch = db.batch();
    snapshot.forEach(doc => {
      const updateData = { envioWhatsapp };
      if (historialEnvio) {
        batch.update(doc.ref, {
          ...updateData,
          historialEnvio: admin.firestore.FieldValue.arrayUnion(historialEnvio)
        });
      } else {
        batch.update(doc.ref, updateData);
      }
    });
    await batch.commit();
    res.status(200).json({ mensaje: "envioWhatsapp actualizado" });
  } catch (error) {
    console.error("Error actualizando envioWhatsapp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});