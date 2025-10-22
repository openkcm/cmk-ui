import express from "express";
import cors from "cors";
import keyConfig from "./mockServer/mockdata/keyConfig.mjs";
import systems from "./mockServer/mockdata/systems.mjs";
import groups from "./mockServer/mockdata/groups.mjs";
import user from "./mockServer/mockdata/user.mjs";
import keys from "./mockServer/mockdata/keys.mjs";
import keyVersions from "./mockServer/mockdata/keyVersions.mjs";
import tags from "./mockServer/mockdata/tags.mjs";
import workflows from "./mockServer/mockdata/tasks.mjs";
import approvers from "./mockServer/mockdata/approvers.mjs";
import managementAndCryptoCerts from "./mockServer/mockdata/managementAndCryptoCerts.mjs";
import generateKeyStores from "./mockServer/mockdata/keyStores.mjs";
import genereateTenants from "./mockServer/mockdata/tenants.mjs";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/cmk/v1/sys/tenants", (req, res) => {
    res.json(genereateTenants());
});

app.post("/cmk/v1/tenant1-id/keyConfigurations", (req, res) => {
    const newKeyConfig = { ...req.body, id: "config-" + Math.floor(Math.random() * 10000) };
    res.status(201).json(newKeyConfig);
});

app.get("/cmk/v1/tenant1-id/keyConfigurations/:id?", (req, res) => {
    const { id } = req.params;
    res.json(keyConfig(id));
});

app.get("/cmk/v1/tenant1-id/keyConfigurations/:id/tags", (req, res) => {
    const { id } = req.params;
    res.json(tags(id));
});

app.put("/cmk/v1/tenant1-id/keyConfigurations/:id/tags", (req, res) => {
    const { id } = req.params;
    res.status(204).json(tags(id));
});

app.put("/cmk/v1/tenant1-id/keyConfig/:id/primaryKey", (req, res) => {
    res.status(204).json(keys());
});

app.patch("/cmk/v1/tenant1-id/keyConfigurations/:id", (req, res) => {
    const newConfig = req.body;
    res.status(200).json(newConfig);
});

app.post("/cmk/v1/tenant1-id/keys", (req, res) => {
    const newKey = req.body;
    res.status(201).json(newKey);
});

app.get("/cmk/v1/tenant1-id/keys/:id?", (req, res) => {
    const { id } = req.params;
    res.json(keys(id));
});

app.delete("/cmk/v1/tenant1-id/keys/:id", (req, res) => {
    res.status(204).json({});
});

app.patch("/cmk/v1/tenant1-id/keys/:id", (req, res) => {
    const { id } = req.params;
    res.status(200).json(keys(id));
});

app.get("/cmk/v1/tenant1-id/keys/:id/versions", (req, res) => {
    const { keyID } = req.params;
    res.json(keyVersions(keyID));
});

app.post("/cmk/v1/tenant1-id/keys/:id/versions", (req, res) => {
    res.status(200).json({});
});

app.patch("/cmk/v1/tenant1-id/keys/:id/versions/:id", (req, res) => {
    res.status(200).json({});
});

app.get("/cmk/v1/tenant1-id/systems/:systemId?/:keyConfigurationID?", (req, res) => {
    const { systemId, keyConfigurationID } = req.query;
    res.json(systems(systemId, keyConfigurationID));
});

app.patch("/cmk/v1/tenant1-id/systems/:systemId?/link/", (req, res) => {
    const { systemId, keyConfigurationID } = req.query;
    res.json(systems(systemId, keyConfigurationID));
});

app.delete("/cmk/v1/tenant1-id/systems/:systemId?/link/", (req, res) => {
    const { systemId, keyConfigurationID } = req.query;
    res.json(systems(systemId, keyConfigurationID));
});

app.get("/cmk/v1/tenant1-id/groups", (req, res) => {
    res.json(groups());
});

app.get("/cmk/v1/tenant1-id/user/:id?", (req, res) => {
    const { id } = req.params;
    res.json(user(id));
});

app.get("/cmk/v1/tenant1-id/workflows/:taskId?", (req, res) => {
    const { taskId } = req.params;
    res.json(workflows(taskId));
});

app.get("/cmk/v1/tenant1-id/workflows/:taskId/approvers", (req, res) => {
    const { taskId } = req.params;
    res.json(approvers(taskId));
});

app.post("/cmk/v1/tenant1-id/workflows/:taskId/state", (req, res) => {
    const state = req.body;
    res.status(200).json(state);
});
app.get("/cmk/v1/tenant1-id/keyConfigurations/:keyConfigurationID/certificates", (req, res) => {
    const { keyConfigurationID } = req.params;
    res.json(managementAndCryptoCerts(keyConfigurationID));
});
app.get("/cmk/v1/tenant1-id/tenants/keystores", (req, res) => {
    res.json(generateKeyStores());
});


app.listen(3000, () => console.log("API Server running..."));