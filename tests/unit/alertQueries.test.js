const test = require('node:test');
const assert = require('node:assert/strict');

const { toAlertFatigueReport } = require('../../db/alertQueries');

test('toAlertFatigueReport calculates rounded reduction percentages', () => {
  const report = toAlertFatigueReport([
    {
      parameter_name: 'Temperature',
      fixed_alert_count: '8',
      adaptive_alert_count: '3',
    },
  ]);

  assert.deepEqual(report, [
    {
      parameter_name: 'Temperature',
      fixed_alert_count: 8,
      adaptive_alert_count: 3,
      reduction_percent: 62.5,
    },
  ]);
});

test('toAlertFatigueReport leaves reduction_percent null when there are no fixed alerts', () => {
  const report = toAlertFatigueReport([
    {
      parameter_name: 'Humidity',
      fixed_alert_count: '0',
      adaptive_alert_count: '4',
    },
  ]);

  assert.equal(report[0].reduction_percent, null);
  assert.equal(report[0].fixed_alert_count, 0);
  assert.equal(report[0].adaptive_alert_count, 4);
});
