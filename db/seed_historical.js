/**
 * seed_historical.js — 30-day synthetic data backfill
 *
 * Generates realistic telemetry for all regions × all parameters
 * going back 30 days, one reading every 30 minutes per region/parameter.
 * This gives the adaptive engine enough history to build baselines
 * and makes the stability chart non-empty on first run.
 *
 * Usage:
 *   node db/seed_historical.js
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING on the partition.
 * Skips if > 1000 historical rows already exist.
 */

require('dotenv').config();
const pool = require('./pool').getPool();

// ── Parameter simulation config (mirrors telemetryEngine.js) ─────────────────
function generateValue(paramCode, paramMin, paramMax, hoursAgo) {
    const hour = ((new Date().getHours() - hoursAgo) % 24 + 24) % 24;
    let base = 0;
    let volatility = 0.05;

    switch (paramCode) {
        case 'THRM': {
            const cycle = Math.sin((hour - 6) * Math.PI / 12);
            base = 290 + cycle * 15;
            volatility = 2;
            break;
        }
        case 'AOD':
            base = 0.3 + Math.random() * 0.4;
            volatility = 0.05;
            break;
        case 'HUM': {
            const cycle = Math.sin((hour - 18) * Math.PI / 12);
            base = 60 + cycle * 30;
            volatility = 5;
            break;
        }
        case 'NDVI':
            base = 0.65;
            volatility = 0.01;
            break;
        case 'CLD':
            base = 40 + Math.random() * 30;
            volatility = 8;
            break;
        case 'RAIN': {
            const isRaining = Math.random() < 0.05;
            base = isRaining ? Math.random() * 25 : 0;
            volatility = 2;
            break;
        }
        case 'NO2':
            // Higher during rush hours (7-9 AM, 5-7 PM)
            base = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
                ? 35 + Math.random() * 20
                : 15 + Math.random() * 10;
            volatility = 4;
            break;
        default:
            base = 50;
            volatility = 10;
    }

    const variance = (Math.random() - 0.5) * volatility;
    let value = base + variance;
    if (paramMin !== null) value = Math.max(paramMin, value);
    if (paramMax !== null) value = Math.min(paramMax, value);
    return parseFloat(value.toFixed(4));
}

// ── Ensure DB partitions exist for the last 30 days ──────────────────────────
async function ensurePartitions(client) {
    const now = new Date();
    // We need partitions for the last 30 days. Schema already has May 2026.
    // Add April 2026 and any other months needed.
    const months = new Set();
    for (let d = 0; d <= 30; d++) {
        const dt = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        months.add(`${dt.getFullYear()}_${String(dt.getMonth() + 1).padStart(2, '0')}`);
    }

    for (const ym of months) {
        const [year, month] = ym.split('_');
        const tableName = `telemetry_data_y${year}_m${month}`;
        const fromDate = `${year}-${month}-01`;
        const nextMonth = parseInt(month) === 12
            ? `${parseInt(year) + 1}-01-01`
            : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;

        await client.query(`
            CREATE TABLE IF NOT EXISTS ${tableName}
            PARTITION OF telemetry_data
            FOR VALUES FROM ('${fromDate}') TO ('${nextMonth}')
        `);
    }
    console.log(`✅ Partitions ensured for months: ${[...months].join(', ')}`);
}

