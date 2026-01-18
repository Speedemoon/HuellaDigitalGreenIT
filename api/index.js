const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ===== DB (MySQL) =====
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

// Crea tabla si no existe
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calculations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      stream_video_hours_week DOUBLE DEFAULT 0,
      gaming_hours_week DOUBLE DEFAULT 0,
      videocalls_hours_week DOUBLE DEFAULT 0,
      social_hours_week DOUBLE DEFAULT 0,
      cloud_hours_week DOUBLE DEFAULT 0,
      weeks_per_month DOUBLE DEFAULT 4.345,
      co2_per_kwh DOUBLE DEFAULT 0.45,
      total_kwh_month DOUBLE DEFAULT 0,
      total_co2_month DOUBLE DEFAULT 0,
      level VARCHAR(20) DEFAULT 'Bajo',
      top_contribution VARCHAR(50) DEFAULT '-'
    );
  `);
}
ensureTable().catch((e) => console.error('DB ensureTable error:', e));

// ===== Helpers =====
function n(v, fb = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
}

function calcTotals(body) {
  // Si el front ya manda totales, se respetan
  const total_kwh_month = n(body.total_kwh_month, null);
  const total_co2_month = n(body.total_co2_month, null);

  if (total_kwh_month !== null && total_co2_month !== null) {
    return {
      total_kwh_month,
      total_co2_month,
      level: body.level || 'Bajo',
      top_contribution: body.top_contribution || '-',
    };
  }

  // Si NO manda totales, los calculamos simple aquí
  const wpm = n(body.weeks_per_month, 4.345);
  const co2 = n(body.co2_per_kwh, 0.45);

  const factors = { stream: 0.12, gaming: 0.18, videocalls: 0.10, social: 0.08, cloud: 0.06 };

  const kwhStream = n(body.stream_video_hours_week) * wpm * factors.stream;
  const kwhGaming = n(body.gaming_hours_week) * wpm * factors.gaming;
  const kwhCalls  = n(body.videocalls_hours_week) * wpm * factors.videocalls;
  const kwhSocial = n(body.social_hours_week) * wpm * factors.social;
  const kwhCloud  = n(body.cloud_hours_week) * wpm * factors.cloud;

  const total = kwhStream + kwhGaming + kwhCalls + kwhSocial + kwhCloud;
  const totalCo2 = total * co2;

  let level = 'Bajo';
  if (totalCo2 >= 15) level = 'Alto';
  else if (totalCo2 >= 5) level = 'Medio';

  const map = [
    ['Streaming', kwhStream],
    ['Gaming', kwhGaming],
    ['Videollamadas', kwhCalls],
    ['Redes', kwhSocial],
    ['Cloud', kwhCloud],
  ].sort((a, b) => b[1] - a[1]);

  const top = map[0][1] > 0 ? map[0][0] : '-';

  return { total_kwh_month: total, total_co2_month: totalCo2, level, top_contribution: top };
}

// ===== API =====
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/calculations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM calculations ORDER BY created_at DESC LIMIT 200;`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/calculations error:', e);
    res.status(500).json({ ok: false, error: 'DB error (get)' });
  }
});

app.post('/api/calculations', async (req, res) => {
  try {
    const b = req.body || {};

    const totals = calcTotals(b);

    const rowToInsert = {
      stream_video_hours_week: n(b.stream_video_hours_week),
      gaming_hours_week: n(b.gaming_hours_week),
      videocalls_hours_week: n(b.videocalls_hours_week),
      social_hours_week: n(b.social_hours_week),
      cloud_hours_week: n(b.cloud_hours_week),
      weeks_per_month: n(b.weeks_per_month, 4.345),
      co2_per_kwh: n(b.co2_per_kwh, 0.45),
      total_kwh_month: n(totals.total_kwh_month),
      total_co2_month: n(totals.total_co2_month),
      level: totals.level || 'Bajo',
      top_contribution: totals.top_contribution || '-',
    };

    const [result] = await pool.query(
      `INSERT INTO calculations
      (stream_video_hours_week, gaming_hours_week, videocalls_hours_week, social_hours_week, cloud_hours_week,
       weeks_per_month, co2_per_kwh, total_kwh_month, total_co2_month, level, top_contribution)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        rowToInsert.stream_video_hours_week,
        rowToInsert.gaming_hours_week,
        rowToInsert.videocalls_hours_week,
        rowToInsert.social_hours_week,
        rowToInsert.cloud_hours_week,
        rowToInsert.weeks_per_month,
        rowToInsert.co2_per_kwh,
        rowToInsert.total_kwh_month,
        rowToInsert.total_co2_month,
        rowToInsert.level,
        rowToInsert.top_contribution,
      ]
    );

    const id = result.insertId;
    const [rows] = await pool.query(`SELECT * FROM calculations WHERE id=?`, [id]);

    res.json({ ok: true, row: rows[0] });
  } catch (e) {
    console.error('POST /api/calculations error:', e);
    res.status(500).json({ ok: false, error: 'DB error (insert)' });
  }
});

// ===== SPA fallback (Angular) =====
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(200).send('Frontend no compilado. Falta copiar el dist de Angular a /api/public.');
  }
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
});
