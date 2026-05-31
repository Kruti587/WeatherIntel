const axios = require('axios');
const { loadEnvFile } = require('./config/env');

loadEnvFile();

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001/api/data';
const REGION_ID = parseInt(process.env.REGION_ID || '1');
const WRITE_API_KEY = process.env.WRITE_API_KEY;

const serverClient = axios.create({
  headers: WRITE_API_KEY ? { 'X-API-Key': WRITE_API_KEY } : {},
});

const scenarios = [
  { name: 'Aviation Crisis  — Wind Speed 95 km/h', id: 2, val: 95 },
  { name: 'Agro Crisis      — Humidity 15%', id: 12, val: 15 },
  { name: 'Disaster Crisis  — Precipitation 110 mm', id: 15, val: 110 },
  { name: 'Heatwave         — Temperature 45°C', id: 1, val: 45 },
];

async function runSimulation() {
  console.log('🚀 Starting anomaly simulation...\n');
  for (const s of scenarios) {
    try {
      const res = await serverClient.post(SERVER_URL, {
        parameter_id: s.id,
        value: s.val,
        region_id: REGION_ID,
      });
      const alert = res.data.alertCreated ? '🚨 Alert triggered' : '✅ No alert';
      console.log(`${alert}  ${s.name}`);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message;
      console.log(`❌ Failed [${status}]: ${s.name} — ${msg}`);
    }
  }
  console.log('\n✨ Simulation complete. Check your dashboard.');
}

runSimulation();
