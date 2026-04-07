import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

const app = express();

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// CORREGIR TEXTO
app.post("/corregir", async (req, res) => {
  try {
    const { texto, modo } = req.body;

const promptGeneral = `Actúa como profesor de Lengua Castellana en España.

Corrige el siguiente texto o examen:

${texto}`;

const promptSintaxis = `Actúa como profesor experto de Lengua Castellana en España, especializado en análisis sintáctico.

Corrige un examen de sintaxis con rigor académico.

OBJETIVO:
Evaluar y corregir análisis sintácticos realizados por un alumno.

INSTRUCCIONES:
1. Detecta automáticamente cada oración del examen
2. Identifica la respuesta del alumno
3. Corrige el análisis sintáctico de forma completa
4. Señala errores concretos
5. Explica por qué está mal y cuál es la opción correcta
6. Proporciona el análisis correcto
7. Da una nota por pregunta
8. Calcula una NOTA FINAL sobre 10

Si la respuesta del alumno presenta la sintaxis en esquema, en cajones, por bloques o con etiquetas visuales, interpreta esa estructura antes de corregir.

Debes:
- reconstruir la organización del análisis
- identificar qué función sintáctica asigna el alumno a cada bloque
- comprobar si cada bloque está bien clasificado
- corregir con precisión
- explicar claramente los errores
- ofrecer el análisis correcto final de forma ordenada

Si el esquema es incompleto, confuso o ilegible, indícalo expresamente y corrige solo lo que pueda inferirse con seguridad.

Corrige este examen:

${texto}`;

const promptSintaxisVisual = `Actúa como profesor experto de Lengua Castellana en España, especializado en análisis sintáctico.

El alumno ha realizado un análisis sintáctico en formato visual (cajones, esquemas, bloques o etiquetas).

TU TAREA:
1. Interpreta el esquema del alumno
2. Reconstruye mentalmente la estructura sintáctica
3. Identifica qué función ha asignado a cada elemento
4. Comprueba si es correcto
5. Detecta errores de clasificación o relación
6. Explica los errores de forma clara
7. Proporciona el análisis correcto completo

IMPORTANTE:
- No te limites al texto literal: interpreta la estructura
- Si algo es ambiguo, indícalo
- Corrige como un profesor de secundaria en España

FORMATO:
INFORME DE SINTAXIS (ESQUEMA)

Interpretación del análisis del alumno:
...

Errores detectados:
...

Corrección:
...

Nota: X.X / 10

Explicación:
...

Texto del alumno:
${texto}`;

const promptRedaccion = `Actúa como profesor de Lengua Castellana en España.

Corrige una redacción de alumno.

Debes:
- corregir ortografía, gramática y expresión
- señalar errores importantes
- proponer mejoras de estilo
- poner una nota final sobre 10
- explicar cómo mejorar

Texto:

${texto}`;

const promptComentario = `Actúa como profesor de Lengua Castellana en España.

Corrige un comentario de texto.

Debes:
- valorar comprensión
- valorar estructura
- valorar expresión escrita
- señalar errores
- poner nota final sobre 10
- dar orientación para mejorar

Texto del alumno:

${texto}`;

const promptExamen = `Actúa como profesor de Lengua Castellana en España.

Evalúa un examen completo.

TAREAS:
1. Detecta automáticamente cada pregunta
2. Identifica la respuesta del alumno
3. Corrige cada respuesta
4. Da una puntuación por pregunta
5. Calcula una NOTA FINAL sobre 10
6. Explica los errores de forma clara y pedagógica

FORMATO:

INFORME DE EVALUACIÓN

Respuestas del alumno:
${texto}

Evaluación por preguntas:

Pregunta 1:
- Respuesta del alumno: ...
- Corrección: ...
- Nota: X.X / 10

Pregunta 2:
- Respuesta del alumno: ...
- Corrección: ...
- Nota: X.X / 10

Nota final: X.X / 10

Comentario del profesor:
Explicación clara, breve y útil para mejorar.

REGLAS:
- No inventes contenido
- Sé justo como un profesor real
- Usa lenguaje claro y profesional
- Si falta información, indícalo`;

let prompt = promptGeneral;

    if (modo === "sintaxis") prompt = promptSintaxis;
    if (modo === "redaccion") prompt = promptRedaccion;
    if (modo === "comentario") prompt = promptComentario;
    if (modo === "examen") prompt = promptExamen;
    if (modo === "sintaxis_visual") prompt = promptSintaxisVisual;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("ERROR OPENAI:", data.error);
      return res.json({
        resultado: "Error OpenAI: " + data.error.message
      });
    }

    res.json({
      resultado: data.choices?.[0]?.message?.content || "OpenAI no devolvió contenido"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// IMAGEN
app.post("/imagen", upload.single("imagen"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

// PDF
app.post("/pdf", upload.single("pdf"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const texto = pdfData.text;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Actúa como profesor de Lengua Castellana en España.

Corrige este examen extraído de un PDF.

Texto del examen:
${texto}`;
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
    res.status(500).json({ error: "Error procesando PDF" });
  }
});

// AUDIO
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
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const transcriptionData = await transcriptionRes.json();
    const texto = transcriptionData.text;

    const correctionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Corrige esta expresión oral, da feedback y nota:

${texto}`;
          }
        ]
      })
    });

    const correctionData = await correctionRes.json();

    res.json({
      resultado: `Transcripción:\n${texto}\n\n${correctionData.choices?.[0]?.message?.content || ""}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando audio" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
