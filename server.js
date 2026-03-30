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
app.post("/imagen", upload.single("imagen"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

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
            content: [
              { type: "text", text: "Corrige este examen de lengua y analiza la sintaxis si aparece." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      resultado: data.choices?.[0]?.message?.content || "Sin respuesta"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando imagen" });
  }
});
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
app.post("/audio", upload.single("audio"), async (req, res) => {
  try {
    const fs = await import("fs");
    const path = req.file.path;

    // 🧠 1. TRANSCRIPCIÓN (Whisper)
    const transcriptionRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: (() => {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(path));
        formData.append("model", "whisper-1");
        return formData;
      })()
    });

    const transcriptionData = await transcriptionRes.json();
    const texto = transcriptionData.text;

    // 🧠 2. CORRECCIÓN
    const correctionRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `Corrige esta expresión oral de un alumno, da feedback y nota:\n\n${texto}`
          }
        ]
      })
    });

    const correctionData = await correctionRes.json();

    res.json({
      resultado: `🗣 Transcripción:\n${texto}\n\n${correctionData.choices?.[0]?.message?.content}`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando audio" });
  }
});
app.listen(3000, () => {
  console.log("Servidor activo");
});
