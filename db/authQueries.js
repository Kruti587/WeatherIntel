/**
 * authQueries.js — All auth-related DB operations.
 *
 * Design principle: auth logic lives in the DB layer.
 * The users table IS the auth system — no external auth service needed.
 * This is intentional for a DBMS project: it demonstrates that
 * role-based access control can be implemented purely in PostgreSQL.
 */

const crypto = require('crypto');

// ── Password hashing (no bcrypt dependency — uses Node crypto) ─
// PBKDF2 with SHA-256, 100k iterations, 32-byte output
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const attempt = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    // Constant-time comparison
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

// ── User operations ───────────────────────────────────────────

async function createUser(client, { username, email, password, role = 'viewer' }) {
    const passwordHash = hashPassword(password);
    const apiKey = role === 'operator' || role === 'admin' ? generateApiKey() : null;

    const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role, api_key)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, username, email, role, api_key, created_at`,
        [username, email, passwordHash, role, apiKey]
    );
    return result.rows[0];
}

async function getUserByEmail(client, email) {
    const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email]
    );
    return result.rows[0] || null;
}

async function getUserByApiKey(client, apiKey) {
    if (!apiKey) return null;
    const result = await client.query(
        'SELECT * FROM users WHERE api_key = $1 AND is_active = TRUE',
        [apiKey]
    );
    return result.rows[0] || null;
}

async function getUserBySessionId(client, sessionId) {
    const result = await client.query(
        `SELECT u.user_id, u.username, u.email, u.role
     FROM user_sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.session_id = $1
       AND s.expires_at > NOW()
       AND u.is_active = TRUE`,
        [sessionId]
    );
    return result.rows[0] || null;
}

async function login(client, email, password, ipAddress, userAgent) {
    const user = await getUserByEmail(client, email);
    if (!user) return { success: false, error: 'Invalid email or password' };

    let valid = false;
    try {
        valid = verifyPassword(password, user.password_hash);
    } catch {
        return { success: false, error: 'Invalid email or password' };
    }

    if (!valid) return { success: false, error: 'Invalid email or password' };

    // Create session (24 hour expiry)
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
        `INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, user.user_id, expiresAt.toISOString(), ipAddress, userAgent]
    );

    // Update last_login
    await client.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
    );

    // Audit log
    await client.query(
        `INSERT INTO audit_log (user_id, username, action, resource, ip_address)
     VALUES ($1, $2, 'login', '/api/auth/login', $3)`,
        [user.user_id, user.username, ipAddress]
    );

    return {
        success: true,
        sessionId,
        user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role },
    };
}

async function logout(client, sessionId) {
    await client.query('DELETE FROM user_sessions WHERE session_id = $1', [sessionId]);
}

async function cleanExpiredSessions(client) {
    const result = await client.query(
        'DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING session_id'
    );
    return result.rowCount;
}

async function writeAuditLog(client, { userId, username, action, resource, ipAddress, details }) {
    await client.query(
        `INSERT INTO audit_log (user_id, username, action, resource, ip_address, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId || null, username || null, action, resource || null, ipAddress || null,
        details ? JSON.stringify(details) : null]
    );
}

// Seed a default admin user if no users exist
async function seedDefaultAdmin(client) {
    const count = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) > 0) return null;

    const adminPassword = process.env.ADMIN_PASSWORD || 'WeatherIntel@2025';
    const admin = await createUser(client, {
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@weatherintel.local',
        password: adminPassword,
        role: 'admin',
    });

    console.log(`\n👤 Default admin created:`);
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   API Key:  ${admin.api_key}`);
    console.log(`   ⚠️  Change the password after first login!\n`);

    return admin;
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateApiKey,
    createUser,
    getUserByEmail,
    getUserByApiKey,
    getUserBySessionId,
    login,
    logout,
    cleanExpiredSessions,
    writeAuditLog,
    seedDefaultAdmin,
};
