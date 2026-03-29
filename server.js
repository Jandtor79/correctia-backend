import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

app.listen(3000, () => {
  console.log("Servidor activo en puerto 3000");
});
