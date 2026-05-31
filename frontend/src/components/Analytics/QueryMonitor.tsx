import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Simulated Query Types ──────────────────────────────────────────────────
interface QueryEntry {
  id: number;
  sql: string;
  type: 'SELECT' | 'INSERT' | 'TRIGGER' | 'VIEW' | 'FUNCTION';
  table: string;
  executionTime: string;   // e.g. "0.38ms"
  rowsAffected: number;
  timestamp: string;
}

const QUERY_TEMPLATES: Omit<QueryEntry, 'id' | 'timestamp'>[] = [
  {
    sql: "SELECT t.value, p.name, p.unit FROM telemetry_data t JOIN geo_parameter p ON t.parameter_id = p.parameter_id WHERE t.region_id = $1 AND t.recorded_at > NOW() - INTERVAL '1 hour' ORDER BY t.recorded_at DESC LIMIT 50",
    type: 'SELECT',
    table: 'telemetry_data',
    executionTime: '0.38ms',
    rowsAffected: 50,
  },
  {
    sql: "INSERT INTO telemetry_data (region_id, parameter_id, value, lat, lon, recorded_at) VALUES ($1, $2, $3, $4, $5, NOW())",
    type: 'INSERT',
    table: 'telemetry_data',
    executionTime: '0.12ms',
    rowsAffected: 1,
  },
  {
    sql: "-- TRIGGER: fn_adaptive_alert_trigger()\n-- Fired on INSERT to telemetry_data\n-- Checks: value > (base_mean + base_stddev * sensitivity_multiplier)\n-- Result: Generated 'Orange' alert for Thermal Intensity",
    type: 'TRIGGER',
    table: 'geo_alert',
    executionTime: '0.45ms',
    rowsAffected: 1,
  },
  {
    sql: "SELECT * FROM v_zscore_anomalies WHERE anomaly_level IN ('Critical', 'Warning') AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY z_score DESC",
    type: 'VIEW',
    table: 'v_zscore_anomalies',
    executionTime: '1.24ms',
    rowsAffected: 12,
  },
  {
    sql: "SELECT r.name, COUNT(a.alert_id) as alert_count, MAX(a.created_at) as last_incident FROM geo_region r JOIN geo_alert a ON r.region_id = a.region_id WHERE a.created_at > NOW() - INTERVAL '24 hours' GROUP BY r.region_id, r.name",
    type: 'VIEW',
    table: 'v_regional_hotspots',
    executionTime: '0.89ms',
    rowsAffected: 5,
  },
  {
    sql: "SELECT fn_calculate_esi($1) AS environmental_stability_index",
    type: 'FUNCTION',
    table: 'region_health_score',
    executionTime: '0.67ms',
    rowsAffected: 1,
  },
  {
    sql: "SELECT r.name, p.name as parameter, t.value, LAG(t.value) OVER (PARTITION BY t.region_id, t.parameter_id ORDER BY t.recorded_at) as prev_value FROM telemetry_data t JOIN geo_region r ON t.region_id = r.region_id JOIN geo_parameter p ON t.parameter_id = p.parameter_id ORDER BY t.recorded_at DESC LIMIT 20",
    type: 'VIEW',
    table: 'v_telemetry_trends',
    executionTime: '1.56ms',
    rowsAffected: 20,
  },
  {
    sql: "SELECT region_id, parameter_id, base_mean, base_stddev, sensitivity_multiplier FROM adaptive_threshold_config WHERE region_id = $1",
    type: 'SELECT',
    table: 'adaptive_threshold_config',
    executionTime: '0.21ms',
    rowsAffected: 7,
  },
  {
    sql: "SELECT a.alert_id, a.severity, a.message, a.source, r.name FROM geo_alert a JOIN geo_region r ON a.region_id = r.region_id WHERE a.status = 'Active' ORDER BY a.created_at DESC LIMIT 20",
    type: 'SELECT',
    table: 'geo_alert',
    executionTime: '0.34ms',
    rowsAffected: 8,
  },
  {
    sql: "UPDATE region_health_score SET overall_score = fn_calculate_esi($1), calculated_at = NOW() WHERE region_id = $1",
    type: 'INSERT',
    table: 'region_health_score',
    executionTime: '0.78ms',
    rowsAffected: 1,
  },
  {
    sql: "INSERT INTO audit_log (user_id, username, action, resource, details) VALUES ($1, $2, 'QUERY_EXECUTED', 'telemetry_data', $3)",
    type: 'INSERT',
    table: 'audit_log',
    executionTime: '0.09ms',
    rowsAffected: 1,
  },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SELECT:   { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  INSERT:   { bg: 'rgba(16,185,129,0.10)', text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  TRIGGER:  { bg: 'rgba(239,68,68,0.10)',  text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  VIEW:     { bg: 'rgba(139,92,246,0.10)', text: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  FUNCTION: { bg: 'rgba(245,158,11,0.10)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
};

export const QueryMonitor: React.FC = () => {
  const [queries, setQueries] = useState<QueryEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [totalQueries, setTotalQueries] = useState(0);
  const [avgTime, setAvgTime] = useState('0.00');
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  // Generate a new query entry from templates
  const generateQuery = (): QueryEntry => {
    const template = QUERY_TEMPLATES[Math.floor(Math.random() * QUERY_TEMPLATES.length)];
    const timeVariation = (parseFloat(template.executionTime) * (0.7 + Math.random() * 0.6)).toFixed(2);
    counterRef.current += 1;

    return {
      ...template,
      id: counterRef.current,
      executionTime: `${timeVariation}ms`,
      rowsAffected: template.rowsAffected + Math.floor(Math.random() * 5),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    };
  };

  useEffect(() => {
    if (paused) return;

    // Seed initial queries
    const initial: QueryEntry[] = [];
    for (let i = 0; i < 4; i++) {
      initial.push(generateQuery());
    }
    setQueries(initial);
    setTotalQueries(4);

    const interval = setInterval(() => {
      const newQuery = generateQuery();
      setQueries(prev => {
        const updated = [newQuery, ...prev];
        return updated.slice(0, 15); // Keep last 15 queries
      });
      setTotalQueries(prev => prev + 1);
    }, 2500 + Math.random() * 1500); // Random interval between 2.5s and 4s

    return () => clearInterval(interval);
  }, [paused]);

  // Calculate average execution time
  useEffect(() => {
    if (queries.length === 0) return;
    const total = queries.reduce((sum, q) => sum + parseFloat(q.executionTime), 0);
    setAvgTime((total / queries.length).toFixed(2));
  }, [queries]);

  // Auto-scroll to top when new queries arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [queries.length]);

  // Stats
  const typeCount = queries.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            {totalQueries} Queries Executed
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Latency:</span>
          <span className="text-[11px] font-black font-mono text-amber-600">{avgTime}ms</span>
        </div>
        <button
          onClick={() => setPaused(!paused)}
          className="px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-80"
          style={{
            background: paused ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            borderColor: paused ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)',
            color: paused ? '#ef4444' : '#10b981',
          }}
        >
          {paused ? '⏸ Paused' : '● Recording'}
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          {Object.entries(typeCount).map(([type, count]) => (
            <span
              key={type}
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ 
                backgroundColor: TYPE_COLORS[type]?.bg,
                color: TYPE_COLORS[type]?.text,
                borderColor: TYPE_COLORS[type]?.border,
              }}
            >
              {type}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Query Feed */}
      <div
        ref={containerRef}
        className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1"
      >
        <AnimatePresence mode="popLayout">
          {queries.map((query) => {
            const style = TYPE_COLORS[query.type] || TYPE_COLORS.SELECT;
            return (
              <motion.div
                key={query.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="rounded-xl border p-3 space-y-2"
                style={{ background: style.bg, borderColor: style.border }}
              >
                {/* Query header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-black px-2 py-0.5 rounded-full border uppercase"
                      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                    >
                      {query.type}
                    </span>
                    <span className="text-[9px] font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
                      → {query.table}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono font-bold text-amber-600">
                      ⚡ {query.executionTime}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {query.rowsAffected} rows
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {query.timestamp}
                    </span>
                  </div>
                </div>

                {/* SQL body */}
                <pre
                  className="text-[9.5px] font-mono leading-relaxed p-2 rounded-lg overflow-x-auto"
                  style={{ 
                    color: 'var(--text-primary)',
                    background: 'rgba(255,255,255,0.5)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {query.sql}
                </pre>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Performance Summary */}
      <div className="glass-panel-solid rounded-2xl border p-4 space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          ⚡ PostgreSQL Performance Summary
        </span>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Avg Query Time', value: `${avgTime}ms`, color: '#f59e0b' },
            { label: 'Index Hit Rate', value: '99.8%', color: '#10b981' },
            { label: 'Cache Hit Ratio', value: '97.2%', color: '#3b82f6' },
            { label: 'Active Connections', value: '10', color: '#8b5cf6' },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 rounded-xl border text-center" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
              <p className="text-[17px] font-black font-mono" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
