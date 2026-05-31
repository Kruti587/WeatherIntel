-- =============================================================
-- GeoEnv-IP Schema Additions
-- Run AFTER schema_v2.sql and intelligence_layer.sql
-- Covers: auth tables, Karnataka regions, baselines,
--         alert source column, z-score view
-- =============================================================

BEGIN;

-- ─── Feature 6: Role-Based Auth Tables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    user_id     SERIAL PRIMARY KEY,
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT       NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('viewer', 'operator', 'admin')),
    api_key     VARCHAR(64)  UNIQUE,          -- operators/admins only
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id  VARCHAR(64) PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id      BIGSERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,
    username    VARCHAR(50),
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(255),
    ip_address  VARCHAR(45),
    details     JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ─── Feature 2: 4 Karnataka Regions ─────────────────────────────────────────

INSERT INTO geo_region (name, code, center_lat, center_lon, boundary_json, metadata) VALUES
(
    'Mysuru District',
    'KA_MYSURU',
    12.2958, 76.6394,
    '{"type":"Polygon","coordinates":[[[76.4,12.1],[76.9,12.1],[76.9,12.5],[76.4,12.5],[76.4,12.1]]]}',
    '{"state":"Karnataka","district":"Mysuru","zone":"South Karnataka","area_km2":6854}'
),
(
    'Hubballi-Dharwad',
    'KA_HUBBALLI',
    15.3647, 75.1240,
    '{"type":"Polygon","coordinates":[[[74.9,15.2],[75.4,15.2],[75.4,15.6],[74.9,15.6],[74.9,15.2]]]}',
    '{"state":"Karnataka","district":"Dharwad","zone":"North Karnataka","area_km2":4263}'
),
(
    'Mangaluru Coastal',
    'KA_MANGALURU',
    12.9141, 74.8560,
    '{"type":"Polygon","coordinates":[[[74.7,12.7],[75.0,12.7],[75.0,13.1],[74.7,13.1],[74.7,12.7]]]}',
    '{"state":"Karnataka","district":"Dakshina Kannada","zone":"Coastal Karnataka","area_km2":4843}'
),
(
    'Belagavi Border Zone',
    'KA_BELAGAVI',
    15.8497, 74.4977,
    '{"type":"Polygon","coordinates":[[[74.2,15.6],[74.8,15.6],[74.8,16.1],[74.2,16.1],[74.2,15.6]]]}',
    '{"state":"Karnataka","district":"Belagavi","zone":"North Karnataka","area_km2":13415}'
)
ON CONFLICT (code) DO NOTHING;

-- ─── Feature 2: Seed Baselines for All Regions × All Parameters ──────────────
-- Realistic Karnataka environmental baselines derived from published data.
-- base_stddev is set to ~10% of the mean so the adaptive engine has a
-- sensible starting point before live data accumulates.

INSERT INTO adaptive_threshold_config
    (region_id, parameter_id, base_mean, base_stddev, sensitivity_multiplier)
