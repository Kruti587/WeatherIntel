import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, change, icon, color }) => (
  <div className="rounded-xl border p-5 hover:shadow-md transition-shadow" style={{ background: 'var(--card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
    {change && (
      <p className={`text-[10px] font-medium mt-1 ${change.startsWith('+') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
        {change}
      </p>
    )}
  </div>
);
