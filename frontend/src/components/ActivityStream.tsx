import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Zap,
  Activity as ActivityIcon,
  Eye,
  Shield,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'telemetry' | 'anomaly' | 'system' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  region?: string;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'a1',
    type: 'anomaly',
    title: 'Thermal anomaly spike',
    description: 'Temperature exceeded adaptive threshold by 3.2°C',
    timestamp: '00:42',
    region: 'Zone 7',
  },
  {
    id: 'a2',
    type: 'telemetry',
    title: 'Telemetry sync complete',
    description: '42,847 readings ingested from 12 regions',
    timestamp: '00:41',
  },
  {
    id: 'a3',
    type: 'warning',
    title: 'AQI variance increasing',
    description: 'Particulate density trending upward in Eastern grid',
    timestamp: '00:38',
    region: 'East Quad',
  },
  {
    id: 'a4',
    type: 'system',
    title: 'Model retraining triggered',
    description: 'AutoML initiated for Region 3 predictor v4.2',
    timestamp: '00:35',
  },
  {
    id: 'a5',
    type: 'info',
    title: 'Satellite pass scheduled',
    description: 'Sentinel-2 overpass in 12 minutes',
    timestamp: '00:31',
    region: 'Global',
  },
  {
    id: 'a6',
    type: 'anomaly',
    title: 'Pressure gradient anomaly',
    description: 'Unusual barometric pattern detected in SE corridor',
    timestamp: '00:28',
    region: 'SE-9',
  },
  {
    id: 'a7',
    type: 'telemetry',
    title: 'NDVI baseline updated',
    description: 'Vegetation index recalibrated using 7-day window',
    timestamp: '00:25',
  },
  {
    id: 'a8',
    type: 'warning',
    title: 'GPU cluster load at 87%',
    description: 'Batch prediction queue depth exceeding threshold',
    timestamp: '00:22',
  },
];

const typeStyles: Record<ActivityItem['type'], { dot: string; border: string }> = {
  telemetry: { dot: 'bg-cyan-400', border: 'border-cyan-400' },
  anomaly: { dot: 'bg-rose-400', border: 'border-rose-400' },
  system: { dot: 'bg-violet-400', border: 'border-violet-400' },
  warning: { dot: 'bg-amber-400', border: 'border-amber-400' },
  info: { dot: 'bg-blue-400', border: 'border-blue-400' },
};

const typeIcons: Record<ActivityItem['type'], React.ReactNode> = {
  telemetry: <ActivityIcon size={12} />,
  anomaly: <AlertTriangle size={12} />,
  system: <Shield size={12} />,
  warning: <Zap size={12} />,
  info: <Eye size={12} />,
};

interface ActivityStreamProps {
  maxItems?: number;
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ maxItems = 8 }) => {
  const [activities, setActivities] = useState<ActivityItem[]>(MOCK_ACTIVITIES.slice(0, maxItems));

  // Simulate new activity arriving
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity: ActivityItem = {
          id: 'a_' + Date.now(),
          type: ['telemetry', 'anomaly', 'system', 'warning', 'info'][Math.floor(Math.random() * 5)] as ActivityItem['type'],
          title: `Live update ${prev.length + 1}`,
          description: 'System telemetry refresh cycle completed',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        };
        return [newActivity, ...prev.slice(0, maxItems - 1)];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [maxItems]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
          Activity Feed
        </h4>
        <span className="text-[9px] text-[var(--text-muted)] font-mono font-black flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        <AnimatePresence mode="popLayout">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`
                 flex items-start gap-3 p-2.5 rounded-lg border-l-2 cursor-pointer transition-all duration-200
                 ${typeStyles[activity.type].border}
                 hover:shadow-sm
               `}
               style={{ background: activity.type === 'anomaly' ? 'rgba(244,63,94,0.04)' : 'transparent' }}
            >
              <div className={`${typeStyles[activity.type].dot} w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 shadow-[0_0_6px] shadow-current/30`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-muted)]">
                      {typeIcons[activity.type]}
                    </span>
                    <span className="text-[11.5px] font-black text-[var(--text-primary)]">
                      {activity.title}
                    </span>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] font-mono font-black whitespace-nowrap ml-2">
                    {activity.timestamp}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5 truncate">
                  {activity.description}
                </p>
              </div>

              {activity.region && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-1"
                  style={{ background: 'var(--surface-alt)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                  {activity.region}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Timestamp legend */}
      <div className="pt-2 border-t border-border-subtle flex items-center justify-between px-1">
        <div className="flex gap-3 text-[9px] text-[var(--text-muted)] font-black">
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan-400" /> Telemetry
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-rose-400" /> Anomaly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-violet-400" /> System
          </span>
        </div>
        <span className="text-[9px] text-[var(--text-muted)] font-mono font-black">UTC</span>
      </div>
    </div>
  );
};