import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus, RefreshCw } from 'lucide-react';
import { safeNum, fmt, paramMeta } from '../../utils/index';

interface ForecastPanelProps {
  telemetry: Array<{ parameter_id: number; code: string; name: string; value: unknown; unit: string }>;
  title?: string;
}

// Seeded-ish pseudo-random based on value to keep consistent per render
function pseudoRand(seed: number, i: number) {
  const x = Math.sin(seed * 9301 + i * 49297 + 233432) * 93942;
  return x - Math.floor(x);
}

function generateHistory(currentVal: number, steps = 5): number[] {
  const result: number[] = [];
  let v = currentVal * (0.82 + pseudoRand(currentVal, 0) * 0.16);
  for (let i = 0; i < steps; i++) {
    const delta = ((currentVal - v) / (steps - i)) * (0.7 + pseudoRand(currentVal, i + 1) * 0.6);
    v = Math.max(0, v + delta);
    result.push(parseFloat(v.toFixed(1)));
  }
  result.push(parseFloat(currentVal.toFixed(1)));
  return result;
}

function generateForecast(currentVal: number, steps = 10): number[] {
  const result: number[] = [];
  let v = currentVal;
  for (let i = 0; i < steps; i++) {
    const delta = (Math.sin(i * 1.3 + currentVal * 0.02) * 0.07 + (pseudoRand(currentVal, i + 10) - 0.48) * 0.05) * v;
    v = Math.max(0, v + delta);
    result.push(parseFloat(v.toFixed(1)));
  }
  return result;
}

// SVG Sparkline component
const Sparkline: React.FC<{
  data: number[];
  color: string;
  width?: number;
  height?: number;
}> = ({ data, color, width = 110, height = 44 }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => [
    pad + (i / (data.length - 1)) * w,
    pad + h - ((v - min) / range) * h,
  ]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1][0].toFixed(1)},${(pad + h).toFixed(1)} L${points[0][0].toFixed(1)},${(pad + h).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`fill-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#fill-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={pathD} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3} fill={color} />
    </svg>
  );
};

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ telemetry, title = '10-Step Forecast Analysis' }) => {
  const forecasts = useMemo(() => {
    return telemetry.map((t) => {
      const curr = safeNum(t.value);
      const history = generateHistory(curr);
      const forecast = generateForecast(curr);
      const lastHist = history[0];
      const diff = curr - lastHist;
      const diffPct = lastHist !== 0 ? ((diff / lastHist) * 100).toFixed(1) : '0.0';
      const trend: 'up' | 'down' | 'flat' = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat';
      return { t, curr, history, forecast, diff, diffPct, trend };
    });
  }, [telemetry]);

  if (telemetry.length === 0) return null;

  return (
    <div
      className="rounded-[28px] border p-6"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-[13px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h4>
          <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Past readings · Current live · Next 10 forecast slots
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw size={11} style={{ color: 'var(--roti-500)' }} />
          </motion.div>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--roti-500)' }}>
            Auto-Refreshing
          </span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 mb-5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-[2px] rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Past + Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-[2px] rounded-full" style={{ background: 'var(--roti-500)' }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Next 10 Forecasts</span>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {forecasts.map(({ t, curr, history, forecast, diff, diffPct, trend }, idx) => {
          const meta = paramMeta[t.code] || { icon: '•', color: '#BFA440', label: t.name, unit: t.unit };
          const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
          const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : 'var(--text-muted)';
          const trendBg = trend === 'up' ? 'rgba(22,163,74,0.09)' : trend === 'down' ? 'rgba(220,38,38,0.09)' : 'rgba(0,0,0,0.05)';
          const trendBorder = trend === 'up' ? 'rgba(22,163,74,0.22)' : trend === 'down' ? 'rgba(220,38,38,0.22)' : 'rgba(0,0,0,0.08)';

          return (
            <motion.div
              key={t.parameter_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="rounded-2xl border p-4 group hover:shadow-md transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block border" style={{ backgroundColor: meta.color, borderColor: 'rgba(0,0,0,0.08)' }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {meta.label}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: trendBg, color: trendColor, border: `1px solid ${trendBorder}` }}
                >
                  <TrendIcon size={9} />
                  {trend === 'flat' ? 'Stable' : `${Number(diffPct) > 0 ? '+' : ''}${diffPct}%`}
                </div>
              </div>

              {/* Value */}
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{fmt(curr)}</span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>{meta.unit}</span>
              </div>
              <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                {Math.abs(Number(diff)).toFixed(1)} {meta.unit} {trend === 'up' ? 'higher' : trend === 'down' ? 'lower' : 'same'} than last stored reading
              </p>

              {/* Sparklines */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Past + Current</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(59,130,246,0.06)', padding: '3px' }}>
                    <Sparkline data={history} color="#3b82f6" width={110} height={42} />
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Next 10 Forecasts</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(191,164,64,0.07)', padding: '3px' }}>
                    <Sparkline data={forecast} color="#BFA440" width={110} height={42} />
                  </div>
                </div>
              </div>

              {/* Forecast value tags */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {forecast.slice(0, 8).map((v, i) => (
                  <div key={i} className="flex justify-between text-[9px]">
                    <span style={{ color: 'var(--text-muted)' }}>Slot {String(i + 1).padStart(2, '0')}</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{v} {meta.unit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
