const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

router.get('/admin-summary', async (req, res) => {
  try {
    const pool = getPool();
    const [
      readings,
      alerts,
      criticalAlerts,
      latestReading,
      latestForecast,
      departmentCounts,
    ] = await Promise.all([
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
      total_readings: readings.rows[0].count,
      total_alerts: alerts.rows[0].count,
      critical_alerts: criticalAlerts.rows[0].count,
      latest_sync: latestReading.rows[0].latest_sync,
      latest_forecast_sync: latestForecast.rows[0].latest_forecast_sync,
      department_counts: departmentCounts.rows,
      top_department: departmentCounts.rows[0] || null,
    });
  } catch (err) {
    console.error('Admin Summary Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily-report', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT
        TO_CHAR(calendar.day, 'YYYY-MM-DD') AS day,
        report.avg_temperature,
        report.avg_wind_speed,
        report.avg_visibility,
        report.avg_humidity,
        report.avg_pressure,
        report.avg_precipitation,
        COALESCE(report.total_readings, 0) AS total_readings
      FROM generate_series(
        CURRENT_DATE - INTERVAL '9 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS calendar(day)
      LEFT JOIN daily_weather_pivot_view report ON report.day = calendar.day::date
      ORDER BY calendar.day DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Daily Report Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;