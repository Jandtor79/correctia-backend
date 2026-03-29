import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

let usos = {};

app.post("/corregir", async (req, res) => {
  const { texto, userId } = req.body;

  if (!usos[userId]) usos[userId] = 0;

  if (usos[userId] >= 5) {
    return res.json({ error: "Límite alcanzado. Pásate a PRO." });
  }

  usos[userId]++;

  const prompt = `
Eres profesor de lengua en España.

Corrige este texto y evalúa:
- Ortografía
- Gramática
- Coherencia

Da nota y consejos claros.

Texto:
${texto}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer TU_API_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  res.json(data);
});

app.listen(3000, () => console.log("Servidor activo"));
