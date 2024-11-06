import express from "express";
import cors from "cors";
import keyConfig from "./mockServer/mockdata/keyConfig.mjs";
import systems from "./mockServer/mockdata/systems.mjs";

const app = express();
app.use(cors());

app.get("/api/v1/keyConfig", (req, res) => {
    res.json(keyConfig());
});

app.get("/api/v1/systems", (req, res) => {
    res.json(systems());
});

app.listen(3000, () => console.log("API Server running..."));