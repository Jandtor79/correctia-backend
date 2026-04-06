import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

const subirPDF = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);

  setLoading(true);

  try {
    const res = await fetch("https://correctia-backend-production.up.railway.app/pdf", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    setResultado(data.resultado || "");
  } catch {
    setResultado("Error PDF");
  }

  setLoading(false);
};

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
              {
                type: "text",
                text: `Extrae TODO el texto de este examen y después corrígelo.

INSTRUCCIONES:
1. Transcribe primero el contenido
2. Después corrige por preguntas
3. Pon nota por pregunta
4. Nota final sobre 10

Formato claro y estructurado`
              },
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

Y además, borra esto del backend si todavía lo tienes arriba del archivo, porque eso es código de frontend y no debe estar en server.js:

const subirPDF = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);

  setLoading(true);

  try {
    const res = await fetch("https://correctia-backend-production.up.railway.app/pdf", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    setResultado(data.resultado || "");
  } catch {
    setResultado("Error PDF");
  }

  setLoading(false);
};

La causa exacta era esta estructura mal cerrada dentro de content:

content: [
  { ... }
  }   // sobra una llave
]

Después de pegar el bloque correcto:

guarda en GitHub
redeploy en Railway
prueba otra vez

Si quieres, te pego también el server.js completo ya limpio.

acepta un decimal

Perfecto 👍 vamos a dejar eso fino.

🎯 OBJETIVO

👉 Que la nota acepte decimales:

Ejemplos válidos:

7/10
6.5/10
8.75/10
🔧 1. FRONTEND (MUY IMPORTANTE)

Ahora tienes esto:

const match = contenido.match(/(\d+)\/10/);

👉 ❌ SOLO detecta enteros

✅ CAMBIA POR ESTO
const match = contenido.match(/(\d+(\.\d+)?)\/10/);
🧠 QUÉ HACE
\d+ → número entero
(\.\d+)? → decimal opcional

👉 Resultado:
✔ 7
✔ 7.5
✔ 7.25

🔧 2. BACKEND (PROMPT)

Ya casi lo tienes bien, pero asegúrate de incluir esto claramente:

La nota puede incluir decimales (por ejemplo 6.5/10)
🔧 3. PDF (OPCIONAL)

No hace falta cambiar nada si ya usas:

doc.text(`Nota final: ${nota}/10`, ...)

👉 ya mostrará decimales automáticamente

💥 RESULTADO

Antes:

7/10

Ahora:

6.5/10
7.25/10
🚀 EXTRA PRO (RECOMENDADO)

Si quieres que SIEMPRE tenga un decimal:

const notaFormateada = parseFloat(nota).toFixed(1);

👉 Ejemplo:

7 → 7.0
6.5 → 6.5
💬 SIGUIENTE NIVEL

Si quieres subir mucho el nivel:

👉 dime “nota por criterios”

y te hago:

🔥 desglose:

ortografía: 2.5
gramática: 3.0
coherencia: 2.0

👉 eso ya es nivel evaluación real de profesor 💥

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
