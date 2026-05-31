const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { getLiveWeatherRows } = require('../services/weatherService');

router.get('/', async (req, res) => {
  try {
    return res.json(await getLiveWeatherRows());
  } catch (liveErr) {
    console.error('Live weather fetch failed, falling back to database:', liveErr.message);
    try {
      const pool = getPool();
      const latest = await pool.query(`
        SELECT parameter_name, measured_value, recorded_at AS timestamp
        FROM latest_weather_view
      `);
      res.json(latest.rows);
    } catch (dbErr) {
      res.status(500).send(dbErr.message);
    }
  }
});

module.exports = router;