SELECT
    r.region_id,
    p.parameter_id,
    -- Mean values tuned per region × parameter
    CASE r.code
        WHEN 'BLR_URBAN' THEN
            CASE p.code
                WHEN 'THRM' THEN 302.5   -- ~29 °C urban heat island
                WHEN 'AOD'  THEN 0.55    -- high urban aerosol
                WHEN 'HUM'  THEN 62.0
                WHEN 'NDVI' THEN 0.35    -- low urban vegetation
                WHEN 'CLD'  THEN 45.0
                WHEN 'RAIN' THEN 2.8
                WHEN 'NO2'  THEN 38.0    -- high traffic NO2
                ELSE 50.0
            END
        WHEN 'WGN_01' THEN
            CASE p.code
                WHEN 'THRM' THEN 294.0   -- cooler Western Ghats
                WHEN 'AOD'  THEN 0.18
                WHEN 'HUM'  THEN 82.0    -- high forest humidity
                WHEN 'NDVI' THEN 0.78    -- dense forest
                WHEN 'CLD'  THEN 65.0
                WHEN 'RAIN' THEN 12.5
                WHEN 'NO2'  THEN 8.0
                ELSE 50.0
            END
        WHEN 'KA_MYSURU' THEN
            CASE p.code
                WHEN 'THRM' THEN 299.0
                WHEN 'AOD'  THEN 0.32
                WHEN 'HUM'  THEN 68.0
                WHEN 'NDVI' THEN 0.52
                WHEN 'CLD'  THEN 40.0
                WHEN 'RAIN' THEN 3.5
                WHEN 'NO2'  THEN 18.0
                ELSE 50.0
            END
        WHEN 'KA_HUBBALLI' THEN
            CASE p.code
                WHEN 'THRM' THEN 305.0   -- hotter semi-arid north
                WHEN 'AOD'  THEN 0.42
                WHEN 'HUM'  THEN 48.0    -- drier
                WHEN 'NDVI' THEN 0.38
                WHEN 'CLD'  THEN 30.0
                WHEN 'RAIN' THEN 1.8
                WHEN 'NO2'  THEN 22.0
                ELSE 50.0
            END
        WHEN 'KA_MANGALURU' THEN
            CASE p.code
                WHEN 'THRM' THEN 300.5   -- coastal, humid
                WHEN 'AOD'  THEN 0.22
                WHEN 'HUM'  THEN 85.0    -- coastal humidity
                WHEN 'NDVI' THEN 0.65
                WHEN 'CLD'  THEN 70.0
                WHEN 'RAIN' THEN 18.0    -- heavy monsoon
                WHEN 'NO2'  THEN 12.0
                ELSE 50.0
            END
        WHEN 'KA_BELAGAVI' THEN
            CASE p.code
                WHEN 'THRM' THEN 303.0
                WHEN 'AOD'  THEN 0.38
                WHEN 'HUM'  THEN 55.0
                WHEN 'NDVI' THEN 0.44
                WHEN 'CLD'  THEN 35.0
                WHEN 'RAIN' THEN 2.2
                WHEN 'NO2'  THEN 16.0
                ELSE 50.0
            END
        ELSE 50.0
    END AS base_mean,
    -- stddev = ~8% of mean, minimum 0.5
    GREATEST(0.5,
        CASE r.code
            WHEN 'BLR_URBAN' THEN
                CASE p.code
                    WHEN 'THRM' THEN 2.8  WHEN 'AOD' THEN 0.08 WHEN 'HUM' THEN 6.0
                    WHEN 'NDVI' THEN 0.05 WHEN 'CLD' THEN 8.0  WHEN 'RAIN' THEN 1.2
                    WHEN 'NO2'  THEN 6.0  ELSE 5.0
                END
            WHEN 'WGN_01' THEN
                CASE p.code
                    WHEN 'THRM' THEN 2.0  WHEN 'AOD' THEN 0.04 WHEN 'HUM' THEN 5.0
                    WHEN 'NDVI' THEN 0.04 WHEN 'CLD' THEN 10.0 WHEN 'RAIN' THEN 4.0
                    WHEN 'NO2'  THEN 2.0  ELSE 5.0
                END
            WHEN 'KA_MYSURU' THEN
                CASE p.code
                    WHEN 'THRM' THEN 2.5  WHEN 'AOD' THEN 0.06 WHEN 'HUM' THEN 7.0
                    WHEN 'NDVI' THEN 0.06 WHEN 'CLD' THEN 8.0  WHEN 'RAIN' THEN 1.5
                    WHEN 'NO2'  THEN 4.0  ELSE 5.0
                END
            WHEN 'KA_HUBBALLI' THEN
                CASE p.code
                    WHEN 'THRM' THEN 3.5  WHEN 'AOD' THEN 0.07 WHEN 'HUM' THEN 6.0
                    WHEN 'NDVI' THEN 0.06 WHEN 'CLD' THEN 7.0  WHEN 'RAIN' THEN 0.8
                    WHEN 'NO2'  THEN 5.0  ELSE 5.0
                END
            WHEN 'KA_MANGALURU' THEN
                CASE p.code
                    WHEN 'THRM' THEN 2.2  WHEN 'AOD' THEN 0.04 WHEN 'HUM' THEN 4.0
                    WHEN 'NDVI' THEN 0.05 WHEN 'CLD' THEN 9.0  WHEN 'RAIN' THEN 6.0
                    WHEN 'NO2'  THEN 3.0  ELSE 5.0
                END
            WHEN 'KA_BELAGAVI' THEN
                CASE p.code
                    WHEN 'THRM' THEN 3.0  WHEN 'AOD' THEN 0.06 WHEN 'HUM' THEN 6.5
                    WHEN 'NDVI' THEN 0.06 WHEN 'CLD' THEN 7.5  WHEN 'RAIN' THEN 1.0
                    WHEN 'NO2'  THEN 4.0  ELSE 5.0
                END
            ELSE 5.0
        END
    ) AS base_stddev,
    2.0 AS sensitivity_multiplier
