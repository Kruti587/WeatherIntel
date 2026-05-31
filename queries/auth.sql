-- =============================================================
-- WeatherIntel Role-Based Auth
-- This is a DBMS feature — auth is enforced via a database table,
-- not an external auth framework. Roles are stored in Postgres.
--
-- Roles:
--   viewer   — can read all GET endpoints
--   operator — can read + write (POST /api/data, DELETE /api/alerts/clear)
--   admin    — full access including user management
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id    SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    -- bcrypt hash of password (never store plaintext)
    password_hash VARCHAR(255) NOT NULL,
    role       VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                   CHECK (role IN ('viewer', 'operator', 'admin')),
    -- API key for programmatic access (ingestor, simulator)
    api_key    VARCHAR(64)  UNIQUE,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Index for fast API key lookups on every request
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);

-- Sessions table — tracks active browser sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id  VARCHAR(64) PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address  VARCHAR(45),
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- Audit log — every write operation is recorded
-- This is the DBMS research angle: database-level audit trail
CREATE TABLE IF NOT EXISTS audit_log (
    log_id      SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id),
    username    VARCHAR(50),
    action      VARCHAR(50) NOT NULL,  -- 'login', 'logout', 'data_insert', 'alert_clear', etc.
    resource    VARCHAR(100),          -- e.g. '/api/data', '/api/alerts/clear'
    ip_address  VARCHAR(45),
    details     JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);

-- View: recent audit activity (useful for the DB Reports tab)
CREATE OR REPLACE VIEW recent_audit_view AS
SELECT
    al.log_id,
    al.username,
    al.action,
    al.resource,
    al.ip_address,
    al.details,
    al.created_at
FROM audit_log al
ORDER BY al.created_at DESC
LIMIT 100;
