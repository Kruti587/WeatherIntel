/**
 * websocket.js — Real-time alert broadcasting via WebSocket.
 *
 * How it works:
 *   1. When the HTTP server starts, we attach a WebSocket server to it.
 *   2. The dashboard connects on page load: ws://localhost:3001
 *   3. When a new alert is created (POST /api/data triggers one),
 *      routes/data.js calls broadcastAlert(alert).
 *   4. Every connected browser tab receives the alert instantly —
 *      no polling needed.
 *
 * Why this matters for the project:
 *   - Demonstrates event-driven architecture on top of the DB layer
 *   - Real-time push vs pull is a classic systems design tradeoff
 *   - The ws package is already in your dependencies
 */

const WebSocket = require('ws');

let wss = null;

/**
 * Attach a WebSocket server to an existing HTTP server.
 * Call this once in server.js after app.listen().
 */
function attachWebSocket(httpServer) {
    wss = new WebSocket.Server({ server: httpServer });

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        console.log(`🔌 WebSocket client connected from ${ip}`);

        // Send a welcome ping so the client knows the connection is live
        ws.send(JSON.stringify({ type: 'connected', message: 'WeatherIntel real-time feed active' }));

        ws.on('close', () => {
            console.log(`🔌 WebSocket client disconnected from ${ip}`);
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    });

    console.log('📡 WebSocket server attached');
    return wss;
}

/**
 * Broadcast a new alert to all connected clients.
 * Called from routes/data.js whenever an adaptive alert is created.
 *
 * @param {object} alert - { alert_id, alert_message, severity, department, source, created_at }
 */
function broadcastAlert(alert) {
    if (!wss) return;

    const payload = JSON.stringify({
        type: 'new_alert',
        alert,
    });

    let sent = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
            sent++;
        }
    });

    if (sent > 0) {
        console.log(`📡 Broadcast alert to ${sent} client(s): ${alert.severity} — ${alert.department}`);
    }
}

/**
 * Broadcast a live weather update to all connected clients.
 * Called from ingestor.js after each sync.
 *
 * @param {Array} readings - array of { parameter_name, measured_value, timestamp }
 */
function broadcastWeatherUpdate(readings) {
    if (!wss) return;

    const payload = JSON.stringify({
        type: 'weather_update',
        readings,
        timestamp: new Date().toISOString(),
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

/**
 * Returns the number of currently connected WebSocket clients.
 * Exposed via GET /api/health for monitoring.
 */
function getConnectedClientCount() {
    if (!wss) return 0;
    let count = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) count++;
    });
    return count;
}

module.exports = {
    attachWebSocket,
    broadcastAlert,
    broadcastWeatherUpdate,
    getConnectedClientCount,
};
