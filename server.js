app.set("trust proxy", 1);
import FormData from "form-data";
import multer from "multer";
import fs from "fs";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Ruta base
app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// 🔵 CORREGIR TEXTO (con nota por preguntas)
app.post("/corregir", async (req, res) => {
  try {
    const { texto } = req.body;

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
            content: `Actúa como profesor de lengua en España.

Corrige este examen de forma estructurada y VISUAL.

INSTRUCCIONES:
1. Detecta automáticamente cada pregunta
2. Corrige cada respuesta
3. Da una nota sobre 10 por pregunta
4. Calcula una NOTA FINAL
5. Explica los errores de forma clara

FORMATO OBLIGATORIO EN HTML:

- Usa <p> para separar cada bloque
- Usa <strong> para títulos
- Usa <span style="color:red"> para errores
- Usa <span style="color:green"> para correcciones

EJEMPLO DE FORMATO:

<p><strong>Pregunta 1</strong></p>
<p>Respuesta: ...</p>
<p>Error: <span style="color:red">comio</span> → <span style="color:green">comió</span></p>
<p>Nota: 7/10</p>

<p><strong>NOTA FINAL: 7/10</strong></p>

<p><strong>Comentario:</strong> Explicación clara para el alumno</p>

Corrige este texto:

${texto}`
          }
        ]
      })
    });

    const data = await response.json();
    console.log("OPENAI RESPONSE:", data);
   res.json({
  resultado: data.choices?.[0]?.message?.content || "Sin respuesta"
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🖼️ IMAGEN
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
              { type: "text", text: "Corrige este examen por preguntas y pon nota." },
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

// 🎤 AUDIO
app.post("/audio", upload.single("audio"), async (req, res) => {
  try {
    const path = req.file.path;

    // 🧠 Transcripción
    const formData = new FormData();
    formData.append("file", fs.createReadStream(path));
    formData.append("model", "whisper-1");

    const transcriptionRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const transcriptionData = await transcriptionRes.json();
    const texto = transcriptionData.text;

    // 🧠 Corrección
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
            content: `Corrige esta expresión oral, da feedback y nota:\n\n${texto}`
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

// 🚀 ARRANQUE
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
