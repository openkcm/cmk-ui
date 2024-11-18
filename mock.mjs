import express from "express";
import cors from "cors";
import keyConfig from "./mockServer/mockdata/keyConfig.mjs";
import systems from "./mockServer/mockdata/systems.mjs";

const app = express();
app.use(cors());

app.get("/api/v1/keyConfig", (req, res) => {
    res.json(keyConfig());
});

app.patch("/api/v1/keyConfig", (req, res) => {
    const newConfig = req.body;
    res.status(200).json(newConfig);
});

app.post("/api/v1/keys", (req, res) => {
    const newKey = req.body;
    res.status(201).json(newKey);
});

app.get("/api/v1/systems", (req, res) => {
    res.json(systems());
});

app.listen(3000, () => console.log("API Server running..."));