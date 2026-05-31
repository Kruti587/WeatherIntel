-- =============================================================
-- Karnataka Multi-Region Seed
-- Adds 4 more Karnataka cities with IMD 1981-2010 climate normals.
-- Source: IMD "Climate of Karnataka", 2010.
-- Run AFTER schema.sql and seed.sql.
-- =============================================================

-- ── New regions ───────────────────────────────────────────────
INSERT INTO region (region_id, name, latitude, longitude, elevation) VALUES
  (2, 'Mysuru',    12.2958, 76.6394, 763.00),
  (3, 'Mangaluru', 12.9141, 74.8560,  22.00),
  (4, 'Hubli',     15.3647, 75.1240, 672.00),
  (5, 'Hassan',    13.0068, 76.1004, 975.00)
ON CONFLICT DO NOTHING;

-- ── Mysuru (region_id = 2) ────────────────────────────────────
-- Slightly hotter pre-monsoon than Bengaluru, similar monsoon
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
  -- Temperature
  (2, 1, 'pre-monsoon',  35.2, 2.3), (2, 1, 'monsoon',      27.5, 1.9),
  (2, 1, 'post-monsoon', 30.1, 2.0), (2, 1, 'winter',       23.5, 2.4),
  -- Wind Speed
  (2, 2, 'pre-monsoon',  13.5, 4.0), (2, 2, 'monsoon',      17.8, 4.9),
  (2, 2, 'post-monsoon', 11.5, 3.6), (2, 2, 'winter',       10.0, 3.0),
  -- Humidity
  (2, 12, 'pre-monsoon',  40.0, 7.8), (2, 12, 'monsoon',      76.0, 6.2),
  (2, 12, 'post-monsoon', 63.0, 7.0), (2, 12, 'winter',       53.0, 6.5),
  -- Precipitation
  (2, 15, 'pre-monsoon',   5.0, 3.5), (2, 15, 'monsoon',      32.0, 13.0),
  (2, 15, 'post-monsoon',  9.0, 5.5), (2, 15, 'winter',        1.5,  1.8),
  -- Pressure
  (2, 13, 'pre-monsoon',  1007.0, 3.4), (2, 13, 'monsoon',    1004.5, 2.9),
  (2, 13, 'post-monsoon', 1009.5, 3.1), (2, 13, 'winter',     1012.5, 2.7)
ON CONFLICT DO NOTHING;

-- ── Mangaluru (region_id = 3) ─────────────────────────────────
-- Coastal city: very high monsoon humidity (85%), heavy rainfall
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
  -- Temperature
  (3, 1, 'pre-monsoon',  33.0, 1.8), (3, 1, 'monsoon',      28.5, 1.5),
  (3, 1, 'post-monsoon', 31.0, 1.7), (3, 1, 'winter',       28.0, 1.6),
  -- Wind Speed
  (3, 2, 'pre-monsoon',  16.0, 5.0), (3, 2, 'monsoon',      28.0, 7.5),
  (3, 2, 'post-monsoon', 14.0, 4.5), (3, 2, 'winter',       12.0, 3.8),
  -- Humidity
  (3, 12, 'pre-monsoon',  72.0, 6.0), (3, 12, 'monsoon',      85.0, 4.5),
  (3, 12, 'post-monsoon', 78.0, 5.5), (3, 12, 'winter',       70.0, 5.8),
  -- Precipitation (Mangaluru gets ~3500mm/year — highest in Karnataka)
  (3, 15, 'pre-monsoon',  12.0,  6.0), (3, 15, 'monsoon',     180.0, 45.0),
  (3, 15, 'post-monsoon', 25.0, 12.0), (3, 15, 'winter',        3.0,  2.5),
  -- Pressure
  (3, 13, 'pre-monsoon',  1009.0, 3.2), (3, 13, 'monsoon',    1003.0, 3.5),
  (3, 13, 'post-monsoon', 1008.0, 3.0), (3, 13, 'winter',     1011.0, 2.8)
ON CONFLICT DO NOTHING;

-- ── Hubli (region_id = 4) ─────────────────────────────────────
-- North Karnataka: hotter, drier, more extreme temperature range
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
  -- Temperature (hottest city in Karnataka pre-monsoon)
  (4, 1, 'pre-monsoon',  38.5, 2.8), (4, 1, 'monsoon',      28.0, 2.1),
  (4, 1, 'post-monsoon', 31.5, 2.3), (4, 1, 'winter',       22.0, 3.0),
  -- Wind Speed
  (4, 2, 'pre-monsoon',  18.0, 5.5), (4, 2, 'monsoon',      22.0, 6.0),
  (4, 2, 'post-monsoon', 14.0, 4.2), (4, 2, 'winter',       11.0, 3.5),
  -- Humidity (much drier than south Karnataka)
  (4, 12, 'pre-monsoon',  28.0, 7.0), (4, 12, 'monsoon',      65.0, 8.0),
  (4, 12, 'post-monsoon', 52.0, 7.5), (4, 12, 'winter',       42.0, 6.5),
  -- Precipitation
  (4, 15, 'pre-monsoon',   3.0, 2.5), (4, 15, 'monsoon',      18.0, 9.0),
  (4, 15, 'post-monsoon',  5.0, 3.8), (4, 15, 'winter',        0.8, 1.2),
  -- Pressure
  (4, 13, 'pre-monsoon',  1006.0, 4.0), (4, 13, 'monsoon',    1003.5, 3.8),
  (4, 13, 'post-monsoon', 1009.0, 3.5), (4, 13, 'winter',     1013.5, 3.0)
ON CONFLICT DO NOTHING;

-- ── Hassan (region_id = 5) ────────────────────────────────────
-- High elevation (975m), cooler than Bengaluru, good rainfall
INSERT INTO regional_baseline (region_id, parameter_id, season, mean_value, std_dev) VALUES
  -- Temperature (coolest Karnataka city due to elevation)
  (5, 1, 'pre-monsoon',  31.5, 2.0), (5, 1, 'monsoon',      25.5, 1.7),
  (5, 1, 'post-monsoon', 28.0, 1.8), (5, 1, 'winter',       21.5, 2.2),
  -- Wind Speed
  (5, 2, 'pre-monsoon',  12.0, 3.8), (5, 2, 'monsoon',      16.0, 4.5),
  (5, 2, 'post-monsoon', 10.5, 3.4), (5, 2, 'winter',        9.0, 2.9),
  -- Humidity
  (5, 12, 'pre-monsoon',  48.0, 8.5), (5, 12, 'monsoon',      80.0, 6.0),
  (5, 12, 'post-monsoon', 68.0, 7.0), (5, 12, 'winter',       58.0, 6.5),
  -- Precipitation
  (5, 15, 'pre-monsoon',   6.0, 4.0), (5, 15, 'monsoon',      38.0, 15.0),
  (5, 15, 'post-monsoon', 11.0, 6.0), (5, 15, 'winter',        2.0,  2.0),
  -- Pressure
  (5, 13, 'pre-monsoon',  1007.5, 3.3), (5, 13, 'monsoon',    1004.0, 3.0),
  (5, 13, 'post-monsoon', 1009.5, 3.2), (5, 13, 'winter',     1012.0, 2.8)
ON CONFLICT DO NOTHING;
