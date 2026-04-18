import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

const getPrompt = (modo = "examen", texto = "") => {
  const promptExamen = `Actúa como profesor de Lengua en ${nivel} en España.

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
- Errores:
  1. ...
  2. ...
- Nota: X.X / 10

Pregunta 2:
- Respuesta del alumno: ...
- Corrección: ...
- Errores:
  1. ...
  2. ...
- Nota: X.X / 10

Nota final: X.X / 10

Comentario del profesor:
Explicación clara, breve y útil para mejorar.

REGLAS:
- No inventes contenido
- Sé justo como un profesor real
- Usa lenguaje claro y profesional
- Si una respuesta está incompleta, indícalo
- Incluye al final:
  Cómo mejorar:
  - 2 consejos concretos
  - 1 error clave a evitar`;

  const promptSintaxis = `Actúa como profesor experto de Lengua Castellana en España, especializado en análisis sintáctico.

Corrige un examen de sintaxis con rigor académico.

OBJETIVO:
Evaluar y corregir análisis sintácticos realizados por un alumno.

CRITERIOS DE CORRECCIÓN:
- identificación correcta del sujeto
- tipo de predicado
- núcleos
- complementos (CD, CI, CC, atributo, CRV, etc.)
- precisión terminológica
- análisis completo y ordenado

INSTRUCCIONES:
1. Detecta automáticamente cada oración del examen
2. Identifica la respuesta del alumno
3. Corrige el análisis sintáctico de forma completa
4. Señala errores concretos
5. Explica por qué está mal y cuál es la opción correcta
6. Proporciona el análisis correcto
7. Da una nota por pregunta
8. Calcula una NOTA FINAL sobre 10

Corrige este examen:

${texto}

Incluye al final:
Cómo mejorar:
- 2 consejos concretos
- 1 error clave a evitar`;

  const promptSintaxisVisual = `Actúa como profesor experto de Lengua Castellana en España, especializado en análisis sintáctico.

El alumno ha realizado un análisis sintáctico en formato visual: cajones, esquemas, bloques o etiquetas.

TU TAREA:
1. Interpreta el esquema del alumno
2. Reconstruye la estructura sintáctica
3. Identifica la función asignada a cada elemento
4. Comprueba si es correcta
5. Detecta errores de clasificación o relación
6. Explica los errores con claridad
7. Proporciona el análisis correcto completo

IMPORTANTE:
- No te limites al texto literal: interpreta la estructura
- Si algo es ambiguo, indícalo
- Si el esquema es incompleto o confuso, corrige solo lo que pueda inferirse con seguridad
- Corrige como un profesor de secundaria en España
- Si es posible, representa el análisis correcto en forma de esquema textual claro, por niveles

FORMATO:
INFORME DE SINTAXIS VISUAL

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
${texto}

Incluye al final:
Cómo mejorar:
- 2 consejos concretos
- 1 error clave a evitar`;

  if (modo === "sintaxis") return promptSintaxis;
  if (modo === "sintaxis_visual") return promptSintaxisVisual;
  return promptExamen;
};

const callOpenAIText = async (prompt) => {
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

  if (!response.ok) {
    throw new Error(data?.error?.message || "Error al contactar con OpenAI");
  }

  return data.choices?.[0]?.message?.content || "Sin respuesta";
};

app.post("/corregir", async (req, res) => {
  try {
    const { texto, modo } = req.body;

    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: "No se ha recibido texto para corregir" });
    }

    const prompt = getPrompt(modo, texto);
    const resultado = await callOpenAIText(prompt);

    res.json({ resultado });
  } catch (error) {
    console.error("ERROR /corregir:", error);
    res.status(500).json({ error: error.message || "Error en el servidor" });
  }
});

app.post("/matizar", async (req, res) => {
  try {
    const { texto, resultado, comentario } = req.body;

    if (!texto || !resultado || !comentario) {
      return res.status(400).json({ error: "Faltan datos para matizar la corrección" });
    }

    const prompt = `Actúa como profesor de Lengua Castellana en España.

Has corregido previamente este examen:

${resultado}

Texto original del alumno:
${texto}

El profesor o alumno añade esta revisión:
"${comentario}"

Tu tarea:
- reconsiderar la corrección
- ajustar la nota si procede
- explicar claramente el cambio
- mantener criterio académico

Devuelve la corrección actualizada completa.`;

    const nuevoResultado = await callOpenAIText(prompt);

    res.json({
      resultado: nuevoResultado
    });
  } catch (error) {
    console.error("ERROR /matizar:", error);
    res.status(500).json({ error: error.message || "Error en matización" });
  }
});

app.post("/imagen", upload.single("imagen"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ninguna imagen" });
    }

    const modo = req.body?.modo || "examen";
    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    const prompt = `Extrae TODO el texto de esta imagen y después corrígelo en modo ${modo}.

Si el modo es "sintaxis", corrige análisis sintáctico.
Si el modo es "sintaxis_visual", interpreta cajones, esquemas o bloques.
Si el modo es "examen", corrige por preguntas y puntúa.

Debes:
1. Transcribir primero el contenido
2. Corregir según el modo indicado
3. Poner nota
4. Explicar errores con claridad`;

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
                text: prompt
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

    if (!response.ok) {
      throw new Error(data?.error?.message || "Error al procesar la imagen con OpenAI");
    }

    res.json({
      resultado: data.choices?.[0]?.message?.content || "Sin respuesta"
    });
  } catch (error) {
    console.error("ERROR /imagen:", error);
    res.status(500).json({ error: error.message || "Error procesando imagen" });
  }
});

app.post("/pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún PDF" });
    }

    const modo = req.body?.modo || "examen";
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const texto = pdfData.text?.trim();

    if (!texto) {
      return res.status(400).json({ error: "No se ha podido extraer texto del PDF" });
    }

    const prompt = getPrompt(modo, texto);
    const resultado = await callOpenAIText(prompt);

    res.json({ resultado });
  } catch (error) {
    console.error("ERROR /pdf:", error);
    res.status(500).json({ error: error.message || "Error procesando PDF" });
  }
});

app.post("/audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún audio" });
    }

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

    if (!transcriptionRes.ok) {
      throw new Error(transcriptionData?.error?.message || "Error al transcribir el audio");
    }

    const texto = transcriptionData.text || "";

    const prompt = `Actúa como profesor de Lengua Castellana en España.

Has recibido una transcripción de una respuesta oral de un alumno.

Tu tarea es:
1. corregir la expresión oral
2. señalar errores de contenido, gramática y claridad
3. valorar si la respuesta está bien estructurada
4. poner una nota sobre 10
5. dar una explicación breve y pedagógica

Transcripción del alumno:
${texto}`;

    const resultadoCorreccion = await callOpenAIText(prompt);

    res.json({
      resultado: `Transcripción:\n${texto}\n\n${resultadoCorreccion}`
    });
  } catch (error) {
    console.error("ERROR /audio:", error);
    res.status(500).json({ error: error.message || "Error procesando audio" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
