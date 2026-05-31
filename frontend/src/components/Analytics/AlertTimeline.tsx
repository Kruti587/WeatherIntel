import React from 'react';
import { useAlertSound } from '../../hooks';

interface AlertTimelineProps {
  alerts: Array<{ severity: string; message: string; time: string; alert_id: number }>;
  soundEnabled?: boolean;
}

export const AlertTimeline: React.FC<AlertTimelineProps> = ({ alerts, soundEnabled = true }) => {
  useAlertSound(alerts, soundEnabled);
  const severityStyles: Record<string, { bg: string; text: string; dot: string }> = {
    Critical: { bg: 'var(--dangerBg)', text: 'var(--danger)', dot: 'var(--danger)' },
    High:     { bg: 'rgba(251,191,36,0.15)', text: '#d97706', dot: '#f59e0b' },
    Moderate: { bg: 'var(--secondaryBg)', text: 'var(--secondary)', dot: 'var(--secondary)' },
    Low:      { bg: 'var(--primaryBg)', text: '#d97706', dot: 'var(--primary)' },
  };
  const hasCritical = alerts.some(a => a.severity === 'Critical');

  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* ── Urgency bar — red animating stripe when Critical alerts exist ── */}
      {hasCritical && <div className="alert-urgency-bar mb-3" />}
      <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>Recent Alerts</h4>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {alerts.slice(0, 5).map((alert, i) => {
          const s = severityStyles[alert.severity] || severityStyles.Low;
          const isCritical = alert.severity === 'Critical';
          return (
            <div
              key={i}
              className={`
                relative flex items-start gap-3 p-2.5 rounded-lg
                transition-all duration-200 hover:shadow-sm
                ${isCritical  ? 'danger-shake danger-stripe z-10'          : ''}
                ${alert.severity === 'High' ? 'danger-pulse' : ''}
              `}
              style={{
                background: isCritical
                  ? 'rgba(244,63,94,0.06)'
                  : 'transparent',
                border: `1px solid ${isCritical ? 'rgba(244,63,94,0.22)' : 'transparent'}`,
                overflow: 'hidden',
              }}
            >
              {/* DOT — pulsing ring only on Critical */}
              <div className={`
                w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0
                ${isCritical ? 'danger-dot' : ''}
              `}
              style={{ background: s.dot, boxShadow: isCritical ? undefined : 'none' }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`
                    text-[10px] font-bold uppercase
                    ${isCritical ? 'danger-flicker' : ''}
                    ${alert.severity === 'Critical' ? 'text-[var(--danger)]' :
                      alert.severity === 'High'     ? 'text-[#d97706]'     :
                      alert.severity === 'Moderate' ? 'text-[var(--secondary)]'
                                                    : 'text-[#d97706]'}
                  `}>
                    {alert.severity}
                  </span>
                  <span className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-mute)' }}>{alert.time}</span>
                </div>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{alert.message}</p>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <p className="text-[11px] text-center py-4" style={{ color: 'var(--text-mute)' }}>No alerts</p>
        )}
      </div>
    </div>
  );
};
