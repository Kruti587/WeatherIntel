const WebSocket = require('ws');

let wss;

const initWebSocket = (server) => {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('🔌 New Client Connected to Telemetry Stream');
        ws.on('close', () => console.log('🔌 Client Disconnected'));
    });

    return wss;
};

const broadcastEvent = (type, data) => {
    if (!wss) return;
    const payload = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
};

module.exports = { initWebSocket, broadcastEvent };
