/**
 * API - Huella Digital GreenIT
 * Express + MySQL
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();

// ====== CONFIG ======
const PORT = Number(process.env.PORT || 3001);

// Middleware
app.use(cors());
app.use(express.json());

// ====== DB POOL ======
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'huella_digital',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ====== HEALTH ======
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows?.[0]?.ok ?? 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'DB error' });
  }
});

// ====== GET CALCULATIONS (historial) ======
app.get('/api/calculations', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        created_at,
        stream_video_hours_week,
        gaming_hours_week,
        videocalls_hours_week,
        social_hours_week,
        cloud_hours_week,
        weeks_per_month,
        co2_per_kwh,
        total_kwh_month,
        total_co2_month,
        level,
        top_contribution
      FROM calculations
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Query error' });
  }
});

// ====== POST CALCULATIONS (guardar cálculo) ======
app.post('/api/calculations', async (req, res) => {
  try {
    const {
      stream_video_hours_week = 0,
      gaming_hours_week = 0,
      videocalls_hours_week = 0,
      social_hours_week = 0,
      cloud_hours_week = 0,
      weeks_per_month = 4.345,
      co2_per_kwh = 0.45,
      total_kwh_month = 0,
      total_co2_month = 0,
      level = 'Medio',
      top_contribution = 'Streaming',
    } = req.body || {};

    const sql = `
      INSERT INTO calculations
      (
        stream_video_hours_week,
        gaming_hours_week,
        videocalls_hours_week,
        social_hours_week,
        cloud_hours_week,
        weeks_per_month,
        co2_per_kwh,
        total_kwh_month,
        total_co2_month,
        level,
        top_contribution
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      stream_video_hours_week,
      gaming_hours_week,
      videocalls_hours_week,
      social_hours_week,
      cloud_hours_week,
      weeks_per_month,
      co2_per_kwh,
      total_kwh_month,
      total_co2_month,
      level,
      top_contribution,
    ];

    const [result] = await pool.execute(sql, params);

    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Insert error' });
  }
});

// ======================================================
// ✅ SERVIR ANGULAR (build copiado a /api/public)
// (Esto evita el error "Missing parameter name at index 1: *")
// ======================================================
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// SPA fallback: cualquier ruta que NO sea /api devuelve index.html
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return res
      .status(200)
      .send('Frontend no compilado. Falta copiar el dist de Angular a /api/public.');
  }

  res.sendFile(indexPath);
});

// ====== START ======
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
