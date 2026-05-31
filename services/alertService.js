const { getPool } = require('../db/pool');
const { getAlertFatigueReport: queryAlertFatigueReport } = require('../db/alertQueries');

async function getAlertFatigueReport(days = 30) {
  const client = await getPool().connect();
  try {
    return await queryAlertFatigueReport(client, days);
  } finally {
    client.release();
  }
}

module.exports = {
  getAlertFatigueReport,
};
