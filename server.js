const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();


app.use(bodyParser.json());
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


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});