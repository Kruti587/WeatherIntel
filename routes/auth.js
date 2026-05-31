const express = require('express');
const router = express.Router();
const { getPool, withTransaction } = require('../db/pool');
const { login, logout, createUser, getUserByEmail, writeAuditLog } = require('../db/authQueries');
const { requireAuth } = require('../middleware/auth');

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input.' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const result = await withTransaction(async (client) => {
            return login(client, email.toLowerCase().trim(), password,
                req.ip, req.headers['user-agent']);
        });

        if (!result.success) {
            return res.status(401).json({ error: result.error });
        }

        // Set session cookie (httpOnly, sameSite strict)
        res.cookie('session_id', result.sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.json({
            message: 'Login successful',
            user: result.user,
            session_id: result.sessionId, // also in body for API clients
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', async (req, res) => {
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    if (sessionId) {
        try {
            const pool = getPool();
            const client = await pool.connect();
            try {
                await logout(client, sessionId);
            } finally {
                client.release();
            }
        } catch { /* ignore */ }
    }
    res.clearCookie('session_id');
    res.json({ message: 'Logged out successfully.' });
});

// ── POST /api/auth/register ───────────────────────────────────
// Admin only — users can't self-register (this is an ops tool)
router.post('/register', requireAuth('admin'), async (req, res) => {
    const { username, email, password, role = 'viewer' } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email, and password are required.' });
    }

    if (!['viewer', 'operator', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'role must be viewer, operator, or admin.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    try {
        const user = await withTransaction(async (client) => {
            // Check duplicate
            const existing = await getUserByEmail(client, email.toLowerCase().trim());
            if (existing) throw Object.assign(new Error('Email already registered.'), { status: 409 });

            const newUser = await createUser(client, {
                username: username.trim(),
                email: email.toLowerCase().trim(),
                password,
                role,
            });

            await writeAuditLog(client, {
                userId: req.user.user_id,
                username: req.user.username,
                action: 'user_created',
                resource: '/api/auth/register',
                ipAddress: req.ip,
                details: { new_user: newUser.username, role },
            });

            return newUser;
        });

        res.status(201).json({
            message: 'User created successfully.',
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                api_key: user.api_key, // only shown once at creation
            },
        });
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ error: err.message });
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth('viewer'), (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
