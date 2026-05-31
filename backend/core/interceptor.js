const pool = require('./db');
const alertEngine = require('../services/alertEngine');
const { broadcastEvent } = require('../websocket/wsHandler');

/**
 * Intercepts pool.query to trigger real-time processing and broadcasting
 * This maintains the "Intelligence Kernel" behavior without changing every service
 */
const initInterceptor = () => {
    const originalQuery = pool.query.bind(pool);
    
    pool.query = async (...args) => {
        const result = await originalQuery(...args);
        
        const sql = args[0].trim();
        const params = args[1];

        // 1. Intercept Telemetry Ingestion
        if (sql.startsWith('INSERT INTO telemetry_data')) {
            const telemetry = {
                region_id: params[0],
                parameter_id: params[1],
                value: params[2],
                lat: params[3],
                lon: params[4],
                recorded_at: params[5],
                metadata: params[6]
            };
            
            // Trigger Intelligence
            alertEngine.processTelemetry(telemetry).catch(console.error);
            // Broadcast via WebSocket
            broadcastEvent('TELEMETRY_UPDATE', telemetry);
        }

        // 2. Intercept Event Pipeline Logs
        if (sql.startsWith('INSERT INTO event_pipeline_log')) {
            broadcastEvent('PIPELINE_EVENT', {
                type: params[0],
                target: params[1],
                action: params[2]
            });
        }
        
        return result;
    };
};

module.exports = { initInterceptor };
