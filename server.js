const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public")); // donde está tu ventaBoleteria.html

app.post("/registrar-boleta", (req, res) => {
  const nuevaBoleta = req.body;

  const filePath = path.join(__dirname, "public","data", "boletas.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  nuevaBoleta.id = Date.now().toString(); // ID único
  data.Asistentes.push(nuevaBoleta);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(200).json({ mensaje: "Boleta registrada con éxito" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});