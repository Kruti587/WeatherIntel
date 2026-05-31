const pool = require('../core/db');

class AlertEngine {
    /**
     * Processes new telemetry data to detect anomalies and trigger alerts.
     */
    async processTelemetry(telemetry) {
        const { region_id, parameter_id, value, telemetry_id } = telemetry;

        // 1. Get threshold config for this region/parameter
        let config = (await pool.query(
            'SELECT * FROM adaptive_threshold_config WHERE region_id = $1 AND parameter_id = $2',
            [region_id, parameter_id]
        )).rows[0];

        // 2. If no config exists, initialize it using historical data
        if (!config) {
            config = await this.initializeThreshold(region_id, parameter_id);
        }

        if (!config) return; // Still no data to build baseline

        // 3. Calculate dynamic thresholds
        const upperWarning = config.base_mean + (config.base_stddev * config.sensitivity_multiplier);
        const upperCritical = config.base_mean + (config.base_stddev * config.sensitivity_multiplier * 1.5);
        
        let severity = 'Green';
        let message = '';

        if (value >= upperCritical) {
            severity = 'Red';
            message = `CRITICAL ANOMALY: Value ${value} exceeds critical threshold ${upperCritical.toFixed(2)}`;
        } else if (value >= upperWarning) {
            severity = 'Orange';
            message = `WARNING: Value ${value} exceeds warning threshold ${upperWarning.toFixed(2)}`;
        }

        // 4. Record alert if severity is above Green
        if (severity !== 'Green') {
            await pool.query(
                `INSERT INTO geo_alert (telemetry_id, region_id, parameter_id, severity, message, recorded_value, threshold_value)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [telemetry_id, region_id, parameter_id, severity, message, value, upperWarning]
            );
            console.log(`⚠️ ALERT: [${severity}] ${message}`);

            // --- AWE INSPIRING FEATURE: CASCADING RISK SCAN ---
            // If we detect a critical anomaly, trigger a "Risk Scan" for neighboring regions
            if (severity === 'Red') {
                this.triggerCascadingScan(region_id, parameter_id).catch(console.error);
            }

            // --- SPATIO-TEMPORAL INTELLIGENCE: DRIFT DETECTION ---
            this.detectDrift(region_id, parameter_id, severity).catch(console.error);
        }

        // 5. Periodic Threshold Recalculation
        if (Math.random() < 0.1) {
            await this.updateThreshold(region_id, parameter_id);
        }
    }

    /**
     * Spatio-Temporal Intelligence: Detects if an anomaly is drifting across regions.
     */
    async detectDrift(region_id, parameter_id, severity) {
        // Check if other regions had a similar anomaly in the last 3 hours
        const driftRes = await pool.query(
            `SELECT a.region_id, r.name 
             FROM geo_alert a
             JOIN geo_region r ON a.region_id = r.region_id
             WHERE a.parameter_id = $1 
             AND a.region_id != $2
             AND a.created_at > NOW() - INTERVAL '3 hours'
             LIMIT 1`,
            [parameter_id, region_id]
        );

        if (driftRes.rows.length > 0) {
            const origin = driftRes.rows[0];
            const message = `SPATIO-TEMPORAL DRIFT: Anomaly likely migrating from ${origin.name} to Current Node.`;
            
            await pool.query(
                `INSERT INTO event_pipeline_log (event_type, source_id, action_taken, status)
                 VALUES ($1, $2, $3, $4)`,
                ['ANOMALY_DRIFT_DETECTED', region_id, message, 'PROCESSED']
            );
            console.log(`🌀 ${message}`);
        }
    }

    /**
     * Simulates a "Risk Scan" that evaluates potential impact on neighboring regions.
     */
    async triggerCascadingScan(origin_region_id, parameter_id) {
        console.log(`🔍 [SYSTEM] Initiating Cascading Risk Scan for Region ${origin_region_id}...`);
        
        // Find "neighboring" regions (simplified for this prototype as all other regions)
        const neighbors = (await pool.query(
            'SELECT region_id, name FROM geo_region WHERE region_id != $1',
            [origin_region_id]
        )).rows;

        for (const neighbor of neighbors) {
            // Log the scan activity in our event pipeline
            await pool.query(
                `INSERT INTO event_pipeline_log (event_type, source_id, action_taken, status)
                 VALUES ($1, $2, $3, $4)`,
                ['CASCADING_RISK_SCAN', neighbor.region_id, `Evaluating atmospheric drift impact from Region ${origin_region_id}`, 'PROCESSED']
            );
            
            // Randomly escalate risk in neighbors to simulate real-world environmental spread
            if (Math.random() < 0.3) {
                await pool.query(
                    `INSERT INTO geo_alert (region_id, parameter_id, severity, message)
                     VALUES ($1, $2, $3, $4)`,
                    [neighbor.region_id, parameter_id, 'Orange', `PREDICTIVE ALERT: Potential drift impact detected from neighboring anomaly.`]
                );
            }
        }
    }

    /**
     * Initializes the adaptive threshold baseline for a region/parameter.
     */
    async initializeThreshold(region_id, parameter_id) {
        // Fetch last 30 readings to establish baseline
        const res = await pool.query(
            `SELECT value FROM telemetry_data 
             WHERE region_id = $1 AND parameter_id = $2 
             ORDER BY recorded_at DESC LIMIT 50`,
            [region_id, parameter_id]
        );

        if (res.rows.length < 10) return null; // Need at least 10 readings for a baseline

        const values = res.rows.map(r => parseFloat(r.value));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stddev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / values.length) || 0.1;

        const insertRes = await pool.query(
            `INSERT INTO adaptive_threshold_config (region_id, parameter_id, base_mean, base_stddev)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (region_id, parameter_id) DO UPDATE 
             SET base_mean = EXCLUDED.base_mean, base_stddev = EXCLUDED.base_stddev, last_updated = NOW()
             RETURNING *`,
            [region_id, parameter_id, mean, stddev]
        );

        return insertRes.rows[0];
    }

    async updateThreshold(region_id, parameter_id) {
        return this.initializeThreshold(region_id, parameter_id);
    }
}

module.exports = new AlertEngine();
