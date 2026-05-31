-- =============================================================
-- WeatherIntel Composite Indexes
-- Run AFTER schema.sql.
-- All use IF NOT EXISTS so re-running is safe.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. environmental_data — speeds up the rolling average query
--    and latest-weather lookup, both filtered by region + parameter
--    and ordered by time descending.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_env_data_region_param_time
    ON environmental_data(region_id, parameter_id, recorded_at DESC);

-- ---------------------------------------------------------------
-- 2. alert — speeds up the per-department alert lookups used by
--    the Aviation / Agriculture / Disaster tabs and the fatigue report.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_alert_dept_time
    ON alert(department, created_at DESC);

-- ---------------------------------------------------------------
-- 3. adaptive_threshold — speeds up the threshold lookup that
--    happens on every single reading ingestion.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_adaptive_threshold_region_param
    ON adaptive_threshold(region_id, parameter_id);

-- ---------------------------------------------------------------
-- 4. forecast_data — kept from original schema
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_forecast_data_parameter_time
    ON forecast_data(parameter_id, forecast_time DESC);
