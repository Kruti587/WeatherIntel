const express = require('express');
const router = express.Router();
const pool = require('../core/db');
const { withTransaction, getPool } = require('../../db/pool');
const { getAlertFatigueReport } = require('../../db/alertQueries');
const {
    getUserByApiKey,
    getUserBySessionId,
    login,
    logout,
    createUser,
    writeAuditLog,
} = require('../../db/authQueries');
const { writeApiKey } = require('../../middleware/security');

// ─── Auth middleware ──────────────────────────────────────────────────────────

/**
 * requireAuth — accepts either:
 *   X-API-Key: <key>          (operators / admins)
 *   X-Session-Id: <sessionId> (any logged-in user)
 * Attaches req.user = { user_id, username, role }
 */
async function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const sessionId = req.headers['x-session-id'];

    try {
        let user = null;
        if (apiKey) {
            user = await withTransaction(c => getUserByApiKey(c, apiKey));
        } else if (sessionId) {
            user = await withTransaction(c => getUserBySessionId(c, sessionId));
        }

        if (!user) {
            return res.status(401).json({ error: 'Authentication required. Send X-API-Key or X-Session-Id header.' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * requireRole — must come after requireAuth
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Forbidden. Required role: ${roles.join(' or ')}. Your role: ${req.user?.role}`,
            });
        }
        next();
    };
}

// ─── System Status Route ──────────────────────────────────────────────────────
router.get('/status', (req, res) => {
    res.json({
        system: "GeoEnv-IP Environmental Intelligence Operating System",
        status: "OPERATIONAL",
        uplink: "ACTIVE",
        version: "2.4.1",
        timestamp: new Date()
    });
});

// Health Check Endpoint
router.get('/health', async (req, res) => {
    try {
        const dbStatus = await pool.query('SELECT NOW()');
        res.json({
            status: 'UP',
            kernel: 'v2.4.1',
            database: 'CONNECTED',
            timestamp: dbStatus.rows[0].now,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (err) {
        res.status(500).json({
            status: 'DEGRADED',
            database: 'DISCONNECTED',
            error: err.message
        });
    }
});

// Get all regions with latest health scores
router.get('/regions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, s.overall_score, s.risk_level, s.calculated_at
            FROM geo_region r
            LEFT JOIN (
                SELECT DISTINCT ON (region_id) region_id, overall_score, risk_level, calculated_at
                FROM region_health_score
                ORDER BY region_id, calculated_at DESC
            ) s ON r.region_id = s.region_id
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get latest telemetry for a region
router.get('/telemetry/latest/:regionId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (parameter_id) t.*, p.name, p.code, p.unit
            FROM telemetry_data t
            JOIN geo_parameter p ON t.parameter_id = p.parameter_id
            WHERE t.region_id = $1
            ORDER BY parameter_id, recorded_at DESC
        `, [req.params.regionId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical telemetry for replay (Global Snapshot)
router.get('/telemetry/snapshot', async (req, res) => {
    const { time } = req.query; // ISO timestamp
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (region_id, parameter_id) t.*, p.code, p.unit
            FROM telemetry_data t
            JOIN geo_parameter p ON t.parameter_id = p.parameter_id
            WHERE t.recorded_at <= $1
            ORDER BY region_id, parameter_id, recorded_at DESC
        `, [time || new Date()]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical health scores for stability chart
router.get('/regions/:regionId/stability', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT overall_score, calculated_at
            FROM region_health_score
            WHERE region_id = $1
            AND calculated_at > NOW() - INTERVAL '24 hours'
            ORDER BY calculated_at ASC
        `, [req.params.regionId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical alerts
router.get('/alerts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, r.name as region_name, p.name as parameter_name
            FROM geo_alert a
            JOIN geo_region r ON a.region_id = r.region_id
            JOIN geo_parameter p ON a.parameter_id = p.parameter_id
            ORDER BY a.created_at DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADVANCED ANALYTICS ENDPOINTS ────────────────────────────────────────────

// Get regional hotspots
router.get('/analytics/hotspots', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM v_regional_hotspots');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get telemetry trends
router.get('/analytics/trends', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM v_telemetry_trends LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Feature 4: Z-Score Anomaly Endpoint ─────────────────────────────────────
/**
 * GET /api/analytics/anomalies
 * Query params:
 *   regionId   — filter by region (optional)
 *   level      — 'Critical' | 'Warning' | 'Minor' | 'Normal' (optional)
 *   limit      — max rows (default 100)
 */
router.get('/analytics/anomalies', async (req, res) => {
    try {
        const { regionId, level, limit = 100 } = req.query;
        const filters = [];
        const values = [];

        if (regionId) {
            values.push(parseInt(regionId));
            filters.push(`region_id = $${values.length}`);
        }
        if (level) {
            values.push(level);
            filters.push(`anomaly_level = $${values.length}`);
        }

        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        values.push(Math.min(parseInt(limit) || 100, 500));

        const result = await pool.query(
            `SELECT * FROM v_zscore_anomalies
             ${where}
             ORDER BY ABS(z_score) DESC NULLS LAST
             LIMIT $${values.length}`,
            values
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Feature 5: Alert Fatigue Endpoint ───────────────────────────────────────
/**
 * GET /api/analytics/alert-fatigue?days=30
 * Returns fixed vs adaptive alert counts per parameter with reduction %.
 */
router.get('/analytics/alert-fatigue', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const report = await withTransaction(c => getAlertFatigueReport(c, days));
        res.json({
            period_days: days,
            generated_at: new Date(),
            data: report,
            summary: {
                total_fixed: report.reduce((s, r) => s + r.fixed_alert_count, 0),
                total_adaptive: report.reduce((s, r) => s + r.adaptive_alert_count, 0),
                avg_reduction_pct: (() => {
                    const valid = report.filter(r => r.reduction_percent !== null);
                    return valid.length
                        ? Math.round(valid.reduce((s, r) => s + r.reduction_percent, 0) / valid.length * 100) / 100
                        : null;
                })(),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/analytics/alert-fatigue/fixed-trigger
 * Body: { "enable": true | false }
 * Enables or disables the fixed-threshold DB trigger for the fatigue demo.
 * Requires operator or admin role.
 */
router.post('/analytics/alert-fatigue/fixed-trigger',
    requireAuth,
    requireRole('operator', 'admin'),
    async (req, res) => {
        const { enable } = req.body;
        if (typeof enable !== 'boolean') {
            return res.status(400).json({ error: 'Body must be { "enable": true } or { "enable": false }' });
        }
        try {
            const action = enable ? 'ENABLE' : 'DISABLE';
            await pool.query(`ALTER TABLE telemetry_data ${action} TRIGGER trg_fixed_alert`);

            await withTransaction(c => writeAuditLog(c, {
                userId: req.user.user_id,
                username: req.user.username,
                action: `fixed_trigger_${enable ? 'enabled' : 'disabled'}`,
                resource: '/api/analytics/alert-fatigue/fixed-trigger',
                ipAddress: req.ip,
            }));

            res.json({
                fixed_trigger: enable ? 'ENABLED' : 'DISABLED',
                message: enable
                    ? 'Fixed-threshold trigger enabled. New telemetry will generate fixed alerts.'
                    : 'Fixed-threshold trigger disabled. Only adaptive alerts will fire.',
                timestamp: new Date(),
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// ─── Feature 6: Auth Routes ───────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required.' });
    }
    try {
        const result = await withTransaction(c =>
            login(c, email, password, req.ip, req.headers['user-agent'])
        );
        if (!result.success) {
            return res.status(401).json({ error: result.error });
        }
        res.json({
            session_id: result.sessionId,
            user: result.user,
            message: 'Login successful. Send X-Session-Id header for authenticated requests.',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/logout
 * Header: X-Session-Id: <sessionId>
 */
router.post('/auth/logout', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required.' });
    try {
        await withTransaction(c => logout(c, sessionId));
        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/auth/me
 * Returns the current user's profile.
 */
router.get('/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

/**
 * POST /api/auth/users
 * Create a new user. Admin only.
 * Body: { username, email, password, role }
 */
router.post('/auth/users',
    requireAuth,
    requireRole('admin'),
    async (req, res) => {
        const { username, email, password, role = 'viewer' } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are required.' });
        }
        if (!['viewer', 'operator', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'role must be viewer, operator, or admin.' });
        }
        try {
            const user = await withTransaction(c => createUser(c, { username, email, password, role }));
            res.status(201).json({ user });
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Username or email already exists.' });
            }
            res.status(500).json({ error: err.message });
        }
    }
);

module.exports = router;
