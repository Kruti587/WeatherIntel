const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { queryAlerts, queryAlertUpdates } = require('../db/alertQueries');
const { writeApiKey } = require('../middleware/security');

router.get('/', async (req, res) => {
  try {
    const { department, severity, limit = 10 } = req.query;
    const alerts = await queryAlerts(await getPool(), { department, severity, limit: Number(limit) || 10 });
    res.json(alerts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json([]);
  }
});

router.get('/updates', async (req, res) => {
  try {
    const { after_id, limit = 50 } = req.query;
    const alerts = await queryAlertUpdates(await getPool(), { afterId: after_id, limit: Number(limit) || 50 });
    res.json(alerts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json([]);
  }
});

router.get('/export', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT alert_id, department, severity, alert_message, created_at
      FROM alert
      ORDER BY created_at DESC
      LIMIT 200
    `);
    const header = 'alert_id,department,severity,alert_message,created_at';
    const lines = result.rows.map(row => [
      row.alert_id,
      row.department,
      row.severity,
      `"${String(row.alert_message).replace(/"/g, '""')}"`,
      row.created_at,
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="weather-alerts.csv"');
    res.send([header, ...lines].join('\n'));
  } catch (err) {
    console.error('Alert Export Error:', err.message);
    res.status(500).send(err.message);
  }
});

router.delete('/clear', writeApiKey, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM alert');
    res.send('Alerts cleared');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
