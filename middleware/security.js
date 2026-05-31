/**
 * security.js — All security middleware in one place.
 *
 * What each piece does and WHY it matters for deployment:
 *
 * 1. helmet()        — Sets ~15 HTTP response headers that browsers use to
 *                      block XSS, clickjacking, MIME sniffing, etc.
 *                      Zero config needed. Always on.
 *
 * 2. rateLimiter     — Caps how many requests one IP can make per minute.
 *                      Prevents someone hammering your API and exhausting
 *                      the Postgres connection pool.
 *
 * 3. writeApiKey     — Protects POST /api/data, DELETE /api/alerts/clear.
 *                      Callers must send header: X-API-Key: <your key>
 *                      Set WRITE_API_KEY in .env. If not set, write
 *                      endpoints are blocked entirely in production.
 *
 * 4. requestSizeLimit — Rejects bodies > 10 KB. Prevents memory exhaustion
 *                       from giant JSON payloads.
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ─── 1. Helmet — HTTP security headers ───────────────────────────────────────
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // 'unsafe-inline' needed for onclick handlers and Tailwind CDN inline styles
            // 'unsafe-eval' needed for Tailwind CDN's JIT runtime
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                'https://cdn.tailwindcss.com', 'https://unpkg.com'],
            // Helmet sets script-src-attr to 'none' by default, which blocks
            // ALL inline onclick="..." handlers. Must explicitly allow them.
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'",
                'https://cdn.tailwindcss.com', 'https://unpkg.com'],
            imgSrc: ["'self'", 'data:', 'blob:',
                'https://*.tile.openstreetmap.org',
                'https://*.openstreetmap.org'],
            connectSrc: ["'self'",
                'https://api.openweathermap.org',
                'ws://localhost:*', 'ws://127.0.0.1:*',
                'wss://*'],
            fontSrc: ["'self'", 'https://unpkg.com', 'data:'],
            workerSrc: ["'self'", 'blob:'],
            childSrc: ["'self'", 'blob:'],
        },
    },
    // Allow the dashboard to be opened as a local file too
    crossOriginEmbedderPolicy: false,
});

// ─── 2. Rate limiter — 120 requests per minute per IP ────────────────────────
const rateLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute window
    max: 120,                  // max requests per window per IP
    standardHeaders: true,     // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
    // Skip rate limiting for health checks so uptime monitors work
    skip: (req) => req.path === '/api/health',
});

// Stricter limiter for write operations — 30 writes per minute per IP
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Write rate limit exceeded. Max 30 writes per minute.' },
});

// ─── 3. API key auth for destructive/write endpoints ─────────────────────────
//
// How it works:
//   - Set WRITE_API_KEY=some-long-random-string in your .env
//   - Callers send header:  X-API-Key: some-long-random-string
//   - If the key matches → request proceeds
//   - If no key is configured in .env → blocked in production, allowed in dev
//
// Generate a good key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
function writeApiKey(req, res, next) {
    const configuredKey = process.env.WRITE_API_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    // In development with no key configured: allow through with a warning
    if (!configuredKey) {
        if (isProduction) {
            return res.status(503).json({
                error: 'Write endpoints are disabled. Set WRITE_API_KEY environment variable.',
            });
        }
        console.warn('⚠️  WRITE_API_KEY not set — write endpoints unprotected (dev mode only)');
        return next();
    }

    const providedKey = req.headers['x-api-key'];

    if (!providedKey) {
        return res.status(401).json({ error: 'Missing X-API-Key header.' });
    }

    // Constant-time comparison to prevent timing attacks
    const crypto = require('crypto');
    const expected = Buffer.from(configuredKey);
    const provided = Buffer.from(providedKey);

    if (expected.length !== provided.length) {
        return res.status(403).json({ error: 'Invalid API key.' });
    }

    if (!crypto.timingSafeEqual(expected, provided)) {
        return res.status(403).json({ error: 'Invalid API key.' });
    }

    next();
}

// ─── 4. Request size limit ────────────────────────────────────────────────────
// Applied via express.json({ limit: '10kb' }) in server.js — exported here
// as a reminder constant so it's documented in one place.
const REQUEST_SIZE_LIMIT = '10kb';

module.exports = {
    helmetMiddleware,
    rateLimiter,
    writeLimiter,
    writeApiKey,
    REQUEST_SIZE_LIMIT,
};
