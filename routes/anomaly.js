const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

// ── GET /api/anomaly-report ───────────────────────────────────
// Returns Z-score anomaly summary per region + parameter.
// This is the "dual-layer detection" research contribution:
//   Layer 1: adaptive threshold (relative exceedance)
//   Layer 2: Z-score (absolute statistical deviation from IMD baseline)
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const { region_id, parameter, level } = req.query;

        let query = `SELECT * FROM anomaly_summary_view`;
        const filters = [];
        const values = [];

        if (region_id) {
            values.push(parseInt(region_id));
            filters.push(`region_id = $${values.length}`);
        }
        if (parameter) {
            values.push(parameter);
            filters.push(`parameter_name ILIKE $${values.length}`);
        }

        if (filters.length) query += ` WHERE ${filters.join(' AND ')}`;
        query += ` ORDER BY avg_abs_z_score DESC`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error('Anomaly report error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/anomaly-report/recent ───────────────────────────
// Returns individual anomalous readings (Z > 2.5) from last 7 days.
// Useful for the dashboard "recent anomalies" feed.
router.get('/recent', async (req, res) => {
    try {
        const pool = getPool();
        const { region_id, limit = 50 } = req.query;

        let query = `
      SELECT *
      FROM anomaly_score_view
      WHERE anomaly_level IN ('Anomaly', 'Extreme')
        AND recorded_at >= NOW() - INTERVAL '7 days'
    `;
        const values = [];

        if (region_id) {
            values.push(parseInt(region_id));
            query += ` AND region_id = $${values.length}`;
        }

        values.push(Math.min(parseInt(limit) || 50, 200));
        query += ` ORDER BY ABS(z_score) DESC, recorded_at DESC LIMIT $${values.length}`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error('Recent anomalies error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/anomaly-report/regions ──────────────────────────
// Returns all regions with their current anomaly status.
// Powers the map marker colours.
router.get('/regions', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
      SELECT
        r.region_id,
        r.name,
        r.latitude,
        r.longitude,
        r.elevation,
        COALESCE(s.extreme_count, 0)  AS extreme_count,
        COALESCE(s.anomaly_count, 0)  AS anomaly_count,
        COALESCE(s.unusual_count, 0)  AS unusual_count,
        COALESCE(s.avg_abs_z_score, 0) AS avg_z_score,
        -- Overall status for map marker colour
        CASE
          WHEN COALESCE(s.extreme_count, 0) > 0 THEN 'Extreme'
          WHEN COALESCE(s.anomaly_count, 0) > 0 THEN 'Anomaly'
          WHEN COALESCE(s.unusual_count, 0) > 0 THEN 'Unusual'
          ELSE 'Normal'
        END AS status
      FROM region r
      LEFT JOIN (
        SELECT region_id,
               SUM(extreme_count) AS extreme_count,
               SUM(anomaly_count) AS anomaly_count,
               SUM(unusual_count) AS unusual_count,
               AVG(avg_abs_z_score) AS avg_abs_z_score
        FROM anomaly_summary_view
        GROUP BY region_id
      ) s ON s.region_id = r.region_id
      ORDER BY r.region_id
    `);
        res.json(result.rows);
    } catch (err) {
        console.error('Region anomaly status error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
