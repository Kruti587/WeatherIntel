/**
 * simulate_historical.js
 *
 * Generates 30 days of synthetic historical readings for all 5 Karnataka
 * regions using IMD seasonal baselines + Gaussian noise.
 *
 * Why this matters:
 *   Without historical data, rolling_average_view is empty, so the adaptive
 *   threshold always falls back to the static seasonal baseline.
 *   With 30 days of data, the system uses real rolling averages — making
 *   the "adaptive" part actually adaptive.
 *
 * Usage:
 *   node simulate_historical.js
 *   node simulate_historical.js --days 60   (generate 60 days instead)
 *   node simulate_historical.js --clear     (delete existing data first)
 *
 * The script also runs the fixed trigger for the first 15 days, then
 * disables it for the last 15 days — giving you real fixed vs adaptive
 * alert counts for the fatigue report.
 */

const { loadEnvFile } = require('./config/env');
loadEnvFile();

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const DAYS = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');
const CLEAR = args.includes('--clear');
const READINGS_PER_DAY = 12; // every 2 hours

// ── Gaussian noise (Box-Muller) ───────────────────────────────
function gaussianNoise(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
}

// ── Season for a given month ──────────────────────────────────
function getSeason(month) {
    if ([3, 4, 5].includes(month)) return 'pre-monsoon';
    if ([6, 7, 8, 9].includes(month)) return 'monsoon';
    if ([10, 11].includes(month)) return 'post-monsoon';
    return 'winter';
}

// ── Clamp value to realistic range per parameter ─────────────
function clamp(paramName, value) {
    const ranges = {
        'Temperature': [5, 50],
        'Wind Speed': [0, 120],
        'Humidity': [5, 100],
        'Precipitation': [0, 300],
        'Pressure': [980, 1030],
        'UV Index': [0, 11],
        'Visibility': [0.1, 20],
    };
    const [min, max] = ranges[paramName] || [-Infinity, Infinity];
    return Math.max(min, Math.min(max, value));
}

