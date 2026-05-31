const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

// GET /api/regions — all regions with latest readings
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
      SELECT
        r.region_id,
        r.name,
        r.latitude,
        r.longitude,
        r.elevation,
        lw.parameter_name,
        lw.measured_value,
        lw.recorded_at
      FROM region r
      LEFT JOIN latest_weather_view lw ON lw.region_id = r.region_id
      ORDER BY r.region_id, lw.parameter_name
    `);

        // Group by region
        const regionMap = {};
        for (const row of result.rows) {
            if (!regionMap[row.region_id]) {
                regionMap[row.region_id] = {
                    region_id: row.region_id,
                    name: row.name,
                    latitude: parseFloat(row.latitude),
                    longitude: parseFloat(row.longitude),
                    elevation: parseFloat(row.elevation),
                    readings: {},
                    overall_score: 100, // placeholder — updated below
                };
            }
            if (row.parameter_name) {
                regionMap[row.region_id].readings[row.parameter_name] = {
                    value: parseFloat(row.measured_value),
                    recorded_at: row.recorded_at,
                };
            }
        }

        res.json(Object.values(regionMap));
    } catch (err) {
        console.error('Regions error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/regions/:id — single region detail
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const regionId = parseInt(req.params.id);
        if (!Number.isInteger(regionId)) return res.status(400).json({ error: 'Invalid region_id' });

        const [regionRes, baselineRes, thresholdRes] = await Promise.all([
            pool.query('SELECT * FROM region WHERE region_id = $1', [regionId]),
            pool.query('SELECT p.parameter_name, rb.season, rb.mean_value, rb.std_dev FROM regional_baseline rb JOIN parameter p ON p.parameter_id = rb.parameter_id WHERE rb.region_id = $1 ORDER BY p.parameter_name, rb.season', [regionId]),
            pool.query('SELECT p.parameter_name, at.threshold_value, at.regional_mean, at.deviation_factor, at.last_updated FROM adaptive_threshold at JOIN parameter p ON p.parameter_id = at.parameter_id WHERE at.region_id = $1', [regionId]),
        ]);

        if (!regionRes.rows[0]) return res.status(404).json({ error: 'Region not found' });

        res.json({
            ...regionRes.rows[0],
            baselines: baselineRes.rows,
            thresholds: thresholdRes.rows,
        });
    } catch (err) {
        console.error('Region detail error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/regions/:id/stability — rolling avg trend for timeline
router.get('/:id/stability', async (req, res) => {
    try {
        const pool = getPool();
        const regionId = parseInt(req.params.id);
        const result = await pool.query(`
      SELECT
        DATE(recorded_at AT TIME ZONE 'Asia/Kolkata') AS day,
        p.parameter_name,
        ROUND(AVG(ed.measured_value)::numeric, 2) AS avg_value,
        COUNT(*) AS reading_count
      FROM environmental_data ed
      JOIN parameter p ON p.parameter_id = ed.parameter_id
      WHERE ed.region_id = $1
        AND ed.recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(recorded_at AT TIME ZONE 'Asia/Kolkata'), p.parameter_name
      ORDER BY day DESC, p.parameter_name
    `, [regionId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
