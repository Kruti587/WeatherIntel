-- =============================================================
-- WeatherIntel Database Views
-- Run AFTER schema.sql and indexes.sql.
-- All use CREATE OR REPLACE so re-running is safe.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. latest_weather_view
--    Most recent reading per (region, parameter).
--    Used by GET /api/latest-weather as the DB fallback when
--    the live OpenWeatherMap call fails.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW latest_weather_view AS
SELECT DISTINCT ON (ed.region_id, p.parameter_name)
    ed.region_id,
    p.parameter_name,
    p.unit_measure,
    ed.measured_value,
    ed.recorded_at
FROM environmental_data ed
JOIN parameter p ON ed.parameter_id = p.parameter_id
ORDER BY ed.region_id, p.parameter_name, ed.recorded_at DESC;

-- ---------------------------------------------------------------
-- 2. rolling_average_view
--    30-day rolling average per (region, parameter).
--    This is what the adaptive threshold engine reads to compute
--    regional_mean. One row per pair, updated automatically as
--    new readings arrive (it's a live view, not materialized).
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW rolling_average_view AS
SELECT
    region_id,
    parameter_id,
    ROUND(AVG(measured_value)::numeric, 2) AS rolling_avg,
    COUNT(*)                               AS reading_count
FROM environmental_data
WHERE recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY region_id, parameter_id;

-- ---------------------------------------------------------------
-- 3. daily_weather_summary_view
--    Per-day averages, min, max for each parameter.
--    Used by the daily report and the analysis page history.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW daily_weather_summary_view AS
SELECT
    (ed.recorded_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
    p.parameter_name,
    p.unit_measure,
    ROUND(AVG(ed.measured_value)::numeric, 2) AS avg_value,
    ROUND(MIN(ed.measured_value)::numeric, 2) AS min_value,
    ROUND(MAX(ed.measured_value)::numeric, 2) AS max_value,
    COUNT(*) AS reading_count
FROM environmental_data ed
JOIN parameter p ON ed.parameter_id = p.parameter_id
GROUP BY
    (ed.recorded_at AT TIME ZONE 'Asia/Kolkata')::date,
    p.parameter_name,
    p.unit_measure;

-- ---------------------------------------------------------------
-- 4. daily_weather_pivot_view
--    One row per day with each parameter as its own column.
--    Used by the DB Reports tab daily summary table.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW daily_weather_pivot_view AS
SELECT
    day,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Temperature')   AS avg_temperature,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Wind Speed')    AS avg_wind_speed,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Visibility')    AS avg_visibility,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Humidity')      AS avg_humidity,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Pressure')      AS avg_pressure,
    MAX(avg_value) FILTER (WHERE parameter_name = 'Precipitation') AS avg_precipitation,
    SUM(reading_count) AS total_readings
FROM daily_weather_summary_view
GROUP BY day
ORDER BY day DESC;

-- ---------------------------------------------------------------
-- 5. department_alerts_view
--    Alert counts grouped by department and severity.
--    Used by the admin summary endpoint.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW department_alerts_view AS
SELECT
    department,
    severity,
    COUNT(*) AS alert_count,
    MAX(created_at) AS latest_alert_at
FROM alert
GROUP BY department, severity;

-- ---------------------------------------------------------------
-- 6. critical_alerts_view
--    All Critical alerts, newest first.
--    Used for benchmarking and the research fatigue comparison.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW critical_alerts_view AS
SELECT *
FROM alert
WHERE severity = 'Critical'
ORDER BY created_at DESC;