async function main() {
    const client = await pool.connect();
    try {
        console.log(`\n🌍 WeatherIntel Historical Simulation`);
        console.log(`   Generating ${DAYS} days × ${READINGS_PER_DAY} readings/day for all regions\n`);

        // ── Optionally clear existing data ───────────────────────
        if (CLEAR) {
            console.log('🗑️  Clearing existing environmental_data and alerts...');
            await client.query('BEGIN');
            await client.query('DELETE FROM alert');
            await client.query('DELETE FROM environmental_data');
            await client.query('DELETE FROM adaptive_threshold');
            await client.query('COMMIT');
            console.log('   Done.\n');
        }

        // ── Load all regions ──────────────────────────────────────
        const regionsRes = await client.query('SELECT * FROM region ORDER BY region_id');
        const regions = regionsRes.rows;
        console.log(`📍 Regions: ${regions.map(r => r.name).join(', ')}\n`);

        // ── Load all parameters ───────────────────────────────────
        const paramsRes = await client.query(
            `SELECT p.*, rb.region_id, rb.season, rb.mean_value, rb.std_dev
       FROM parameter p
       JOIN regional_baseline rb ON rb.parameter_id = p.parameter_id
       ORDER BY p.parameter_id, rb.region_id, rb.season`
        );

        // Build lookup: regionId → parameterId → season → { mean, std }
        const baselines = {};
        for (const row of paramsRes.rows) {
            if (!baselines[row.region_id]) baselines[row.region_id] = {};
            if (!baselines[row.region_id][row.parameter_id]) baselines[row.region_id][row.parameter_id] = {};
            baselines[row.region_id][row.parameter_id][row.season] = {
                mean: parseFloat(row.mean_value),
                std: parseFloat(row.std_dev),
                name: row.parameter_name,
            };
        }

        // ── Enable fixed trigger for first half, disable for second ─
        // This generates real fixed vs adaptive alert counts for the fatigue report
        const fixedTriggerDays = Math.floor(DAYS / 2);
        console.log(`⚡ Fixed trigger: ENABLED for days 1–${fixedTriggerDays}, DISABLED for days ${fixedTriggerDays + 1}–${DAYS}`);
        console.log(`   (This gives real fixed vs adaptive counts for the fatigue report)\n`);

        await client.query('ALTER TABLE environmental_data ENABLE TRIGGER trg_environmental_alerts');

        let totalReadings = 0;
        let totalAlerts = 0;

        // ── Generate readings day by day ──────────────────────────
        for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);
            const month = date.getMonth() + 1;
            const season = getSeason(month);

            // Switch trigger at the midpoint
            if (dayOffset === Math.floor(DAYS / 2) - 1) {
                await client.query('ALTER TABLE environmental_data DISABLE TRIGGER trg_environmental_alerts');
                console.log(`   ↳ Fixed trigger DISABLED from day ${DAYS - dayOffset} onwards\n`);
            }

            for (let hour = 0; hour < 24; hour += Math.floor(24 / READINGS_PER_DAY)) {
                const timestamp = new Date(date);
                timestamp.setHours(hour, 0, 0, 0);

                for (const region of regions) {
                    const regionBaselines = baselines[region.region_id];
                    if (!regionBaselines) continue;

                    for (const [paramIdStr, seasonMap] of Object.entries(regionBaselines)) {
                        const paramId = parseInt(paramIdStr);
                        const baseline = seasonMap[season];
                        if (!baseline) continue;

                        // Add diurnal variation for temperature (hotter midday)
                        let mean = baseline.mean;
                        if (baseline.name === 'Temperature') {
                            const diurnalOffset = Math.sin((hour - 6) * Math.PI / 12) * 3;
                            mean += diurnalOffset;
                        }

                        // Occasionally inject an anomaly (5% chance) for research interest
                        const isAnomaly = Math.random() < 0.05;
                        const value = isAnomaly
                            ? clamp(baseline.name, gaussianNoise(mean + baseline.std * 2.8, baseline.std * 0.5))
                            : clamp(baseline.name, gaussianNoise(mean, baseline.std));

                        await client.query(
                            `INSERT INTO environmental_data (region_id, parameter_id, measured_value, recorded_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT ON CONSTRAINT uq_env_data_param_region_time DO NOTHING`,
                            [region.region_id, paramId, parseFloat(value.toFixed(2)), timestamp.toISOString()]
                        );
                        totalReadings++;
                    }
                }
            }

            if (dayOffset % 5 === 0) {
                process.stdout.write(`   Day ${DAYS - dayOffset}/${DAYS} complete — ${totalReadings.toLocaleString()} readings so far\r`);
            }
        }

        // ── Re-disable fixed trigger ──────────────────────────────
        await client.query('ALTER TABLE environmental_data DISABLE TRIGGER trg_environmental_alerts');

        // ── Count results ─────────────────────────────────────────
        const readingCount = await client.query('SELECT COUNT(*) FROM environmental_data');
        const alertCount = await client.query('SELECT COUNT(*) FROM alert');
        const fixedCount = await client.query("SELECT COUNT(*) FROM alert WHERE source = 'fixed'");
        const adaptiveCount = await client.query("SELECT COUNT(*) FROM alert WHERE source = 'adaptive'");

        console.log(`\n\n✅ Simulation complete!\n`);
        console.log(`   Total readings:  ${parseInt(readingCount.rows[0].count).toLocaleString()}`);
        console.log(`   Total alerts:    ${parseInt(alertCount.rows[0].count).toLocaleString()}`);
        console.log(`   Fixed alerts:    ${parseInt(fixedCount.rows[0].count).toLocaleString()}`);
        console.log(`   Adaptive alerts: ${parseInt(adaptiveCount.rows[0].count).toLocaleString()}`);
        console.log(`\n   Now run: curl http://localhost:3001/api/alert-fatigue-report?days=${DAYS}`);
        console.log(`   And:     curl http://localhost:3001/api/anomaly-report\n`);

    } catch (err) {
        console.error('\n❌ Simulation failed:', err.message);
        await client.query('ROLLBACK').catch(() => { });
        // Always re-disable the trigger even on error
        await client.query('ALTER TABLE environmental_data DISABLE TRIGGER trg_environmental_alerts').catch(() => { });
    } finally {
        client.release();
        await pool.end();
    }
}

main();
