SELECT *
FROM latest_weather_view;

SELECT *
FROM daily_weather_summary_view
WHERE day >= CURRENT_DATE - INTERVAL '10 days'
ORDER BY day DESC, parameter_name;

SELECT department, SUM(alert_count) AS total_alerts
FROM department_alerts_view
GROUP BY department
ORDER BY total_alerts DESC;

SELECT *
FROM critical_alerts_view
LIMIT 10;

SELECT
    p.parameter_name,
    fd.forecast_value,
    fd.forecast_time,
    fd.source
FROM forecast_data fd
JOIN parameter p ON p.parameter_id = fd.parameter_id
ORDER BY fd.forecast_time, p.parameter_name
LIMIT 60;
