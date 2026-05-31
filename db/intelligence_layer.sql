-- =============================================================
-- GeoEnv-IP Advanced DBMS Intelligence Layer
-- Implements Phase 4 (PostGIS Queries) and Phase 8 (Advanced Logic)
-- =============================================================

BEGIN;

-- 1. Create a function to automatically generate alerts based on adaptive thresholds
-- This moves intelligence from the app layer (Node.js) directly into the database
CREATE OR REPLACE FUNCTION fn_adaptive_alert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold DECIMAL;
    v_severity VARCHAR(20);
    v_message TEXT;
    v_param_name VARCHAR(100);
BEGIN
    -- Get the current threshold for this region/parameter
    SELECT (base_mean + (base_stddev * sensitivity_multiplier))
    INTO v_threshold
    FROM adaptive_threshold_config
    WHERE region_id = NEW.region_id AND parameter_id = NEW.parameter_id;

    -- Get parameter name for the message
    SELECT name INTO v_param_name FROM geo_parameter WHERE parameter_id = NEW.parameter_id;

    -- Logic: If value exceeds threshold, generate an alert
    IF v_threshold IS NOT NULL AND NEW.value > v_threshold THEN
        IF NEW.value > (v_threshold * 1.5) THEN
            v_severity := 'Red';
            v_message := 'CRITICAL DBMS-NATIVE ALERT: ' || v_param_name || ' (' || NEW.value || ') is 50% above adaptive threshold (' || ROUND(v_threshold, 2) || ')';
        ELSE
            v_severity := 'Orange';
            v_message := 'ADAPTIVE WARNING: ' || v_param_name || ' (' || NEW.value || ') exceeded regional baseline (' || ROUND(v_threshold, 2) || ')';
        END IF;

        INSERT INTO geo_alert (telemetry_id, region_id, parameter_id, severity, message, recorded_value, threshold_value)
        VALUES (NEW.telemetry_id, NEW.region_id, NEW.parameter_id, v_severity, v_message, NEW.value, v_threshold);
        
        -- Also log this to the event pipeline
        INSERT INTO event_pipeline_log (event_type, source_id, action_taken, status)
        VALUES ('DB_NATIVE_ALERT', NEW.telemetry_id, 'Generated ' || v_severity || ' alert for ' || v_param_name, 'SUCCESS');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to telemetry_data
DROP TRIGGER IF EXISTS trg_adaptive_alert ON telemetry_data;
CREATE TRIGGER trg_adaptive_alert
AFTER INSERT ON telemetry_data
FOR EACH ROW
EXECUTE FUNCTION fn_adaptive_alert_trigger();

-- 2. Advanced PostGIS Analysis Views
-- View to detect "Hotspots" (Regions with frequent critical alerts in last 24h)
CREATE OR REPLACE VIEW v_regional_hotspots AS
SELECT 
    r.region_id,
    r.name,
    COUNT(a.alert_id) as alert_count,
    MAX(a.created_at) as last_incident,
    CASE 
        WHEN COUNT(a.alert_id) > 10 THEN 'EXTREME'
        WHEN COUNT(a.alert_id) > 5 THEN 'HIGH'
        ELSE 'MODERATE'
    END as hotspot_status
FROM geo_region r
JOIN geo_alert a ON r.region_id = a.region_id
WHERE a.created_at > NOW() - INTERVAL '24 hours'
AND a.severity IN ('Red', 'Orange')
GROUP BY r.region_id, r.name;

-- View for Time-Series Trends (Phase 4.4)
-- Shows current value vs previous value per region/parameter
CREATE OR REPLACE VIEW v_telemetry_trends AS
SELECT 
    t.recorded_at,
    r.name as region_name,
    p.code as parameter_code,
    t.value as current_value,
    LAG(t.value) OVER (
        PARTITION BY t.region_id, t.parameter_id 
        ORDER BY t.recorded_at
    ) as previous_value,
    (t.value - LAG(t.value) OVER (
        PARTITION BY t.region_id, t.parameter_id 
        ORDER BY t.recorded_at
    )) as delta
FROM telemetry_data t
JOIN geo_region r ON t.region_id = r.region_id
JOIN geo_parameter p ON t.parameter_id = p.parameter_id
ORDER BY t.recorded_at DESC;

-- 3. Environmental Stability Index (ESI) Refinement (Phase 8.1)
-- A stored procedure to recalculate ESI with a more complex formula
CREATE OR REPLACE FUNCTION fn_calculate_esi(p_region_id INT)
RETURNS DECIMAL AS $$
DECLARE
    v_esi DECIMAL;
    v_anomaly_count INT;
    v_avg_score DECIMAL;
BEGIN
    -- Count alerts in the last hour
    SELECT COUNT(*) INTO v_anomaly_count 
    FROM geo_alert 
    WHERE region_id = p_region_id AND created_at > NOW() - INTERVAL '1 hour';

    -- Get average health score from recent records
    SELECT AVG(overall_score) INTO v_avg_score
    FROM region_health_score
    WHERE region_id = p_region_id AND calculated_at > NOW() - INTERVAL '6 hours';

    -- Advanced ESI Formula: 
    -- Base 100 - (Anomalies * 5) - (Variance from 100)
    v_esi := COALESCE(v_avg_score, 100) - (v_anomaly_count * 2.5);
    
    -- Clamp between 0 and 100
    IF v_esi > 100 THEN v_esi := 100; END IF;
    IF v_esi < 0 THEN v_esi := 0; END IF;

    RETURN ROUND(v_esi, 2);
END;
$$ LANGUAGE plpgsql;

COMMIT;
