const express = require("express");
const { Storage } = require("@google-cloud/storage");
const XLSX = require("xlsx");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.post("/procesar-excel", async (req, res) => {
  const fileUrl = req.body.fileUrl; // URL del archivo en Firebase Storage

  try {
    // Descargar el archivo desde Firebase Storage
    const bucket = storage.bucket("your-firebase-storage-bucket-name");
    const file = bucket.file(fileUrl);
    const [contents] = await file.download();

    // Convertir el Excel a JSON
    const workbook = XLSX.read(contents, { type: "buffer" });
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let viajes = {};
    sheet.forEach((row) => {
      const numeroViaje = String(row["Número de Viaje"]);
      if (!viajes[numeroViaje]) {
        viajes[numeroViaje] = {
          cliente: row["Cliente"],
          numero_viaje: numeroViaje,
          modelo: row["Modelo"],
          buque: row["Buque"],
          fecha_viaje: row["Fecha del Viaje"],
          estatus: row["Estatus"],
          vin_list: [],
        };
      }
      viajes[numeroViaje].vin_list.push(row["VIN"]);
    });

    // Guardar los datos en Firestore
    const batch = db.batch();
    Object.keys(viajes).forEach((viajeId) => {
      const viajeRef = db.collection("viajes").doc();
      batch.set(viajeRef, viajes[viajeId]);
    });

    await batch.commit();

    res.status(200).send("Datos procesados y guardados exitosamente.");
  } catch (error) {
    console.error("Error procesando el archivo:", error);
    res.status(500).send("Hubo un error procesando el archivo.");
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
