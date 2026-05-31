/**
 * telemetry.js — Telemetry routes for the React frontend.
 *
 * GET /api/telemetry/latest/:regionId
 *   Returns the latest reading per parameter for a region,
 *   shaped to match the Telemetry interface the frontend expects.
 *
 * GET /api/telemetry/snapshot?time=<ISO>
 *   Returns the most recent reading per (region, parameter) up to `time`.
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

// GET /api/telemetry/latest/:regionId
router.get('/latest/:regionId', async (req, res) => {
    const regionId = parseInt(req.params.regionId, 10);
    if (!Number.isInteger(regionId)) {
        return res.status(400).json({ error: 'Invalid regionId' });
    }

    try {
        const pool = getPool();

        // Use latest_weather_view which already has the most recent reading per parameter
        const result = await pool.query(
            `SELECT
         p.parameter_id,
         p.parameter_name  AS name,
         UPPER(REPLACE(p.parameter_name, ' ', '_')) AS code,
         lw.measured_value AS value,
         p.unit_measure    AS unit,
         lw.recorded_at    AS timestamp,
         lw.region_id
       FROM latest_weather_view lw
       JOIN parameter p ON p.parameter_name = lw.parameter_name
       WHERE lw.region_id = $1
       ORDER BY p.parameter_name`,
            [regionId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Telemetry latest error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/telemetry/snapshot?time=<ISO>
router.get('/snapshot', async (req, res) => {
    const time = req.query.time || new Date().toISOString();

    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT DISTINCT ON (ed.region_id, ed.parameter_id)
         ed.region_id,
         ed.parameter_id,
         ed.measured_value AS value,
         p.unit_measure    AS unit,
         ed.recorded_at
       FROM environmental_data ed
       JOIN parameter p ON p.parameter_id = ed.parameter_id
       WHERE ed.recorded_at <= $1
       ORDER BY ed.region_id, ed.parameter_id, ed.recorded_at DESC`,
            [time]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Telemetry snapshot error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
