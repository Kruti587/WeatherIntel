const { getPool } = require('../db/pool');
const { insertReading, getRollingAverage, getDistinctDaysInWindow } = require('../db/environmentalData');
const { getThreshold, upsertThreshold, getBaseline, getSeasonForMonth } = require('../db/thresholdQueries');

const DEVIATION_FACTOR_DEFAULT = parseFloat(process.env.DEVIATION_FACTOR_DEFAULT || '0.2');

async function computeAdaptiveThreshold(regionId, parameterId, client = null) {
  const useClient = client || (await getPool().connect());
  const release = client ? () => {} : () => useClient.release();
  
  try {
    const { rollingAvg, readingCount } = await getRollingAverage(useClient, regionId, parameterId);
    const distinctDays = await getDistinctDaysInWindow(useClient, regionId, parameterId);
    
    let regionalMean;
    
    // Use rolling average only if we have 7+ distinct days AND actual data
    if (distinctDays >= 7 && rollingAvg !== null) {
      regionalMean = rollingAvg;
    } else {
      // Fall back to seasonal baseline
      const currentMonth = new Date().getMonth() + 1;
      const season = getSeasonForMonth(currentMonth);
      const baseline = await getBaseline(useClient, regionId, parameterId, season);
      regionalMean = baseline ? parseFloat(baseline.mean_value) : 0.01;
    }
    
    let thresholdRow = await getThreshold(useClient, regionId, parameterId);
    const deviationFactor = thresholdRow ? parseFloat(thresholdRow.deviation_factor) : DEVIATION_FACTOR_DEFAULT;
    
    const threshold = regionalMean * (1 + deviationFactor);
    
    await upsertThreshold(useClient, {
      regionId,
      parameterId,
      thresholdValue: threshold,
      regionalMean,
      deviationFactor,
    });
    
    return { threshold, regionalMean, deviationFactor };
  } finally {
    release();
  }
}

async function evaluateAlert(regionId, parameterId, measuredValue, client) {
  const { threshold, regionalMean } = await computeAdaptiveThreshold(regionId, parameterId, client);
  
  if (measuredValue <= threshold) {
    return { shouldAlert: false, severity: null, threshold, regionalMean };
  }
  
  const exceedanceRatio = (measuredValue - threshold) / threshold;
  const severity = exceedanceRatio > 0.50 ? 'Critical' : 'Warning';
  
  return { shouldAlert: true, severity, threshold, regionalMean };
}

module.exports = {
  computeAdaptiveThreshold,
  evaluateAlert,
};