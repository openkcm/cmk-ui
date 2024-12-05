import express from "express";
import cors from "cors";
import keyConfig from "./mockServer/mockdata/keyConfig.mjs";
import systems from "./mockServer/mockdata/systems.mjs";
import groups from "./mockServer/mockdata/groups.mjs";
import user from "./mockServer/mockdata/user.mjs";
import keys from "./mockServer/mockdata/keys.mjs";
import keyVersions from "./mockServer/mockdata/keyVersions.mjs";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/keyConfig/:id?", (req, res) => {
    const { id } = req.params;
    res.json(keyConfig(id));
});

app.put("/api/v1/keyConfig/:id/primaryKey", (req, res) => {
    res.status(204).json(keys());
});

app.patch("/api/v1/keyConfig", (req, res) => {
    const newConfig = req.body;
    res.status(200).json(newConfig);
});

app.post("/api/v1/keys", (req, res) => {
    const newKey = req.body;
    res.status(201).json(newKey);
});

app.get("/api/v1/keys/:id?", (req, res) => {
    const { id } = req.params;
    res.json(keys(id));
});

app.delete("/api/v1/keys/:id", (req, res) => {
    res.status(204).json({});
});

app.patch("/api/v1/keys/:id", (req, res) => {
    const { id } = req.params;
    res.status(200).json(keys(id));
});

app.get("/api/v1/keys/:id/versions", (req, res) => {
    const { keyID } = req.params;
    res.json(keyVersions(keyID));
});

app.get("/api/v1/systems/:systemID?/:keyConfigurationID?", (req, res) => {
    const { systemID, keyConfigurationID } = req.query;
    res.json(systems(systemID, keyConfigurationID));
});

app.get("/api/v1/groups", (req, res) => {
    res.json(groups());
});

app.get("/api/v1/user/:id?", (req, res) => {
    const { id } = req.params;
    res.json(user(id));
});

app.listen(3000, () => console.log("API Server running..."));