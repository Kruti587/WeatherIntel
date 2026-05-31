const express = require('express');
const router = express.Router();
const { getPool, withTransaction } = require('../db/pool');
const { insertReading } = require('../db/environmentalData');
const { insertAlert } = require('../db/alertQueries');
const { evaluateAlert } = require('../services/thresholdService');
const { PARAMETER_DEFINITIONS } = require('../services/weatherService');
const { writeLimiter, writeApiKey } = require('../middleware/security');
const { broadcastAlert } = require('../middleware/websocket');

router.post('/data', writeLimiter, writeApiKey, async (req, res) => {
  const { parameter_id, value, region_id } = req.body;

  try {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return res.status(400).json({ error: 'value must be a finite number' });
    }

    if (!Number.isInteger(Number(parameter_id))) {
      return res.status(400).json({ error: 'parameter_id must be an integer' });
    }

    if (region_id !== undefined && !Number.isInteger(Number(region_id))) {
      return res.status(400).json({ error: 'region_id must be an integer when provided' });
    }

    const parameterId = Number(parameter_id);
    const regionId = region_id === undefined ? 1 : Number(region_id);

    const pool = getPool();
    const parameterResult = await pool.query(
      'SELECT parameter_id, parameter_name FROM parameter WHERE parameter_id = $1',
      [parameterId]
    );

    let parameter = parameterResult.rows[0];
    if (!parameter) {
      const definition = PARAMETER_DEFINITIONS[parameterId];
      if (!definition) {
        return res.status(400).json({ error: `Unknown parameter_id: ${parameterId}` });
      }
      const inserted = await pool.query(
        'INSERT INTO parameter (parameter_id, parameter_name, unit_measure) VALUES ($1, $2, $3) RETURNING parameter_id, parameter_name',
        [parameterId, definition.name, definition.unit]
      );
      parameter = inserted.rows[0];
    }

    let alertCreated = false;
    let threshold = null;
    let regionalMean = null;
    let alertsCreated = 0;
    let broadcastPayload = null;

    await withTransaction(async (client) => {
      const { dataId } = await insertReading(client, {
        regionId,
        parameterId: parameter.parameter_id,
        measuredValue: numericValue,
      });

      const alertEval = await evaluateAlert(regionId, parameter.parameter_id, numericValue, client);
      threshold = alertEval.threshold;
      regionalMean = alertEval.regionalMean;

      if (alertEval.shouldAlert) {
        const unit = PARAMETER_DEFINITIONS[parameter.parameter_id]?.unit || '';
        const alertMessage =
          `${parameter.parameter_name} reading of ${numericValue.toFixed(1)} ${unit} ` +
          `exceeds adaptive threshold. ` +
          `Adaptive threshold: ${alertEval.threshold.toFixed(2)} ${unit}; ` +
          `regional mean: ${alertEval.regionalMean.toFixed(2)} ${unit}.`;

        const department = getDepartmentForParameter(parameter.parameter_name);

        await insertAlert(client, {
          dataId,
          alertMessage,
          severity: alertEval.severity,
          department,
          source: 'adaptive',
        });

        alertCreated = true;
        alertsCreated = 1;

        // Capture for broadcast after transaction commits
        broadcastPayload = {
          alert_message: alertMessage,
          severity: alertEval.severity,
          department,
          source: 'adaptive',
          parameter_name: parameter.parameter_name,
          measured_value: numericValue,
          threshold: alertEval.threshold,
          regional_mean: alertEval.regionalMean,
          created_at: new Date().toISOString(),
        };
      }
    });

    // Broadcast AFTER transaction commits so clients see consistent DB state
    if (broadcastPayload) {
      broadcastAlert(broadcastPayload);
    }

    res.status(200).json({
      status: 'Data Logged',
      alertCreated,
      alertsCreated,
      threshold,
      regionalMean,
    });
  } catch (err) {
    console.error('Database Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function getDepartmentForParameter(parameterName) {
  if (parameterName === 'Wind Speed' || parameterName === 'Visibility') return 'Aviation';
  if (parameterName === 'Humidity' || parameterName === 'Temperature' || parameterName === 'Precipitation') return 'Agriculture';
  if (parameterName === 'Pressure') return 'Disaster';
  return 'Aviation';
}

module.exports = router;
