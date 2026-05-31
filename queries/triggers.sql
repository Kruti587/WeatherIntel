CREATE OR REPLACE FUNCTION fn_environmental_alerts() RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT parameter_name INTO v_name
    FROM parameter
    WHERE parameter_id = NEW.parameter_id;

    IF v_name = 'Wind Speed' AND NEW.measured_value >= 80 THEN
        INSERT INTO alert (data_id, alert_message, severity, department)
        VALUES (
            NEW.data_id,
            'Critical aviation alert: Wind Speed is ' || ROUND(NEW.measured_value, 1) || ' km/h. Aircraft takeoff and landing become unsafe because strong crosswinds can push planes off course.',
            'Critical',
            'Aviation'
        );
    END IF;

    IF v_name = 'Visibility' AND NEW.measured_value <= 1 THEN
        INSERT INTO alert (data_id, alert_message, severity, department)
        VALUES (
            NEW.data_id,
            'Critical aviation alert: Visibility is only ' || ROUND(NEW.measured_value, 1) || ' km. Pilots may not see the runway clearly during landing or takeoff.',
            'Critical',
            'Aviation'
        );
    END IF;

    IF v_name = 'Humidity' AND NEW.measured_value <= 20 THEN
        INSERT INTO alert (data_id, alert_message, severity, department)
        VALUES (
            NEW.data_id,
            'Critical crop stress risk: Humidity is only ' || ROUND(NEW.measured_value, 0) || '%. The air is very dry, so soil and leaves lose water quickly; crops can wilt unless irrigation is increased.',
            'Critical',
            'Agriculture'
        );
    END IF;

    IF v_name = 'Temperature' AND NEW.measured_value >= 43 THEN
        INSERT INTO alert (data_id, alert_message, severity, department)
        VALUES (
            NEW.data_id,
            'Critical heatwave alert: Temperature is ' || ROUND(NEW.measured_value, 1) || '°C. This level of heat can cause heat illness and dry vegetation, increasing fire risk.',
            'Critical',
            'Disaster'
        );
    END IF;

    IF v_name = 'Precipitation' AND NEW.measured_value >= 50 THEN
        INSERT INTO alert (data_id, alert_message, severity, department)
        VALUES (
            NEW.data_id,
            'Critical flood alert: Rainfall is ' || ROUND(NEW.measured_value, 1) || ' mm. Heavy rain can quickly fill drains, low roads, and fields with water.',
            'Critical',
            'Disaster'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_environmental_alerts ON environmental_data;
CREATE TRIGGER trg_environmental_alerts
AFTER INSERT ON environmental_data
FOR EACH ROW
EXECUTE FUNCTION fn_environmental_alerts();

-- ---------------------------------------------------------------
-- Trigger to keep only the latest 50 alerts in the database (FIFO)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_limit_alerts()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM alert
    WHERE alert_id NOT IN (
        SELECT alert_id
        FROM alert
        ORDER BY created_at DESC, alert_id DESC
        LIMIT 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_limit_alerts ON alert;
CREATE TRIGGER trg_limit_alerts
AFTER INSERT ON alert
FOR EACH ROW
EXECUTE FUNCTION fn_limit_alerts();

