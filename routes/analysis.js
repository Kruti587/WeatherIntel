const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { getAnalysis } = require('../services/weatherService');

router.get('/', async (req, res) => {
  try {
    const parameters = await getAnalysis();
    const pool = getPool();
    const [readings, alerts, criticalAlerts, latestReading, latestForecast, departmentCounts] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM environmental_data'),
      pool.query('SELECT COUNT(*)::int AS count FROM alert'),
      pool.query("SELECT COUNT(*)::int AS count FROM alert WHERE severity = 'Critical'"),
      pool.query('SELECT MAX(recorded_at) AS latest_sync FROM environmental_data'),
      pool.query('SELECT MAX(created_at) AS latest_forecast_sync FROM forecast_data'),
      pool.query(`
        SELECT department, SUM(alert_count)::int AS alert_count
        FROM department_alerts_view
        GROUP BY department
        ORDER BY alert_count DESC
      `),
    ]);

    res.json({
      city: process.env.TARGET_CITY || 'Bengaluru',
      generated_at: new Date().toISOString(),
      parameters,
      summary: {
        total_readings: readings.rows[0].count,
        total_alerts: alerts.rows[0].count,
        critical_alerts: criticalAlerts.rows[0].count,
        latest_sync: latestReading.rows[0].latest_sync,
        latest_forecast_sync: latestForecast.rows[0].latest_forecast_sync,
        department_counts: departmentCounts.rows,
        top_department: departmentCounts.rows[0] || null,
      },
    });
  } catch (err) {
    console.error('Analysis Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;