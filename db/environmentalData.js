async function insertReading(client, { regionId, parameterId, measuredValue, recordedAt }) {
  const result = await client.query(
    `INSERT INTO environmental_data (region_id, parameter_id, measured_value, recorded_at)
     VALUES ($1, $2, $3, $4)
     RETURNING data_id`,
    [regionId, parameterId, measuredValue, recordedAt || new Date().toISOString()]
  );
  return { dataId: result.rows[0].data_id };
}

async function getRollingAverage(client, regionId, parameterId, windowDays = 30) {
  const result = await client.query(
    `SELECT
       ROUND(AVG(measured_value)::numeric, 2) AS rolling_avg,
       COUNT(*) AS reading_count
     FROM environmental_data
     WHERE region_id = $1 AND parameter_id = $2
       AND recorded_at >= NOW() - INTERVAL '${windowDays} days'`,
    [regionId, parameterId]
  );
  return {
    rollingAvg: result.rows[0]?.rolling_avg ? parseFloat(result.rows[0].rolling_avg) : null,
    readingCount: parseInt(result.rows[0]?.reading_count || 0),
  };
}

async function getDistinctDaysInWindow(client, regionId, parameterId, windowDays = 30) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT DATE(recorded_at)) AS distinct_days
     FROM environmental_data
     WHERE region_id = $1 AND parameter_id = $2
       AND recorded_at >= NOW() - INTERVAL '${windowDays} days'`,
    [regionId, parameterId]
  );
  return parseInt(result.rows[0]?.distinct_days || 0);
}

module.exports = {
  insertReading,
  getRollingAverage,
  getDistinctDaysInWindow,
};