FROM geo_region r
CROSS JOIN geo_parameter p
WHERE r.code IN ('BLR_URBAN','WGN_01','KA_MYSURU','KA_HUBBALLI','KA_MANGALURU','KA_BELAGAVI')
ON CONFLICT (region_id, parameter_id) DO NOTHING;

-- ─── Feature 5: Add source column to geo_alert ────────────────────────────────
-- Tracks whether an alert was generated by the fixed-threshold trigger
-- or the adaptive engine. Required for alert fatigue comparison.

ALTER TABLE geo_alert
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'adaptive'
    CHECK (source IN ('fixed', 'adaptive', 'predictive'));

-- ─── Feature 4: Z-Score Anomaly View ─────────────────────────────────────────
-- Computes per-reading z-score against the stored adaptive baseline.
-- Exposed via GET /api/analytics/anomalies

CREATE OR REPLACE VIEW v_zscore_anomalies AS
SELECT
    t.telemetry_id,
    t.recorded_at,
    r.region_id,
    r.name                                          AS region_name,
    p.parameter_id,
    p.name                                          AS parameter_name,
    p.code                                          AS parameter_code,
    p.unit,
    t.value,
    c.base_mean,
    c.base_stddev,
    -- Z-score: how many standard deviations from the regional baseline
    ROUND(
        (t.value - c.base_mean) / NULLIF(c.base_stddev, 0),
        3
    )                                               AS z_score,
    -- Severity bucket matching the JS scoring logic
    CASE
        WHEN ABS((t.value - c.base_mean) / NULLIF(c.base_stddev, 0)) > 3 THEN 'Critical'
        WHEN ABS((t.value - c.base_mean) / NULLIF(c.base_stddev, 0)) > 2 THEN 'Warning'
        WHEN ABS((t.value - c.base_mean) / NULLIF(c.base_stddev, 0)) > 1 THEN 'Minor'
        ELSE 'Normal'
    END                                             AS anomaly_level,
    -- Direction of deviation
    CASE
        WHEN t.value > c.base_mean THEN 'Above'
        WHEN t.value < c.base_mean THEN 'Below'
        ELSE 'At Baseline'
    END                                             AS deviation_direction
FROM telemetry_data t
JOIN geo_region    r ON r.region_id    = t.region_id
JOIN geo_parameter p ON p.parameter_id = t.parameter_id
JOIN adaptive_threshold_config c
     ON c.region_id = t.region_id AND c.parameter_id = t.parameter_id
WHERE t.recorded_at > NOW() - INTERVAL '24 hours';

