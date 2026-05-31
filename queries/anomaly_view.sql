-- =============================================================
-- Z-Score Anomaly Detection View
-- 
-- What this does:
--   For every reading in the last 30 days, computes how many
--   standard deviations it is from the seasonal IMD baseline.
--
--   z_score = (measured_value - seasonal_mean) / seasonal_std_dev
--
-- Interpretation:
--   |z| < 1.5  → Normal variation
--   |z| 1.5–2.5 → Unusual (watch)
--   |z| > 2.5  → Statistical anomaly (flag regardless of threshold)
--   |z| > 3.5  → Extreme event (rare, research-worthy)
--
-- Why this matters for the research paper:
--   The adaptive threshold catches relative exceedances.
--   The Z-score catches absolute statistical anomalies.
--   Together they form a two-layer detection system — this is
--   the novel contribution: adaptive + statistical dual-layer.
-- =============================================================

CREATE OR REPLACE VIEW anomaly_score_view AS
SELECT
    ed.data_id,
    ed.region_id,
    r.name                                          AS region_name,
    p.parameter_name,
    p.unit_measure,
    ed.measured_value,
    ed.recorded_at,
    rb.season,
    rb.mean_value                                   AS baseline_mean,
    rb.std_dev                                      AS baseline_std_dev,
    -- Z-score: how many std devs from seasonal norm
    ROUND(
        ((ed.measured_value - rb.mean_value) / rb.std_dev)::numeric,
        2
    )                                               AS z_score,
    -- Human-readable anomaly level
    CASE
        WHEN ABS((ed.measured_value - rb.mean_value) / rb.std_dev) > 3.5 THEN 'Extreme'
        WHEN ABS((ed.measured_value - rb.mean_value) / rb.std_dev) > 2.5 THEN 'Anomaly'
        WHEN ABS((ed.measured_value - rb.mean_value) / rb.std_dev) > 1.5 THEN 'Unusual'
        ELSE 'Normal'
    END                                             AS anomaly_level,
    -- Direction
    CASE
        WHEN ed.measured_value > rb.mean_value THEN 'above'
        ELSE 'below'
    END                                             AS direction
FROM environmental_data ed
JOIN parameter p ON p.parameter_id = ed.parameter_id
JOIN region r    ON r.region_id    = ed.region_id
JOIN regional_baseline rb
    ON  rb.region_id    = ed.region_id
    AND rb.parameter_id = ed.parameter_id
    AND rb.season = CASE
        WHEN EXTRACT(MONTH FROM ed.recorded_at AT TIME ZONE 'Asia/Kolkata') IN (3,4,5)   THEN 'pre-monsoon'
        WHEN EXTRACT(MONTH FROM ed.recorded_at AT TIME ZONE 'Asia/Kolkata') IN (6,7,8,9) THEN 'monsoon'
        WHEN EXTRACT(MONTH FROM ed.recorded_at AT TIME ZONE 'Asia/Kolkata') IN (10,11)   THEN 'post-monsoon'
        ELSE 'winter'
    END
WHERE ed.recorded_at >= NOW() - INTERVAL '30 days';

-- ── Aggregated anomaly summary per region ─────────────────────
-- Useful for the research paper: "which region had the most anomalies?"
CREATE OR REPLACE VIEW anomaly_summary_view AS
SELECT
    region_id,
    region_name,
    parameter_name,
    COUNT(*)                                        AS total_readings,
    COUNT(*) FILTER (WHERE anomaly_level = 'Normal')   AS normal_count,
    COUNT(*) FILTER (WHERE anomaly_level = 'Unusual')  AS unusual_count,
    COUNT(*) FILTER (WHERE anomaly_level = 'Anomaly')  AS anomaly_count,
    COUNT(*) FILTER (WHERE anomaly_level = 'Extreme')  AS extreme_count,
    ROUND(AVG(ABS(z_score))::numeric, 2)            AS avg_abs_z_score,
    ROUND(MAX(ABS(z_score))::numeric, 2)            AS max_abs_z_score
FROM anomaly_score_view
GROUP BY region_id, region_name, parameter_name
ORDER BY region_name, parameter_name;
