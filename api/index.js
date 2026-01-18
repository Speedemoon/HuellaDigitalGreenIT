// api/index.js
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// === "DB" simple en memoria (para demo). ===
// OJO: en Railway se reinicia si redeploy/restart.
let rows = [];
let id = 1;

// Health para probar rápido
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// GET historial
app.get("/api/calculations", (req, res) => {
  res.json(rows);
});

// POST guardar cálculo
app.post("/api/calculations", (req, res) => {
  const body = req.body || {};

  const row = {
    id: id++,
    created_at: new Date().toISOString(),

    // Inputs
    stream_video_hours_week: Number(body.stream_video_hours_week) || 0,
    gaming_hours_week: Number(body.gaming_hours_week) || 0,
    videocalls_hours_week: Number(body.videocalls_hours_week) || 0,
    social_hours_week: Number(body.social_hours_week) || 0,
    cloud_hours_week: Number(body.cloud_hours_week) || 0,

    // Config
    weeks_per_month: Number(body.weeks_per_month) || 4.345,
    co2_per_kwh: Number(body.co2_per_kwh) || 0.45,

    // Results
    total_kwh_month: Number(body.total_kwh_month) || 0,
    total_co2_month: Number(body.total_co2_month) || 0,
    level: body.level || "Bajo",
    top_contribution: body.top_contribution || "-",
  };

  rows.unshift(row); // newest first
  res.status(201).json(row);
});

// === Servir Angular (build) desde api/public ===
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// SPA fallback (IMPORTANTE: va AL FINAL para no romper /api)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
