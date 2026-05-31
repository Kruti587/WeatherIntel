-- =============================================================
-- WeatherIntel Baseline Seed Data
-- Source: India Meteorological Department, "Climate of Karnataka"
--         (1981–2010 climate normals), published 2010.
-- Run AFTER schema.sql.
-- Uses ON CONFLICT DO NOTHING so re-running is always safe.
-- =============================================================

-- ---------------------------------------------------------------
-- Season → month mapping (for reference):
--   pre-monsoon  : March, April, May        (months 3–5)
--   monsoon      : June–September           (months 6–9)
--   post-monsoon : October, November        (months 10–11)
--   winter       : December, January, Feb   (months 12, 1–2)
-- ---------------------------------------------------------------

-- Temperature (parameter_id = 1, unit = °C)
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
    (1, 1, 'pre-monsoon',  33.5, 2.1),
    (1, 1, 'monsoon',      27.0, 1.8),
    (1, 1, 'post-monsoon', 29.5, 1.9),
    (1, 1, 'winter',       24.0, 2.3)
ON CONFLICT DO NOTHING;

-- Wind Speed (parameter_id = 2, unit = km/h)
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
    (1, 2, 'pre-monsoon',  14.0, 4.2),
    (1, 2, 'monsoon',      18.5, 5.1),
    (1, 2, 'post-monsoon', 12.0, 3.8),
    (1, 2, 'winter',       10.5, 3.2)
ON CONFLICT DO NOTHING;

-- Humidity (parameter_id = 12, unit = %)
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
    (1, 12, 'pre-monsoon',  42.0, 8.0),
    (1, 12, 'monsoon',      78.0, 6.5),
    (1, 12, 'post-monsoon', 65.0, 7.2),
    (1, 12, 'winter',       55.0, 6.8)
ON CONFLICT DO NOTHING;

-- Precipitation (parameter_id = 15, unit = mm)
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
    (1, 15, 'pre-monsoon',   4.5,  3.2),
    (1, 15, 'monsoon',      28.0, 12.0),
    (1, 15, 'post-monsoon',  8.5,  5.1),
    (1, 15, 'winter',        1.2,  1.5)
ON CONFLICT DO NOTHING;

-- Pressure (parameter_id = 13, unit = hPa)
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
    (1, 13, 'pre-monsoon',  1008.0, 3.5),
    (1, 13, 'monsoon',      1005.0, 3.0),
    (1, 13, 'post-monsoon', 1010.0, 3.2),
    (1, 13, 'winter',       1013.0, 2.8)
ON CONFLICT DO NOTHING;
