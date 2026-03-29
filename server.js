import multer from "multer";
import fs from "fs";

const upload = multer({ dest: "uploads/" });
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Ruta base
app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// 🔥 ESTA ES LA CLAVE
app.post("/corregir", async (req, res) => {
  const { texto } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Corrige esta redacción como profesor de lengua en España. Da nota del 0 al 10 y explica errores:\n\n${texto}`
          }
        ]
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.listen(3000, () => {
  console.log("Servidor activo");
});
