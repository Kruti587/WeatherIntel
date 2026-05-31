const express = require('express');
const router = express.Router();
const { getAlertFatigueReport } = require('../services/alertService');

router.get('/', async (req, res) => {
  try {
    const days = req.query.days;
    
    if (days !== undefined) {
      const daysNum = Number(days);
      if (!Number.isInteger(daysNum) || daysNum < 1 || daysNum > 365) {
        return res.status(400).json({ error: 'days must be an integer between 1 and 365' });
      }
    }
    
    const report = await getAlertFatigueReport(Number(days) || 30);
    res.json(report);
  } catch (err) {
    console.error('Alert Fatigue Report Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;