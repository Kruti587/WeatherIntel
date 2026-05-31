/**
 * auth.js — Session + API key authentication middleware.
 *
 * Two auth methods supported:
 *   1. Session cookie  — for browser users (login page)
 *   2. X-API-Key header — for programmatic access (ingestor, simulator)
 *
 * Role hierarchy:
 *   viewer   → GET endpoints only
 *   operator → GET + POST /api/data
 *   admin    → everything including user management
 *
 * Usage in routes:
 *   router.get('/api/data', requireAuth('viewer'), handler)
 *   router.post('/api/data', requireAuth('operator'), handler)
 *   router.delete('/api/alerts/clear', requireAuth('admin'), handler)
 */

const { getPool } = require('../db/pool');
const { getUserBySessionId, getUserByApiKey, writeAuditLog } = require('../db/authQueries');

const ROLE_LEVELS = { viewer: 1, operator: 2, admin: 3 };

/**
 * Middleware: require authenticated user with at least `minRole`.
 * Checks session cookie first, then X-API-Key header.
 * Attaches req.user = { user_id, username, email, role }
 */
function requireAuth(minRole = 'viewer') {
    return async (req, res, next) => {
        const pool = getPool();
        const client = await pool.connect();

        try {
            let user = null;

            // 1. Try session cookie
            const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
            if (sessionId) {
                user = await getUserBySessionId(client, sessionId);
            }

            // 2. Try API key header
            if (!user) {
                const apiKey = req.headers['x-api-key'];
                if (apiKey) {
                    user = await getUserByApiKey(client, apiKey);
                }
            }

            if (!user) {
                return res.status(401).json({
                    error: 'Authentication required.',
                    hint: 'Send X-Session-Id cookie or X-API-Key header.',
                });
            }

            const userLevel = ROLE_LEVELS[user.role] || 0;
            const requiredLevel = ROLE_LEVELS[minRole] || 1;

            if (userLevel < requiredLevel) {
                return res.status(403).json({
                    error: `Insufficient permissions. Required: ${minRole}, your role: ${user.role}`,
                });
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('Auth middleware error:', err.message);
            res.status(500).json({ error: 'Authentication service error' });
        } finally {
            client.release();
        }
    };
}

/**
 * Middleware: optionally attach user if authenticated, but don't block.
 * Used for public GET endpoints that show extra info when logged in.
 */
function optionalAuth() {
    return async (req, res, next) => {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
            const apiKey = req.headers['x-api-key'];

            if (sessionId) {
                req.user = await getUserBySessionId(client, sessionId);
            } else if (apiKey) {
                req.user = await getUserByApiKey(client, apiKey);
            }
        } catch { /* ignore */ } finally {
            client.release();
        }
        next();
    };
}

module.exports = { requireAuth, optionalAuth };
