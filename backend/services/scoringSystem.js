const pool = require('../core/db');

class ScoringSystem {
    /**
     * Calculates the Region Health Score based on multi-parameter telemetry.
     * Formula: Score = 100 - (Weighted Sum of Anomalies + Variance Factor)
     */
    async calculateHealth(region_id) {
        // 1. Get latest telemetry for all parameters in the region
        const latestRes = await pool.query(
            `SELECT p.code, t.value, t.recorded_at, c.base_mean, c.base_stddev
             FROM geo_parameter p
             JOIN telemetry_data t ON t.parameter_id = p.parameter_id
             LEFT JOIN adaptive_threshold_config c ON c.region_id = t.region_id AND c.parameter_id = t.parameter_id
             WHERE t.region_id = $1
             AND t.recorded_at > NOW() - INTERVAL '1 hour'
             ORDER BY t.recorded_at DESC`,
            [region_id]
        );

        if (latestRes.rows.length === 0) return;

        // Group by parameter and get the latest value
        const latestByParam = {};
        latestRes.rows.forEach(row => {
            if (!latestByParam[row.code]) latestByParam[row.code] = row;
        });

        let penalty = 0;
        let paramsCount = 0;

        for (const code in latestByParam) {
            const data = latestByParam[code];
            if (data.base_mean === null) continue;

            const zScore = Math.abs((data.value - data.base_mean) / (data.base_stddev || 1));
            
            // Penalty increases as z-score grows
            if (zScore > 3) penalty += 20; // Critical deviation
            else if (zScore > 2) penalty += 10; // Warning deviation
            else if (zScore > 1) penalty += 2;  // Minor deviation

            paramsCount++;
        }

        const overallScore = Math.max(0, 100 - penalty);
        
        // 2. Recalculate stability index using the new SQL Intelligence function
        const esiRes = await pool.query('SELECT fn_calculate_esi($1) as esi', [region_id]);
        const stabilityIndex = esiRes.rows[0].esi;

        let riskLevel = 'Low';
        if (overallScore < 40) riskLevel = 'Extreme';
        else if (overallScore < 60) riskLevel = 'High';
        else if (overallScore < 85) riskLevel = 'Moderate';

        // 3. Save the score
        await pool.query(
            `INSERT INTO region_health_score (region_id, overall_score, risk_level, stability_index)
             VALUES ($1, $2, $3, $4)`,
            [region_id, overallScore, riskLevel, stabilityIndex]
        );

        console.log(`📊 Health Score for Region ${region_id}: ${overallScore} (${riskLevel})`);
        return { overallScore, riskLevel };
    }

    async runPeriodicScoring() {
        const regions = (await pool.query('SELECT region_id FROM geo_region')).rows;
        for (const region of regions) {
            await this.calculateHealth(region.region_id);
        }
    }
}

module.exports = new ScoringSystem();
