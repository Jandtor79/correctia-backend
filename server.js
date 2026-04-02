import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ✅ Ruta base
app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// 🔵 CORREGIR TEXTO
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
        Actúa como profesor de lengua en España.

Corrige este examen de forma estructurada, clara y visual.

INSTRUCCIONES:
1. Detecta automáticamente cada pregunta
2. Corrige cada respuesta
3. Da una nota sobre 10 por pregunta
4. Calcula una NOTA FINAL
5. Explica los errores de forma pedagógica

FORMATO OBLIGATORIO EN HTML:

- Usa <p> para separar bloques
- Usa <strong> para títulos
- Usa <span style="color:red"> para errores
- Usa <span style="color:green"> para correcciones

EXPLICACIÓN DE ERRORES (MUY IMPORTANTE):

- Haz una lista numerada
- Cada error en un punto separado
- Explicación clara y breve (como profesor)
- Sin símbolos markdown (no usar ### ni **)

FORMATO:

<p><strong>Explicación de errores:</strong></p>

<ol>
<li><strong>Ortografía:</strong> Explicación clara del error</li>
<li><strong>Gramática:</strong> Explicación clara del error</li>
<li><strong>Acentuación:</strong> Explicación clara del error</li>
</ol>

Devuelve SOLO HTML limpio, sin texto fuera del formato.

Corrige este texto:

${texto}`
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
  console.error("❌ ERROR OPENAI:", data.error);
  return res.json({ resultado: "❌ Error OpenAI: " + data.error.message });
}

res.json({
  resultado: data.choices?.[0]?.message?.content || "⚠️ OpenAI no devolvió contenido"
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

    const FormData = (await import("form-data")).default;
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
const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
