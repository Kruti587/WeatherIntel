async function insertAlert(client, { dataId, alertMessage, severity, department, source = 'adaptive' }) {
  const result = await client.query(
    `INSERT INTO alert (data_id, alert_message, severity, department, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING alert_id`,
    [dataId, alertMessage, severity, department, source]
  );
  return result.rows[0].alert_id;
}

function toAlertFatigueReport(rows) {
  return rows.map((row) => {
    const fixedAlertCount = parseInt(row.fixed_alert_count || 0, 10);
    const adaptiveAlertCount = parseInt(row.adaptive_alert_count || 0, 10);
    const reductionPercent = fixedAlertCount > 0
      ? ((fixedAlertCount - adaptiveAlertCount) / fixedAlertCount) * 100
      : null;

    return {
      parameter_name: row.parameter_name,
      fixed_alert_count: fixedAlertCount,
      adaptive_alert_count: adaptiveAlertCount,
      reduction_percent: reductionPercent !== null ? Math.round(reductionPercent * 100) / 100 : null,
    };
  });
}

async function getAlertFatigueReport(client, days = 30) {
  const result = await client.query(
    `SELECT
       p.name AS parameter_name,
       COUNT(a.alert_id) FILTER (WHERE a.source = 'fixed')::int    AS fixed_alert_count,
       COUNT(a.alert_id) FILTER (WHERE a.source = 'adaptive')::int AS adaptive_alert_count
     FROM geo_parameter p
     LEFT JOIN telemetry_data td ON td.parameter_id = p.parameter_id
     LEFT JOIN geo_alert a ON a.telemetry_id = td.telemetry_id
       AND a.source IN ('fixed', 'adaptive')
       AND a.created_at >= NOW() - ($1::int * INTERVAL '1 day')
     GROUP BY p.parameter_id, p.name
     ORDER BY p.name`,
    [days]
  );

  return toAlertFatigueReport(result.rows);
}

async function queryAlerts(client, { department, severity, limit = 10 } = {}) {
  const filters = [];
  const values = [];

  if (department) {
    values.push(department);
    filters.push(`department = $${values.length}`);
  }

  if (severity && severity !== 'All') {
    values.push(severity);
    filters.push(`severity = $${values.length}`);
  }

  values.push(Number(limit) || 10);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await client.query(
    `SELECT * FROM alert ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

async function queryAlertUpdates(client, { afterId, limit = 50 } = {}) {
  const after = Number(afterId);
  if (!Number.isInteger(after) || after < 0) {
    return [];
  }

  const result = await client.query(
    `SELECT *
     FROM alert
     WHERE alert_id > $1
     ORDER BY alert_id ASC
     LIMIT $2`,
    [after, Number(limit) || 50]
  );

  return result.rows;
}

module.exports = {
  insertAlert,
  getAlertFatigueReport,
  queryAlerts,
  queryAlertUpdates,
  toAlertFatigueReport,
};
