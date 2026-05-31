const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { getConnectedClientCount } = require('../middleware/websocket');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    // Use a fresh client to avoid cached connection state
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.json({
      status: 'ok',
      db: 'connected',
      websocket_clients: getConnectedClientCount(),
      uptime_seconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'error',
      detail: err.message,
      websocket_clients: getConnectedClientCount(),
    });
  }
});

module.exports = router;
