import React from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, Zap, TrendingUp, Info } from 'lucide-react';
import { safeNum, fmt, paramMeta } from '../../utils/index';

interface TelemetryPanelProps {
  telemetry: Array<{ parameter_id: number; code: string; name: string; value: unknown; unit: string }>;
  compareTelemetry?: Array<{ parameter_id: number; code: string; value: unknown }>;
  title?: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry, compareTelemetry, title = 'Live Telemetry Stream',
}) => {
  const average =
    telemetry.length > 0
      ? Number(telemetry.reduce((acc: number, t: any) => acc + safeNum(t.value), 0) / telemetry.length).toFixed(1)
      : '—';

  return (
    <div className="rounded-[32px] border p-8" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
            <Zap size={18} />
          </div>
          <div>
            <h4 className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-widest">{title}</h4>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Real-time Satellite Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-[var(--success)] font-black uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {telemetry.map((t: any, i: number) => {
          const meta = paramMeta[t.code] || { icon: '•', color: '#8a857b', label: t.name, unit: t.unit };
          return (
            <motion.div
              key={t.parameter_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 border transition-all group hover:shadow-md"
              style={{
                background: 'var(--bg-surface-alt)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-3.5 h-3.5 rounded-full block border transition-transform duration-300 group-hover:scale-125" style={{ backgroundColor: meta.color, borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <Info size={12} />
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{meta.label}</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-black text-[var(--text-primary)]">
                  {fmt(t.value)}
                </p>
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{meta.unit}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {telemetry.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 rounded-2xl" style={{ background: 'var(--primaryBg)', border: '1px solid var(--primaryLt)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: 'var(--primary)' }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Composite Index</span>
          </div>
          <span className="text-lg font-black" style={{ color: 'var(--primary)' }}>{average}</span>
        </div>
      )}

      {compareTelemetry && compareTelemetry.length > 0 && (
        <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--tertiaryBg)', color: 'var(--tertiary)' }}>
              <ActivityIcon size={14} />
            </div>
            <h5 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest">
              Differential Analysis (Node B)
            </h5>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {telemetry.map((t: any) => {
              const comp = compareTelemetry.find((c: any) => 
                (c.code && t.code && c.code === t.code) || 
                (c.name && t.name && c.name.toLowerCase() === t.name.toLowerCase()) ||
                c.parameter_id === t.parameter_id
              );
              if (!comp) return null;
              const diff = ((safeNum(t.value) - safeNum(comp.value)) / (safeNum(comp.value) || 1)) * 100;
              return (
                <div key={t.parameter_id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-md"
                  style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-subtle)' }}>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)]">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-[var(--text-primary)]">{fmt(t.value)}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${Number(diff) > 0
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-100 text-rose-600 border border-rose-200'
                    }`}>
                      {Number(diff) > 0 ? '+' : ''}{Number(diff).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
       )}
    </div>
  );
};
