import express from "express";
import cors from "cors";
import keyConfig from "./mockServer/mockdata/keyConfig.mjs";
import systems from "./mockServer/mockdata/systems.mjs";
import groups from "./mockServer/mockdata/groups.mjs";
import user from "./mockServer/mockdata/user.mjs";

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/api/v1/keyConfig", (req, res) => {
    req.body.id = "b40218e3-be88-5eed-9f59-b2066938e2fa";
    res.status(201).json(req.body);
});

app.get("/api/v1/systems", (req, res) => {
    res.json(systems());
});

app.get("/api/v1/groups", (req, res) => {
    res.json(groups());
});

app.get("/api/v1/user/:id?", (req, res) => {
    const { id } = req.params;
    res.json(user(id));
});

app.listen(3000, () => console.log("API Server running..."));