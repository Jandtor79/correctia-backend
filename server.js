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
       
content: `Actúa como profesor de Lengua Castellana en España.

Evalúa un examen completo.

TAREAS:
1. Detecta automáticamente cada pregunta
2. Identifica la respuesta del alumno
3. Corrige cada respuesta
4. Da una puntuación por pregunta (puede tener decimal)
5. Calcula una NOTA FINAL sobre 10
6. Explica los errores de forma clara y pedagógica

FORMATO:

📘 INFORME DE EVALUACIÓN

📝 Respuestas del alumno:
${texto}

---

📊 Evaluación por preguntas:

Pregunta 1:
- Respuesta del alumno: ...
- Corrección: ...
- Nota: X.X / 10

Pregunta 2:
- Respuesta del alumno: ...
- Corrección: ...
- Nota: X.X / 10

---

📊 Nota final: X.X / 10

---

🧠 Comentario del profesor:
Explicación clara, breve y útil para mejorar.

REGLAS:
- No inventes contenido
- Sé justo como un profesor real
- Usa lenguaje claro y profesional
- Si falta información, indícalo`


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
              { type: "text", text: `Extrae TODO el texto de este examen y después corrígelo.

INSTRUCCIONES:
1. Transcribe primero el contenido
2. Después corrige por preguntas
3. Pon nota por pregunta
4. Nota final sobre 10

Formato claro y estructurado`
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
