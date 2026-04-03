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
       
content: `Actúa como un profesor de lengua castellana en España.

Tu tarea es corregir un texto como lo haría un docente profesional.

IMPORTANTE:
- La respuesta debe ser clara, ordenada y fácil de leer
- No uses código, ni símbolos técnicos, ni HTML visible
- Escribe como si fuera un informe para un alumno

PASOS:

1. Analiza el texto
2. Decide si es evaluable o no

SI NO ES EVALUABLE:
- Indica: "Texto no evaluable"
- Explica por qué
- No inventes correcciones

SI ES EVALUABLE:

Devuelve SIEMPRE este formato:

📘 INFORME DE CORRECCIÓN

📝 Texto original:
${texto}

❌ Errores detectados:
1. Error → Corrección
2. Error → Corrección

📊 Nota final: X.X / 10

🧠 Explicación:
1. Explicación clara
2. Explicación clara

REGLAS:
- La nota puede tener un decimal (ej: 6.5)
- No inventes errores
- No separes letras
- No uses símbolos extraños
- Sé claro y profesional`

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
