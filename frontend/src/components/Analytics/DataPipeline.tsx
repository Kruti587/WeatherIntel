import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Pipeline Stages ──────────────────────────────────────────────────────────
interface PipelineStage {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  details: string[];
}

const STAGES: PipelineStage[] = [
  {
    id: 'sources',
    label: 'Satellite Sensors',
    sublabel: 'ISRO / NASA / ESA',
    icon: '🛰️',
    color: '#8b5cf6',
    details: [
      'INSAT-3DR — Thermal IR & Water Vapor',
      'MODIS — NDVI & Land Surface Temp',
      'Sentinel-2 — Multispectral Imagery',
      'Ground Stations — IoT Rain Gauges',
    ],
  },
  {
    id: 'ingestor',
    label: 'API Ingestor',
    sublabel: 'Express.js REST Layer',
    icon: '⚡',
    color: '#f59e0b',
    details: [
      'Rate-limited API (100 req/15min)',
      'Helmet.js security headers',
      'JSON payload validation',
      'API key authentication',
    ],
  },
  {
    id: 'database',
    label: 'PostgreSQL',
    sublabel: 'DBMS Core Engine',
    icon: '🐘',
    color: '#3b82f6',
    details: [
      'Range-partitioned telemetry_data',
      'B-Tree indexes on recorded_at',
      'Adaptive threshold triggers',
      'Z-score anomaly detection views',
    ],
  },
  {
    id: 'triggers',
    label: 'DB Triggers',
    sublabel: 'PL/pgSQL Intelligence',
    icon: '🔁',
    color: '#ef4444',
    details: [
      'fn_adaptive_alert_trigger()',
      'fn_fixed_alert_trigger()',
      'fn_calculate_esi()',
      'event_pipeline_log INSERT',
    ],
  },
  {
    id: 'websocket',
    label: 'WebSocket',
    sublabel: 'Real-time Broadcast',
    icon: '📡',
    color: '#10b981',
    details: [
      'ws://localhost:3001',
      'Alert broadcast to all clients',
      'Auto-reconnect on disconnect',
      'Binary frame compression',
    ],
  },
  {
    id: 'dashboard',
    label: 'React Dashboard',
    sublabel: 'GeoEnv-IP Frontend',
    icon: '🖥️',
    color: '#06b6d4',
    details: [
      'Zustand state management',
      'Leaflet.js spatial map',
      'Real-time telemetry panels',
      'PDF report generator',
    ],
  },
];

// ── Animated Data Packet ──────────────────────────────────────────────────
const DataPacket: React.FC<{ delay: number; color: string }> = ({ delay, color }) => (
  <motion.div
    className="absolute w-2.5 h-2.5 rounded-full z-10"
    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
    initial={{ left: '0%', opacity: 0 }}
    animate={{
      left: ['0%', '100%'],
      opacity: [0, 1, 1, 0],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

export const DataPipeline: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [packetCount, setPacketCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPacketCount(prev => prev + Math.floor(Math.random() * 5) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      {/* Pipeline Stats Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Pipeline Active
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Packets Processed:</span>
          <span className="text-[11px] font-black font-mono text-blue-500">{packetCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stages:</span>
          <span className="text-[11px] font-black font-mono text-amber-600">{STAGES.length}</span>
        </div>
      </div>

      {/* Main Pipeline Flow */}
      <div className="glass-panel-solid rounded-2xl border p-5 overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-start gap-0">
          {STAGES.map((stage, index) => (
            <React.Fragment key={stage.id}>
              {/* Stage Card */}
              <motion.div
                onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                className="flex-1 min-w-0 cursor-pointer"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div
                  className={`rounded-2xl border p-3.5 space-y-2 transition-all duration-300 ${activeStage === stage.id ? 'ring-2' : ''}`}
                  style={{
                    background: activeStage === stage.id
                      ? `linear-gradient(135deg, ${stage.color}08, ${stage.color}12)`
                      : 'var(--surface-alt)',
                    borderColor: activeStage === stage.id ? stage.color : 'var(--border-subtle)',
                    ...(activeStage === stage.id ? { boxShadow: `0 0 0 2px ${stage.color}40` } : {}),
                  }}
                >
                  {/* Icon */}
                  <div className="text-center">
                    <motion.span
                      className="text-2xl block"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    >
                      {stage.icon}
                    </motion.span>
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color: stage.color }}>
                      {stage.label}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>
                      {stage.sublabel}
                    </p>
                  </div>

                  {/* Status dot */}
                  <div className="flex justify-center">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: stage.color }} />
                  </div>
                </div>
              </motion.div>

              {/* Connector Arrow */}
              {index < STAGES.length - 1 && (
                <div className="flex items-center justify-center px-1 pt-10 relative" style={{ minWidth: '32px' }}>
                  {/* Animated connector line */}
                  <div className="relative w-full h-0.5 overflow-hidden rounded-full" style={{ background: `linear-gradient(90deg, ${stage.color}40, ${STAGES[index + 1].color}40)` }}>
                    <DataPacket delay={index * 0.4} color={stage.color} />
                    <DataPacket delay={index * 0.4 + 1} color={STAGES[index + 1].color} />
                  </div>
                  {/* Arrow head */}
                  <svg width="8" height="12" viewBox="0 0 8 12" className="shrink-0 -ml-1" style={{ color: STAGES[index + 1].color }}>
                    <path d="M 0 0 L 8 6 L 0 12 Z" fill="currentColor" opacity={0.4} />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Expanded Stage Details */}
      <AnimatePresence mode="wait">
        {activeStage && (() => {
          const stage = STAGES.find(s => s.id === activeStage);
          if (!stage) return null;
          return (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-panel-solid rounded-2xl border p-5 space-y-3"
              style={{ borderColor: stage.color }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stage.icon}</span>
                <div>
                  <h4 className="text-[12px] font-black uppercase tracking-wider" style={{ color: stage.color }}>
                    {stage.label}
                  </h4>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>{stage.sublabel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {stage.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border-subtle)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-[10px] font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                      {detail}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Architecture Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-panel-solid rounded-2xl border p-4 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            🔐 Security Layer
          </span>
          <div className="space-y-1">
            {['Helmet.js XSS protection', 'Rate limiting (100 req/15min)', 'Bcrypt password hashing', 'Session-based authentication'].map((item, i) => (
              <p key={i} className="text-[10px] font-mono font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-emerald-500">✓</span> {item}
              </p>
            ))}
          </div>
        </div>

        <div className="glass-panel-solid rounded-2xl border p-4 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            🗄️ Storage Architecture
          </span>
          <div className="space-y-1">
            {['Time-range partitioning (monthly)', 'B-Tree indexes (recorded_at DESC)', 'JSONB spatial boundaries', 'Composite PKs for partitions'].map((item, i) => (
              <p key={i} className="text-[10px] font-mono font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-blue-500">✓</span> {item}
              </p>
            ))}
          </div>
        </div>

        <div className="glass-panel-solid rounded-2xl border p-4 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            📊 Intelligence Layer
          </span>
          <div className="space-y-1">
            {['Adaptive μ ± Kσ thresholds', 'Z-score anomaly detection', 'LAG() temporal trend analysis', 'ESI stability computation'].map((item, i) => (
              <p key={i} className="text-[10px] font-mono font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-violet-500">✓</span> {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
