const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// Core Modules
const pool = require('./core/db');
const { initInterceptor } = require('./core/interceptor');
const { initWebSocket } = require('./websocket/wsHandler');

// Security Middleware (Fix #1: was never imported)
const { helmetMiddleware, rateLimiter, REQUEST_SIZE_LIMIT } = require('../middleware/security');

// Services
const telemetryEngine = require('./services/telemetryEngine');
const scoringSystem = require('./services/scoringSystem');

// Auth
const { seedDefaultAdmin } = require('../db/authQueries');
const { withTransaction } = require('../db/pool');

// API Routes
const apiRoutes = require('./api/routes');

const app = express();
const server = http.createServer(app);

// Initialize Kernel Systems
initWebSocket(server);
initInterceptor();

// ── Security middleware (must come before routes) ─────────────────────────────
app.use(helmetMiddleware);
app.use(rateLimiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));

// Routes
app.use('/api', apiRoutes);

// Root Status
app.get('/', (req, res) => {
    res.json({
        system: "GeoEnv-IP Environmental Intelligence Operating System",
        status: "OPERATIONAL",
        kernel: "v2.4.1",
        uplink: "ACTIVE"
    });
});

// Start Simulation Engines
telemetryEngine.start();

// Seed default admin user on startup (idempotent — skips if users already exist)
withTransaction((client) => seedDefaultAdmin(client)).catch(console.error);

// Run health scoring every 30 seconds
setInterval(() => {
    scoringSystem.runPeriodicScoring().catch(console.error);
}, 30000);

// Port Fallback System
const PORT = process.env.PORT || 3001;

const startServer = (port) => {
    server.listen(port)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️  Port ${port} is busy. Retrying with ${parseInt(port) + 1}...`);
                startServer(parseInt(port) + 1);
            } else {
                console.error('Fatal Server Error:', err);
            }
        })
        .on('listening', () => {
            console.log(`🌐 GeoEnv-IP Kernel Online @ Port ${server.address().port}`);
        });
};

startServer(PORT);
