# DBMS Project - File Navigation Guide

## 📖 Documentation (Start Here!)

| File | Purpose | Read Time |
|------|---------|-----------|
| **QUICKSTART.md** | 30-second setup guide | 2 min |
| **IMPLEMENTATION_GUIDE.md** | Full reference (setup, API, SQL, troubleshooting) | 15 min |
| **COMPLETION_SUMMARY.md** | Architecture overview and design decisions | 10 min |

## 🚀 Getting Started (3 Steps)

```bash
# 1. Set environment variables
export OPENWEATHER_API_KEY=your_key
export DB_PASSWORD=your_password

# 2. Start server
node server.js

# 3. Open http://localhost:3000
```

## 📁 Project Structure

### Core Application
```
server.js                 # Express API server
ingestor.js              # Real weather data sync (5-min interval)
simulate_anomalies.js    # Test scenario injection
```

### Backend Modules
```
routes/                  # 7 API endpoint modules
  ├── data.js           # POST /api/data
  ├── weather.js        # GET /api/latest-weather
  ├── analysis.js       # GET /api/analysis
  ├── alerts.js         # GET /api/alerts
  ├── fatigue.js        # GET /api/alert-fatigue-report
  ├── health.js         # GET /api/health
  └── reports.js        # GET /api/admin-summary, /daily-report

services/                # 3 business logic modules
  ├── thresholdService.js   # Adaptive threshold calculation
  ├── alertService.js       # Alert creation logic
  └── weatherService.js     # Weather data transformations

db/                      # 4 database modules
  ├── pool.js            # Connection pooling & transactions
  ├── environmentalData.js  # Reading/rolling avg queries
  ├── thresholdQueries.js   # Baseline/threshold CRUD
  └── alertQueries.js    # Alert CRUD operations
```

### Database
```
queries/                 # Database migration scripts
  ├── schema.sql        # 13 tables, region normalization
  ├── indexes.sql       # 18 composite indexes
  ├── seed.sql          # Regional baseline data (Bengaluru)
  └── views.sql         # 6 analytical views
```

### Frontend
```
ui/                      # Vanilla HTML/JS dashboard
  └── index.html        # Multi-tab interface (Tailwind CSS)
```

### Configuration
```
.env.example             # Configuration template
.gitignore              # Git ignore rules
```

## 🔑 Key Features

### 1. Adaptive Threshold Engine
- **Smart Switching**: Uses rolling average (7+ days) or seasonal baseline (<7 days)
- **Formula**: `threshold = regional_mean × (1 + deviation_factor)`
- **Example**: 33.5°C × 1.2 = 40.2°C threshold

### 2. Alert Fatigue Report
Shows alert reduction compared to fixed thresholds:
```json
{
  "parameter_name": "Temperature",
  "fixed_alert_count": 5,
  "adaptive_alert_count": 2,
  "reduction_percent": 60  // 60% fewer false positives!
}
```

### 3. Regional Baseline Support
Pre-loaded data for Bengaluru:
- 4 seasons (pre-monsoon, monsoon, post-monsoon, winter)
- 7 weather parameters (Temperature, Wind Speed, Visibility, Humidity, Pressure, Precipitation, UV Index)
- Mean and standard deviation per season/parameter

### 4. Department-Based Routing
Automatically routes alerts to responsible departments:
- **Aviation**: Wind Speed, Visibility
- **Agriculture**: Temperature, Humidity, Precipitation
- **Disaster**: Pressure
- **Health**: UV Index

## 🧪 Testing

### Quick Test (5 minutes)
```bash
# Terminal 1: Start server
node server.js

# Terminal 2: Run tests
# Test 1: Log normal reading
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"parameter_id": 1, "value": 28, "region_id": 1}'

# Test 2: Log anomalous reading (should trigger alert)
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"parameter_id": 1, "value": 50, "region_id": 1}'

# Test 3: Check alert fatigue
curl http://localhost:3000/api/alert-fatigue-report | jq .
```

### Full Integration Test (10 minutes)
```bash
# 1. Verify DB connection
curl http://localhost:3000/api/health

# 2. Get latest weather
curl http://localhost:3000/api/latest-weather

# 3. Inject stress test scenarios
node simulate_anomalies.js

# 4. Check all alerts
curl http://localhost:3000/api/alerts

# 5. Verify weather analysis
curl http://localhost:3000/api/analysis | jq '.summary'
```

## 📊 Database Queries

### Check Adaptive Thresholds
```sql
SELECT p.parameter_name, at.threshold_value, at.regional_mean, at.deviation_factor
FROM adaptive_threshold at
JOIN parameter p ON at.parameter_id = p.parameter_id
WHERE at.region_id = 1;
```

### View Alert History
```sql
SELECT alert_id, alert_message, severity, department, source, created_at
FROM alert
ORDER BY created_at DESC
LIMIT 20;
```

### Check Rolling Average
```sql
SELECT parameter_id, rolling_avg, reading_count
FROM rolling_average_view
WHERE region_id = 1;
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Server
PORT=3000

# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=env_monitoring
DB_PASSWORD=your_password
DB_PORT=5432

# Weather API
OPENWEATHER_API_KEY=your_api_key
TARGET_CITY=Bengaluru

# Adaptive Threshold
DEVIATION_FACTOR_DEFAULT=0.2  # Adjust for sensitivity

# Data Ingestion
REGION_ID=1
SERVER_URL=http://localhost:3000/api/data

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📈 API Reference (Quick)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/data` | Log reading + evaluate threshold | ✅ |
| GET | `/api/health` | Database connectivity | ✅ |
| GET | `/api/latest-weather` | Most recent readings | ✅ |
| GET | `/api/analysis` | Comprehensive weather analysis | ✅ |
| GET | `/api/alerts` | All alerts with source | ✅ |
| GET | `/api/alert-fatigue-report` | Alert statistics | ✅ |
| GET | `/api/admin-summary` | Database summary | ✅ |
| GET | `/api/daily-report` | Daily report | ✅ |

## ⚙️ Advanced Topics

### Tuning Alert Sensitivity
Edit `.env` and restart server:
```bash
# Less sensitive (fewer alerts)
DEVIATION_FACTOR_DEFAULT=0.3

# More sensitive (more alerts)
DEVIATION_FACTOR_DEFAULT=0.1
```

### Adding New Regions
1. Insert region into `region` table
2. Add baseline data to `regional_baseline` table
3. Update `REGION_ID` in `.env`

### Multi-Region Support
System supports multiple regions out-of-the-box:
- Each reading tagged with `region_id`
- Thresholds computed per region + parameter
- Baseline data per region + season

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| DB connection error | Check credentials in .env, verify PostgreSQL is running |
| No alerts generated | Check if reading > threshold: `regional_mean × 1.2` |
| API returns 500 | Check server logs: `cat /tmp/server.log` |
| Ingestor not syncing | Verify OPENWEATHER_API_KEY is valid |
| threshold calculation wrong | Ensure rolling_average_view has 7+ days of data |

See **IMPLEMENTATION_GUIDE.md** for detailed troubleshooting.

## 📚 Additional Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express.js Docs**: https://expressjs.com/
- **OpenWeatherMap API**: https://openweathermap.org/api
- **pg (Node.js PostgreSQL)**: https://node-postgres.com/

## 🎯 Project Status

✅ **Implementation**: Complete  
✅ **Testing**: All endpoints verified  
✅ **Documentation**: Comprehensive  
✅ **Production Ready**: Yes  

---

**Last Updated**: May 11, 2026  
**Version**: 1.0 (Complete)
