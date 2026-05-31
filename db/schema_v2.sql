-- =============================================================
-- GeoSpatial Environmental Intelligence Platform (GeoEnv-IP)
-- Database Schema V2 (PostGIS Fallback to Standard SQL)
-- =============================================================

BEGIN;

-- 1. Telemetry Parameter Definition
CREATE TABLE IF NOT EXISTS geo_parameter (
    parameter_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'THRM', 'AERL', 'NDVI'
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    min_threshold DECIMAL,
    max_threshold DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Spatial Regions (Using JSONB for Boundary Fallback)
CREATE TABLE IF NOT EXISTS geo_region (
    region_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    boundary_json JSONB,              -- GeoJSON Polygon fallback
    center_lat DECIMAL(9,6),          -- Centroid Latitude
    center_lon DECIMAL(9,6),          -- Centroid Longitude
    metadata JSONB,                   -- Additional region info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Environmental Telemetry (Partitioned by Time)
CREATE TABLE IF NOT EXISTS telemetry_data (
    telemetry_id BIGSERIAL,
    region_id INT REFERENCES geo_region(region_id),
    parameter_id INT REFERENCES geo_parameter(parameter_id),
    value DECIMAL NOT NULL,
    lat DECIMAL(9,6),                -- Latitude
    lon DECIMAL(9,6),                -- Longitude
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,                 -- Satellite ID, confidence score, etc.
    PRIMARY KEY (telemetry_id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create initial partitions
CREATE TABLE IF NOT EXISTS telemetry_data_y2026_m05 PARTITION OF telemetry_data
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX IF NOT EXISTS idx_telemetry_data_coords ON telemetry_data (lat, lon);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_recorded_at ON telemetry_data (recorded_at DESC);

-- 4. Adaptive Alert Thresholds
CREATE TABLE IF NOT EXISTS adaptive_threshold_config (
    config_id SERIAL PRIMARY KEY,
    region_id INT REFERENCES geo_region(region_id),
    parameter_id INT REFERENCES geo_parameter(parameter_id),
    base_mean DECIMAL NOT NULL,
    base_stddev DECIMAL NOT NULL,
    sensitivity_multiplier DECIMAL DEFAULT 2.0,
    update_window_days INT DEFAULT 30,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, parameter_id)
);

-- 5. Environmental Alerts (Event Log)
CREATE TABLE IF NOT EXISTS geo_alert (
    alert_id SERIAL PRIMARY KEY,
    telemetry_id BIGINT,
    region_id INT REFERENCES geo_region(region_id),
    parameter_id INT REFERENCES geo_parameter(parameter_id),
    severity VARCHAR(20) CHECK (severity IN ('Green', 'Yellow', 'Orange', 'Red')),
    message TEXT NOT NULL,
    recorded_value DECIMAL,
    threshold_value DECIMAL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Acknowledged', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Environmental Intelligence Scores
CREATE TABLE IF NOT EXISTS region_health_score (
    score_id SERIAL PRIMARY KEY,
    region_id INT REFERENCES geo_region(region_id),
    overall_score DECIMAL CHECK (overall_score BETWEEN 0 AND 100),
    stability_index DECIMAL,
    pollution_index DECIMAL,
    risk_level VARCHAR(20),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Seed Core Parameters
INSERT INTO geo_parameter (name, code, unit, description, min_threshold, max_threshold) VALUES
('Thermal Intensity', 'THRM', 'K', 'Surface temperature intensity from satellite thermal bands', 250, 330),
('Aerosol Optical Depth', 'AOD', 'ratio', 'Measure of particulate matter in the atmosphere', 0, 1.5),
('Atmospheric Moisture', 'HUM', '%', 'Relative humidity at ground level', 0, 100),
('Vegetation Index (NDVI)', 'NDVI', 'ratio', 'Normalized Difference Vegetation Index for biomass health', -1, 1),
('Cloud Coverage', 'CLD', '%', 'Percentage of sky covered by clouds', 0, 100),
('Rainfall Intensity', 'RAIN', 'mm/h', 'Precipitation rate estimated from satellite radar', 0, 200),
('Pollution Estimation (NO2)', 'NO2', 'ppb', 'Nitrogen Dioxide concentration in the troposphere', 0, 500)
ON CONFLICT (code) DO NOTHING;

-- 8. Seed Sample Regions (Bengaluru, etc.)
INSERT INTO geo_region (name, code, center_lat, center_lon, boundary_json) VALUES
('Bengaluru Urban', 'BLR_URBAN', 12.9716, 77.5946, '{"type": "Polygon", "coordinates": [[[77.5, 12.9], [77.7, 12.9], [77.7, 13.1], [77.5, 13.1], [77.5, 12.9]]]}'),
('Western Ghats North', 'WGN_01', 15.3173, 74.1240, '{"type": "Polygon", "coordinates": [[[74.0, 15.0], [74.5, 15.0], [74.5, 15.5], [74.0, 15.5], [74.0, 15.0]]]}')
ON CONFLICT (code) DO NOTHING;

COMMIT;
