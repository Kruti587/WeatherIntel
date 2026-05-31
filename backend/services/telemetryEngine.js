const pool = require('../core/db');

class TelemetryEngine {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    /**
     * Simulates a satellite reading for a specific parameter and region.
     * Uses a random walk algorithm with seasonal/daily biases.
     */
    generateReading(parameter, region) {
        const now = new Date();
        const hour = now.getHours();
        
        // Base value logic based on parameter code
        let baseValue = 0;
        let volatility = 0.05;

        switch (parameter.code) {
            case 'THRM': // Thermal Intensity (Kelvin)
                // Day/Night cycle simulation
                const tempCycle = Math.sin((hour - 6) * Math.PI / 12); // Peaks at 2 PM
                baseValue = 290 + (tempCycle * 15);
                volatility = 2;
                break;
            case 'AOD': // Aerosol Optical Depth
                baseValue = 0.3 + (Math.random() * 0.4);
                volatility = 0.05;
                break;
            case 'HUM': // Humidity
                const humCycle = Math.sin((hour - 18) * Math.PI / 12); // Peaks at 6 AM
                baseValue = 60 + (humCycle * 30);
                volatility = 5;
                break;
            case 'NDVI': // Vegetation Index
                baseValue = 0.65;
                volatility = 0.01;
                break;
            case 'RAIN': // Rainfall
                // 10% chance of rain, higher in "monsoon" months (May is pre-monsoon)
                const isRaining = Math.random() < 0.05;
                baseValue = isRaining ? Math.random() * 25 : 0;
                volatility = 2;
                break;
            default:
                baseValue = 50;
                volatility = 10;
        }

        // Add random variance
        const variance = (Math.random() - 0.5) * volatility;
        let value = baseValue + variance;

        // Clamp values
        if (parameter.min_threshold !== null) value = Math.max(parameter.min_threshold, value);
        if (parameter.max_threshold !== null) value = Math.min(parameter.max_threshold, value);

        // Jitter location slightly around region center
        const lat = parseFloat(region.center_lat) + (Math.random() - 0.5) * 0.05;
        const lon = parseFloat(region.center_lon) + (Math.random() - 0.5) * 0.05;

        return {
            region_id: region.region_id,
            parameter_id: parameter.parameter_id,
            value: parseFloat(value.toFixed(4)),
            lat,
            lon,
            recorded_at: now,
            metadata: {
                source: 'SIMULATED_SATELLITE_01',
                confidence: 0.95 + (Math.random() * 0.05),
                sensor_type: 'MODIS'
            }
        };
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🚀 Telemetry Engine Started');

        // Fetch regions and parameters
        const regions = (await pool.query('SELECT * FROM geo_region')).rows;
        const parameters = (await pool.query('SELECT * FROM geo_parameter')).rows;

        if (regions.length === 0 || parameters.length === 0) {
            console.error('❌ No regions or parameters found in DB. Run seed first.');
            return;
        }

        this.interval = setInterval(async () => {
            for (const region of regions) {
                // Pick a few random parameters to update each tick
                const subParams = parameters.sort(() => 0.5 - Math.random()).slice(0, 3);
                
                for (const param of subParams) {
                    const reading = this.generateReading(param, region);
                    
                    try {
                        await pool.query(
                            `INSERT INTO telemetry_data (region_id, parameter_id, value, lat, lon, recorded_at, metadata)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [reading.region_id, reading.parameter_id, reading.value, reading.lat, reading.lon, reading.recorded_at, reading.metadata]
                        );
                        // console.log(`📡 Telemetry Ingested: ${param.code} in ${region.name} = ${reading.value}`);
                    } catch (err) {
                        console.error('❌ Telemetry Ingestion Error:', err.message);
                    }
                }
            }
        }, 5000); // Every 5 seconds
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
        console.log('🛑 Telemetry Engine Stopped');
    }
}

module.exports = new TelemetryEngine();
