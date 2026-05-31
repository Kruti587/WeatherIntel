async function getThreshold(client, regionId, parameterId) {
  const result = await client.query(
    `SELECT threshold_value, regional_mean, deviation_factor
     FROM adaptive_threshold
     WHERE region_id = $1 AND parameter_id = $2`,
    [regionId, parameterId]
  );
  return result.rows[0] || null;
}

async function upsertThreshold(client, { regionId, parameterId, thresholdValue, regionalMean, deviationFactor }) {
  await client.query(
    `INSERT INTO adaptive_threshold (region_id, parameter_id, threshold_value, regional_mean, deviation_factor)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (region_id, parameter_id)
     DO UPDATE SET
       threshold_value = EXCLUDED.threshold_value,
       regional_mean = EXCLUDED.regional_mean,
       deviation_factor = EXCLUDED.deviation_factor,
       last_updated = NOW()`,
    [regionId, parameterId, thresholdValue, regionalMean, deviationFactor]
  );
}

async function getBaseline(client, regionId, parameterId, season) {
  const result = await client.query(
    `SELECT mean_value, std_dev FROM regional_baseline
     WHERE region_id = $1 AND parameter_id = $2 AND season = $3`,
    [regionId, parameterId, season]
  );
  return result.rows[0] || null;
}

function getSeasonForMonth(month) {
  if ([3, 4, 5].includes(month)) return 'pre-monsoon';
  if ([6, 7, 8, 9].includes(month)) return 'monsoon';
  if ([10, 11].includes(month)) return 'post-monsoon';
  return 'winter';
}

module.exports = {
  getThreshold,
  upsertThreshold,
  getBaseline,
  getSeasonForMonth,
};