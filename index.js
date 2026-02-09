import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Backend działa. GitHub przeżył.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server działa");
});