async function main() {
    const client = await pool.connect();
    try {
        // Check if backfill already done
        const existing = await client.query(
            `SELECT COUNT(*) FROM telemetry_data
             WHERE recorded_at < NOW() - INTERVAL '1 hour'`
        );
        if (parseInt(existing.rows[0].count) > 1000) {
            console.log(`ℹ️  ${existing.rows[0].count} historical rows already exist. Skipping backfill.`);
            return;
        }

        await ensurePartitions(client);

        const regions = (await client.query('SELECT * FROM geo_region')).rows;
        const params = (await client.query('SELECT * FROM geo_parameter')).rows;

        if (regions.length === 0 || params.length === 0) {
            console.error('❌ No regions or parameters found. Run schema_v2.sql first.');
            process.exit(1);
        }

        const DAYS = 30;
        const INTERVAL_MINUTES = 30; // one reading every 30 min
        const totalReadings = DAYS * (24 * 60 / INTERVAL_MINUTES); // 1440 per region/param
        const now = new Date();

        console.log(`🚀 Backfilling ${DAYS} days × ${regions.length} regions × ${params.length} params`);
        console.log(`   = ${totalReadings * regions.length * params.length} total rows`);
        console.log('   This may take 30–90 seconds...\n');

        let inserted = 0;
        const BATCH = 500;
        let batch = [];

        const flush = async () => {
            if (batch.length === 0) return;
            // Build a multi-row INSERT
            const placeholders = [];
            const values = [];
            let idx = 1;
            for (const row of batch) {
                placeholders.push(`($${idx},$${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6})`);
                values.push(
                    row.region_id, row.parameter_id, row.value,
                    row.lat, row.lon, row.recorded_at, JSON.stringify(row.metadata)
                );
                idx += 7;
            }
            await client.query(
                `INSERT INTO telemetry_data
                    (region_id, parameter_id, value, lat, lon, recorded_at, metadata)
                 VALUES ${placeholders.join(',')}
                 ON CONFLICT DO NOTHING`,
                values
            );
            inserted += batch.length;
            batch = [];
        };

        for (let step = totalReadings; step >= 1; step--) {
            const minutesAgo = step * INTERVAL_MINUTES;
            const recordedAt = new Date(now.getTime() - minutesAgo * 60 * 1000);
            const hoursAgo = minutesAgo / 60;

            for (const region of regions) {
                for (const param of params) {
                    const value = generateValue(param.code, param.min_threshold, param.max_threshold, hoursAgo);
                    const lat = parseFloat(region.center_lat) + (Math.random() - 0.5) * 0.05;
                    const lon = parseFloat(region.center_lon) + (Math.random() - 0.5) * 0.05;

                    batch.push({
                        region_id: region.region_id,
                        parameter_id: param.parameter_id,
                        value,
                        lat: parseFloat(lat.toFixed(6)),
                        lon: parseFloat(lon.toFixed(6)),
                        recorded_at: recordedAt.toISOString(),
                        metadata: { source: 'HISTORICAL_BACKFILL', confidence: 0.90 }
                    });

                    if (batch.length >= BATCH) {
                        await flush();
                        process.stdout.write(`\r   Inserted ${inserted} rows...`);
                    }
                }
            }
        }

        await flush();
        console.log(`\n✅ Backfill complete — ${inserted} rows inserted.`);

        // Rebuild adaptive thresholds from the fresh historical data
        console.log('\n🔄 Rebuilding adaptive thresholds from historical data...');
        for (const region of regions) {
            for (const param of params) {
                const res = await client.query(
                    `SELECT value FROM telemetry_data
                     WHERE region_id = $1 AND parameter_id = $2
                     ORDER BY recorded_at DESC LIMIT 200`,
                    [region.region_id, param.parameter_id]
                );
                if (res.rows.length < 10) continue;
                const values = res.rows.map(r => parseFloat(r.value));
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const stddev = Math.sqrt(
                    values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / values.length
                ) || 0.1;

                await client.query(
                    `INSERT INTO adaptive_threshold_config
                        (region_id, parameter_id, base_mean, base_stddev)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (region_id, parameter_id) DO UPDATE
                     SET base_mean = EXCLUDED.base_mean,
                         base_stddev = EXCLUDED.base_stddev,
                         last_updated = NOW()`,
                    [region.region_id, param.parameter_id, mean, stddev]
                );
            }
        }
        console.log('✅ Adaptive thresholds rebuilt from 30-day history.');

    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
});
