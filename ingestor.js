const axios = require('axios');
const { loadEnvFile } = require('./config/env');

loadEnvFile();

const API_KEY = process.env.OPENWEATHER_API_KEY;
const CITY = process.env.TARGET_CITY || 'Bengaluru';
const REGION_ID = parseInt(process.env.REGION_ID || '1');
const MY_SERVER = process.env.SERVER_URL || 'http://localhost:3001/api/data';
const WRITE_API_KEY = process.env.WRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ OPENWEATHER_API_KEY is required');
  process.exit(1);
}

// Axios instance that always sends the write API key header
const serverClient = axios.create({
  headers: WRITE_API_KEY ? { 'X-API-Key': WRITE_API_KEY } : {},
});

async function syncRealData() {
  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`;
    const res = await axios.get(weatherUrl);

    const { lat, lon } = res.data.coord;
    const uvUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const uvRes = await axios.get(uvUrl);

    const weatherData = [
      { parameter_id: 1, value: res.data.main.temp, region_id: REGION_ID },
      { parameter_id: 2, value: res.data.wind.speed * 3.6, region_id: REGION_ID },
      { parameter_id: 3, value: res.data.visibility / 1000, region_id: REGION_ID },
      { parameter_id: 12, value: res.data.main.humidity, region_id: REGION_ID },
      { parameter_id: 13, value: res.data.main.pressure, region_id: REGION_ID },
      { parameter_id: 14, value: uvRes.data.list[0].main.aqi, region_id: REGION_ID },
      { parameter_id: 15, value: res.data.rain ? res.data.rain['1h'] : 0, region_id: REGION_ID },
    ];

    for (const item of weatherData) {
      await serverClient.post(MY_SERVER, item);
    }

    console.log(`📡 [${new Date().toLocaleTimeString()}] Synced ${CITY}: ${res.data.main.temp}°C`);
  } catch (error) {
    console.error('❌ Sync Error:', error.message);
  }
}

syncRealData();
setInterval(syncRealData, 300000);
