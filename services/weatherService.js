const axios = require('axios');
const { getPool } = require('../db/pool');

const API_KEY = process.env.OPENWEATHER_API_KEY;
const CITY = process.env.TARGET_CITY || 'Bengaluru';

const ANALYSIS_PARAMETERS = [
  { name: 'Temperature', unit: '°C' },
  { name: 'Wind Speed', unit: 'km/h' },
  { name: 'Visibility', unit: 'km' },
  { name: 'Humidity', unit: '%' },
  { name: 'Pressure', unit: 'hPa' },
  { name: 'Precipitation', unit: 'mm' },
];

const PARAMETER_DEFINITIONS = {
  1: { name: 'Temperature', unit: '°C' },
  2: { name: 'Wind Speed', unit: 'km/h' },
  3: { name: 'Visibility', unit: 'km' },
  12: { name: 'Humidity', unit: '%' },
  13: { name: 'Pressure', unit: 'hPa' },
  14: { name: 'UV Index', unit: 'index' },
  15: { name: 'Precipitation', unit: 'mm' },
};

async function getLiveWeatherRows() {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`;
  const weather = await axios.get(weatherUrl);
  const current = weather.data;
  const timestamp = new Date(current.dt * 1000).toISOString();

  return [
    { parameter_name: 'Temperature', measured_value: current.main.temp, timestamp },
    { parameter_name: 'Wind Speed', measured_value: current.wind.speed * 3.6, timestamp },
    { parameter_name: 'Visibility', measured_value: current.visibility / 1000, timestamp },
    { parameter_name: 'Humidity', measured_value: current.main.humidity, timestamp },
    { parameter_name: 'Pressure', measured_value: current.main.pressure, timestamp },
    { parameter_name: 'Precipitation', measured_value: current.rain?.['1h'] || current.snow?.['1h'] || 0, timestamp },
  ];
}

async function getAnalysis() {
  let currentRows = [];
  let forecastByName = {};

  try {
    [currentRows, forecastByName] = await Promise.all([
      getLiveWeatherRows(),
      getForecastRows(),
    ]);
  } catch (liveErr) {
    console.error('Live analysis fetch failed, using database latest/local projection:', liveErr.message);
    const pool = getPool();
    const latest = await pool.query(`
      SELECT DISTINCT ON (p.parameter_name)
        p.parameter_name,
        ed.measured_value,
        ed.recorded_at AS timestamp
      FROM environmental_data ed
      JOIN parameter p ON ed.parameter_id = p.parameter_id
      WHERE p.parameter_name = ANY($1)
      ORDER BY p.parameter_name, ed.recorded_at DESC
    `, [ANALYSIS_PARAMETERS.map(p => p.name)]);
    currentRows = latest.rows;
  }

  const pool = getPool();
  const historyResult = await pool.query(`
    SELECT parameter_name, unit_measure, day, avg_value::float AS value
    FROM daily_weather_summary_view
    WHERE parameter_name = ANY($1)
      AND day >= CURRENT_DATE - INTERVAL '10 days'
      AND day < CURRENT_DATE
    ORDER BY parameter_name, day
  `, [ANALYSIS_PARAMETERS.map(p => p.name)]);

  const currentByName = new Map(currentRows.map(row => [row.parameter_name, Number(row.measured_value)]));

  return ANALYSIS_PARAMETERS.map(parameter => {
    const history = historyResult.rows
      .filter(row => row.parameter_name === parameter.name)
      .map(row => ({ date: row.day, value: Number(row.value) }));
    const currentValue = Number(currentByName.get(parameter.name));
    const currentPoint = Number.isFinite(currentValue)
      ? { date: 'Current', value: Number(currentValue.toFixed(2)) }
      : null;

    return {
      name: parameter.name,
      unit: parameter.unit,
      history,
      current: currentPoint,
      forecast: forecastByName[parameter.name] || [],
      forecast_source: forecastByName[parameter.name] ? 'OpenWeather 5-day forecast' : 'Local trend fallback',
      summary: currentPoint ? describeTrend(history, currentPoint.value, parameter.unit) : 'No current reading available.',
    };
  });
}

function describeTrend(history, currentValue, unit) {
  const previous = history.length ? Number(history[history.length - 1].value) : null;
  if (!Number.isFinite(previous)) return `Current reading: ${currentValue}${unit}`;

  const difference = currentValue - previous;
  if (Math.abs(difference) < 0.1) return `Almost unchanged from the last stored day.`;
  const direction = difference > 0 ? 'higher' : 'lower';
  return `${Math.abs(difference).toFixed(1)}${unit} ${direction} than the last stored day.`;
}

async function getForecastRows() {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${API_KEY}&units=metric`;
  const forecast = await axios.get(forecastUrl);
  const slots = forecast.data.list.slice(0, 10);

  const forecastByName = ANALYSIS_PARAMETERS.reduce((acc, parameter) => {
    acc[parameter.name] = slots.map((slot, index) => ({
      step: index + 1,
      time: slot.dt_txt,
      value: Number(getForecastValue(parameter.name, slot).toFixed(2)),
    }));
    return acc;
  }, {});

  await storeForecastRows(forecastByName);
  return forecastByName;
}

function getForecastValue(parameterName, slot) {
  if (parameterName === 'Temperature') return slot.main.temp;
  if (parameterName === 'Wind Speed') return slot.wind.speed * 3.6;
  if (parameterName === 'Visibility') return slot.visibility / 1000;
  if (parameterName === 'Humidity') return slot.main.humidity;
  if (parameterName === 'Pressure') return slot.main.pressure;
  if (parameterName === 'Precipitation') return slot.rain?.['3h'] || slot.snow?.['3h'] || 0;
  return 0;
}

async function storeForecastRows(forecastByName) {
  const pool = getPool();
  const parameters = await pool.query(
    'SELECT parameter_id, parameter_name FROM parameter WHERE parameter_name = ANY($1)',
    [ANALYSIS_PARAMETERS.map(p => p.name)]
  );
  const parameterIdByName = new Map(parameters.rows.map(row => [row.parameter_name, row.parameter_id]));

  for (const [parameterName, forecasts] of Object.entries(forecastByName)) {
    const parameterId = parameterIdByName.get(parameterName);
    if (!parameterId) continue;

    for (const forecast of forecasts) {
      await pool.query(
        `INSERT INTO forecast_data (parameter_id, forecast_value, forecast_time, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (parameter_id, forecast_time)
         DO UPDATE SET forecast_value = EXCLUDED.forecast_value, source = EXCLUDED.source, created_at = CURRENT_TIMESTAMP`,
        [parameterId, forecast.value, forecast.time, 'OpenWeather']
      );
    }
  }
}

module.exports = {
  getLiveWeatherRows,
  getAnalysis,
  PARAMETER_DEFINITIONS,
  ANALYSIS_PARAMETERS,
};