-- ─── Feature 5: Fixed-threshold trigger (for alert fatigue demo) ──────────────
-- Uses hard-coded min/max from geo_parameter instead of adaptive baselines.
-- Enable with:  ALTER TABLE telemetry_data ENABLE TRIGGER trg_fixed_alert;
-- Disable with: ALTER TABLE telemetry_data DISABLE TRIGGER trg_fixed_alert;

CREATE OR REPLACE FUNCTION fn_fixed_alert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_param     geo_parameter%ROWTYPE;
    v_severity  VARCHAR(20);
    v_message   TEXT;
BEGIN
    SELECT * INTO v_param FROM geo_parameter WHERE parameter_id = NEW.parameter_id;

    -- Only fire if hard thresholds are defined
    IF v_param.max_threshold IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.value > v_param.max_threshold THEN
        v_severity := 'Red';
        v_message  := 'FIXED THRESHOLD BREACH: ' || v_param.name
                      || ' = ' || NEW.value
                      || ' (max=' || v_param.max_threshold || ')';
    ELSIF NEW.value > (v_param.max_threshold * 0.85) THEN
        v_severity := 'Orange';
        v_message  := 'FIXED THRESHOLD WARNING: ' || v_param.name
                      || ' = ' || NEW.value
                      || ' (85% of max=' || v_param.max_threshold || ')';
    ELSE
        RETURN NEW;  -- within limits, no alert
    END IF;

    INSERT INTO geo_alert
        (telemetry_id, region_id, parameter_id, severity, message, recorded_value, threshold_value, source)
    VALUES
        (NEW.telemetry_id, NEW.region_id, NEW.parameter_id,
         v_severity, v_message, NEW.value, v_param.max_threshold, 'fixed');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger in DISABLED state — enable only for the fatigue demo
DROP TRIGGER IF EXISTS trg_fixed_alert ON telemetry_data;
CREATE TRIGGER trg_fixed_alert
AFTER INSERT ON telemetry_data
FOR EACH ROW
EXECUTE FUNCTION fn_fixed_alert_trigger();

-- Start disabled so it doesn't pollute normal operation
ALTER TABLE telemetry_data DISABLE TRIGGER trg_fixed_alert;

-- Also update the adaptive trigger to stamp source = 'adaptive'
CREATE OR REPLACE FUNCTION fn_adaptive_alert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold DECIMAL;
    v_severity  VARCHAR(20);
    v_message   TEXT;
    v_param_name VARCHAR(100);
BEGIN
    SELECT (base_mean + (base_stddev * sensitivity_multiplier))
    INTO v_threshold
    FROM adaptive_threshold_config
    WHERE region_id = NEW.region_id AND parameter_id = NEW.parameter_id;

    SELECT name INTO v_param_name FROM geo_parameter WHERE parameter_id = NEW.parameter_id;

    IF v_threshold IS NOT NULL AND NEW.value > v_threshold THEN
        IF NEW.value > (v_threshold * 1.5) THEN
            v_severity := 'Red';
            v_message  := 'CRITICAL DBMS-NATIVE ALERT: ' || v_param_name
                          || ' (' || NEW.value || ') is 50% above adaptive threshold ('
                          || ROUND(v_threshold, 2) || ')';
        ELSE
            v_severity := 'Orange';
            v_message  := 'ADAPTIVE WARNING: ' || v_param_name
                          || ' (' || NEW.value || ') exceeded regional baseline ('
                          || ROUND(v_threshold, 2) || ')';
        END IF;

        INSERT INTO geo_alert
            (telemetry_id, region_id, parameter_id, severity, message,
             recorded_value, threshold_value, source)
        VALUES
            (NEW.telemetry_id, NEW.region_id, NEW.parameter_id,
             v_severity, v_message, NEW.value, v_threshold, 'adaptive');

        INSERT INTO event_pipeline_log (event_type, source_id, action_taken, status)
        VALUES ('DB_NATIVE_ALERT', NEW.telemetry_id,
                'Generated ' || v_severity || ' alert for ' || v_param_name, 'SUCCESS');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
