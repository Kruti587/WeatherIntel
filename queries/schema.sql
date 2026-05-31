-- =============================================================
-- WeatherIntel Schema Migration
-- Run this file once against your env_monitoring database.
-- All DDL is wrapped in a transaction — if anything fails,
-- the entire migration rolls back and the DB is left unchanged.
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. EXISTING TABLES (unchanged structure, kept for reference)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parameter (
    parameter_id SERIAL PRIMARY KEY,
    parameter_name VARCHAR(50) UNIQUE NOT NULL,
    unit_measure VARCHAR(20) NOT NULL
);

-- ---------------------------------------------------------------
-- 2. NEW: region table
--    Every reading is tied to a geographic region.
--    Bengaluru is seeded as region_id = 1.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS region (
    region_id  SERIAL PRIMARY KEY,
    name       VARCHAR(100)   NOT NULL,
    latitude   DECIMAL(9,6)   NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude  DECIMAL(9,6)   NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    elevation  DECIMAL(8,2)   NOT NULL
);

INSERT INTO region (region_id, name, latitude, longitude, elevation)
VALUES (1, 'Bengaluru', 12.971600, 77.594600, 920.00)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 3. environmental_data
--    Added: region_id FK (nullable first so existing rows survive,
--    then backfilled and made NOT NULL).
--    Added: UNIQUE constraint to prevent duplicate readings.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS environmental_data (
    data_id        SERIAL PRIMARY KEY,
    parameter_id   INT     NOT NULL REFERENCES parameter(parameter_id),
    measured_value DECIMAL NOT NULL,
    recorded_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add region_id as nullable so existing rows don't violate NOT NULL
ALTER TABLE environmental_data
    ADD COLUMN IF NOT EXISTS region_id INT REFERENCES region(region_id);

-- Backfill all existing rows to Bengaluru
UPDATE environmental_data SET region_id = 1 WHERE region_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE environmental_data ALTER COLUMN region_id SET NOT NULL;

-- Prevent duplicate readings for the same parameter/region/timestamp
ALTER TABLE environmental_data
    DROP CONSTRAINT IF EXISTS uq_env_data_param_region_time;
ALTER TABLE environmental_data
    ADD CONSTRAINT uq_env_data_param_region_time
    UNIQUE (parameter_id, recorded_at, region_id);

-- ---------------------------------------------------------------
-- 4. alert
--    Added: source column to distinguish fixed vs adaptive alerts.
--    This is what powers the alert fatigue report.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS alert (
    alert_id      SERIAL PRIMARY KEY,
    data_id       INT REFERENCES environmental_data(data_id),
    alert_message TEXT        NOT NULL,
    severity      VARCHAR(20) NOT NULL CHECK (severity IN ('Warning', 'Critical')),
    department    VARCHAR(50) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alert
    ADD COLUMN IF NOT EXISTS source VARCHAR(20)
    NOT NULL DEFAULT 'adaptive'
    CHECK (source IN ('fixed', 'adaptive'));

-- ---------------------------------------------------------------
-- 5. forecast_data
--    Changed forecast_time to TIMESTAMP WITH TIME ZONE so UTC
--    offset is preserved when storing OpenWeather forecast slots.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS forecast_data (
    forecast_id    SERIAL PRIMARY KEY,
    parameter_id   INT     NOT NULL REFERENCES parameter(parameter_id),
    forecast_value DECIMAL NOT NULL,
    forecast_time  TIMESTAMP WITH TIME ZONE NOT NULL,
    source         VARCHAR(50) DEFAULT 'OpenWeather',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parameter_id, forecast_time)
);

-- ---------------------------------------------------------------
-- 6. NEW: regional_baseline
--    Stores Karnataka/IMD seasonal climate norms.
--    Used as the fallback regional_mean when fewer than 7 days
--    of readings exist for a parameter.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regional_baseline (
    baseline_id  SERIAL PRIMARY KEY,
    region_id    INT          NOT NULL REFERENCES region(region_id),
    parameter_id INT          NOT NULL REFERENCES parameter(parameter_id),
    season       VARCHAR(20)  NOT NULL
                     CHECK (season IN ('pre-monsoon', 'monsoon', 'post-monsoon', 'winter')),
    mean_value   DECIMAL      NOT NULL,
    std_dev      DECIMAL      NOT NULL CHECK (std_dev > 0),
    UNIQUE (region_id, parameter_id, season)
);

-- ---------------------------------------------------------------
-- 7. NEW: adaptive_threshold
--    One row per (region, parameter) pair.
--    Updated on every new reading ingestion.
--    formula: threshold_value = regional_mean * (1 + deviation_factor)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS adaptive_threshold (
    threshold_id     SERIAL PRIMARY KEY,
    region_id        INT           NOT NULL REFERENCES region(region_id),
    parameter_id     INT           NOT NULL REFERENCES parameter(parameter_id),
    threshold_value  DECIMAL       NOT NULL,
    regional_mean    DECIMAL       NOT NULL,
    deviation_factor DECIMAL(5,2)  NOT NULL
                         CHECK (deviation_factor BETWEEN 0.01 AND 5.00),
    last_updated     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (region_id, parameter_id)
);

-- ---------------------------------------------------------------
-- 8. Seed core parameters (idempotent)
-- ---------------------------------------------------------------

INSERT INTO parameter (parameter_id, parameter_name, unit_measure) VALUES
    (1,  'Temperature',  '°C'),
    (2,  'Wind Speed',   'km/h'),
    (3,  'Visibility',   'km'),
    (12, 'Humidity',     '%'),
    (13, 'Pressure',     'hPa'),
    (14, 'UV Index',     'index'),
    (15, 'Precipitation','mm')
ON CONFLICT (parameter_name) DO UPDATE SET
    unit_measure = EXCLUDED.unit_measure;

-- ---------------------------------------------------------------
-- 9. Ensure the fixed-threshold trigger function and trigger exist,
--    then immediately disable it.
--    The trigger is kept (not dropped) so we can re-enable it
--    to generate fixed-source alerts for the fatigue comparison.
--    In normal operation the adaptive engine handles alerts.
-- ---------------------------------------------------------------

-- Create the trigger function if it doesn't exist yet
CREATE OR REPLACE FUNCTION fn_environmental_alerts() RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT parameter_name INTO v_name
    FROM parameter
    WHERE parameter_id = NEW.parameter_id;

    IF v_name = 'Wind Speed' AND NEW.measured_value >= 80 THEN
        INSERT INTO alert (data_id, alert_message, severity, department, source)
        VALUES (NEW.data_id,
            'Critical aviation alert: Wind Speed is ' || ROUND(NEW.measured_value, 1) || ' km/h.',
            'Critical', 'Aviation', 'fixed');
    END IF;

    IF v_name = 'Visibility' AND NEW.measured_value <= 1 THEN
        INSERT INTO alert (data_id, alert_message, severity, department, source)
        VALUES (NEW.data_id,
            'Critical aviation alert: Visibility is only ' || ROUND(NEW.measured_value, 1) || ' km.',
            'Critical', 'Aviation', 'fixed');
    END IF;

    IF v_name = 'Humidity' AND NEW.measured_value <= 20 THEN
        INSERT INTO alert (data_id, alert_message, severity, department, source)
        VALUES (NEW.data_id,
            'Critical crop stress risk: Humidity is only ' || ROUND(NEW.measured_value, 0) || '%.',
            'Critical', 'Agriculture', 'fixed');
    END IF;

    IF v_name = 'Temperature' AND NEW.measured_value >= 43 THEN
        INSERT INTO alert (data_id, alert_message, severity, department, source)
        VALUES (NEW.data_id,
            'Critical heatwave alert: Temperature is ' || ROUND(NEW.measured_value, 1) || '°C.',
            'Critical', 'Disaster', 'fixed');
    END IF;

    IF v_name = 'Precipitation' AND NEW.measured_value >= 50 THEN
        INSERT INTO alert (data_id, alert_message, severity, department, source)
        VALUES (NEW.data_id,
            'Critical flood alert: Rainfall is ' || ROUND(NEW.measured_value, 1) || ' mm.',
            'Critical', 'Disaster', 'fixed');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_environmental_alerts ON environmental_data;
CREATE TRIGGER trg_environmental_alerts
    AFTER INSERT ON environmental_data
    FOR EACH ROW EXECUTE FUNCTION fn_environmental_alerts();

-- Now disable it — adaptive engine takes over
ALTER TABLE environmental_data DISABLE TRIGGER trg_environmental_alerts;

COMMIT;
