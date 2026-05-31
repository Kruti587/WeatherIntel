const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { loadEnvFile } = require('./config/env');
const { helmetMiddleware, rateLimiter, REQUEST_SIZE_LIMIT } = require('./middleware/security');
const { attachWebSocket } = require('./middleware/websocket');

// ── Load .env before anything else ───────────────────────────
loadEnvFile();

// ── Validate required DB config ───────────────────────────────
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const missingDbVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PORT'].filter(v => !process.env[v]);
if (!hasDatabaseUrl && missingDbVars.length > 0) {
  process.stderr.write(`Missing DB config. Provide DATABASE_URL or set: ${missingDbVars.join(', ')}\n`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────
app.use(helmetMiddleware);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: REQUEST_SIZE_LIMIT }));

// ── Cookie parsing (needed for session auth) ──────────────────
// Simple cookie parser — no external dependency
app.use((req, _res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(pair => {
      const [key, ...val] = pair.trim().split('=');
      if (key) req.cookies[key.trim()] = decodeURIComponent(val.join('='));
    });
  }
  next();
});

// ── CORS ──────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  const origins = corsOrigin.split(',').map(o => o.trim());
  app.use(cors({ origin: origins, credentials: true }));
} else {
  app.use(cors({ credentials: true }));
}

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api', rateLimiter);

// ── Static frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend', 'ui')));
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'frontend', 'ui', 'index.html'))
);

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/anomaly-report', require('./routes/anomaly'));
app.use('/api', require('./routes/data'));
app.use('/api/latest-weather', require('./routes/weather'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/alert-fatigue-report', require('./routes/fatigue'));
app.use('/api/health', require('./routes/health'));
app.use('/api', require('./routes/reports'));

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────
const server = http.createServer(app);
attachWebSocket(server);

server.listen(PORT, async () => {
  console.log(`🚀 WeatherIntel running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🔒 Security: helmet ✓  rate-limit ✓  size-limit(${REQUEST_SIZE_LIMIT}) ✓`);

  // Seed default admin user if no users exist
  try {
    const { getPool } = require('./db/pool');
    const { seedDefaultAdmin } = require('./db/authQueries');
    const pool = getPool();
    const client = await pool.connect();
    try {
      await seedDefaultAdmin(client);
    } finally {
      client.release();
    }
  } catch (err) {
    // Auth tables may not exist yet — that's fine, run auth.sql first
    if (!err.message.includes('does not exist')) {
      console.error('Admin seed error:', err.message);
    }
  }
});
