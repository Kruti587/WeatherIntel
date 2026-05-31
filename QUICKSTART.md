# QuickStart Guide

## Start Server (30 seconds)

```bash
# 1. Set environment variables
export OPENWEATHER_API_KEY=your_api_key
export DB_USER=postgres
export DB_HOST=localhost
export DB_NAME=env_monitoring
export DB_PASSWORD=your_password
export DB_PORT=5432
export PORT=3000
export TARGET_CITY=Bengaluru
export DEVIATION_FACTOR_DEFAULT=0.2

# 2. Start server
node server.js

# 3. Open dashboard
# http://localhost:3000
```

## Test Adaptive Thresholds

```bash
# Terminal 1: Start server
node server.js

# Terminal 2: Run tests
# Test 1: Normal reading (should NOT trigger alert)
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"parameter_id": 1, "value": 28, "region_id": 1}'

# Test 2: Anomalous reading (SHOULD trigger alert)
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"parameter_id": 1, "value": 50, "region_id": 1}'

# Test 3: Check alert fatigue report
curl http://localhost:3000/api/alert-fatigue-report | jq .
```

## Key Endpoints

```
GET  http://localhost:3000/api/health                 → DB health check
GET  http://localhost:3000/api/latest-weather         → Latest readings
GET  http://localhost:3000/api/alerts                 → All alerts
GET  http://localhost:3000/api/alert-fatigue-report   → Alert statistics
GET  http://localhost:3000/api/analysis               → Weather analysis
POST http://localhost:3000/api/data                   → Log reading
```

## Adaptive Threshold Example

**Baseline**: Temperature = 33.5°C (pre-monsoon)  
**Deviation Factor**: 0.2 (20%)  
**Calculated Threshold**: 33.5 × 1.2 = **40.2°C**  

- Reading 28°C: ✓ No alert (< 40.2°C)
- Reading 50°C: ⚠️ Alert triggered (> 40.2°C)

## Alert Fatigue Tracking

```json
{
  "parameter_name": "Temperature",
  "fixed_alert_count": 5,        // Old system
  "adaptive_alert_count": 2,      // New system (60% fewer!)
  "reduction_percent": 60
}
```

## Database Setup (first time)

```bash
# 1. Create database
createdb -U postgres env_monitoring

# 2. Run migrations
psql -U postgres -d env_monitoring -f queries/schema.sql
psql -U postgres -d env_monitoring -f queries/indexes.sql
psql -U postgres -d env_monitoring -f queries/seed.sql
psql -U postgres -d env_monitoring -f queries/views.sql

# 3. Verify
psql -U postgres -d env_monitoring -c "SELECT * FROM regional_baseline LIMIT 5;"
```

## Useful Queries

```sql
-- Check latest adaptive thresholds
SELECT p.parameter_name, at.threshold_value, at.regional_mean
FROM adaptive_threshold at
JOIN parameter p ON at.parameter_id = p.parameter_id
ORDER BY at.threshold_id DESC LIMIT 5;

-- View recent alerts
SELECT alert_id, alert_message, severity, source, created_at
FROM alert
ORDER BY created_at DESC LIMIT 10;

-- Check rolling average
SELECT parameter_id, rolling_avg, reading_count
FROM rolling_average_view
WHERE region_id = 1;

-- Count alerts by source
SELECT source, COUNT(*) as count FROM alert GROUP BY source;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DB connection error | Check DB credentials in .env |
| No alerts generated | Check if reading > calculated threshold |
| API returns 500 | Check server logs: `tail -f /tmp/server.log` |
| Ingestor not syncing | Verify OPENWEATHER_API_KEY is valid |
| threshold null error | Ensure dev environment variables are set |

## Files to Know

- `server.js` - Main Express application
- `routes/data.js` - Data logging endpoint (POST /api/data)
- `services/thresholdService.js` - Adaptive threshold logic
- `db/pool.js` - Database connection & transactions
- `.env` - Configuration (create from .env.example)
- `ui/index.html` - Dashboard frontend

## Next Steps

1. **View Logs**: Monitor server: `tail -f /tmp/server.log`
2. **Start Ingestor**: Auto-sync real weather: `node ingestor.js`
3. **Run Simulator**: Test scenarios: `node simulate_anomalies.js`
4. **Analyze Data**: Use `/api/analysis` endpoint
5. **Check Fatigue**: View alert reduction: `/api/alert-fatigue-report`

---

For detailed documentation, see: `IMPLEMENTATION_GUIDE.md` and `COMPLETION_SUMMARY.md`
