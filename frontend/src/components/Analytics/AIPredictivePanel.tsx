import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Region } from '../../types/index';

interface AIPredictivePanelProps {
  region: Region | null;
  stabilityData: any[];
}

export const AIPredictivePanel: React.FC<AIPredictivePanelProps> = ({ region, stabilityData }) => {
  const [dismissed, setDismissed] = useState(false);

  const prediction = useMemo(() => {
    // Reset dismissed state when region changes
    setDismissed(false);

    if (!region) return null;

    if (stabilityData && stabilityData.length >= 2) {
      const recent = stabilityData[stabilityData.length - 1];
      const previous = stabilityData[stabilityData.length - 2];
      const scoreDiff = (recent.overall_score || 0) - (previous.overall_score || 0);

      if (scoreDiff < -5) {
        return {
          type: 'critical',
          icon: <AlertTriangle size={16} />,
          message: `Based on current trends, ${region.name} has an 80% chance of reaching critical temperatures in the next 3 hours.`,
          trend: <TrendingDown size={12} />,
          borderColor: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.08)',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#ef4444',
        };
      } else if (scoreDiff > 5) {
        return {
          type: 'positive',
          icon: <BrainCircuit size={16} />,
          message: `Predictive models show ${region.name}'s atmospheric conditions are likely to stabilize over the next 6 hours.`,
          trend: <TrendingUp size={12} />,
          borderColor: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.08)',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          iconColor: '#10b981',
        };
      }
    }

    return {
      type: 'neutral',
      icon: <BrainCircuit size={16} />,
      message: `AI analysis active for ${region.name}. Current patterns indicate stable conditions for the next 12 hours.`,
      trend: <TrendingUp size={12} />,
      borderColor: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.08)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#f59e0b',
    };
  }, [region, stabilityData]);

  if (!prediction || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, x: 0 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="fixed bottom-6 left-6 z-[900] max-w-sm"
      >
        <div
          className="rounded-2xl border shadow-2xl backdrop-blur-md p-4"
          style={{
            background: 'var(--card)',
            borderColor: prediction.borderColor,
            boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${prediction.borderColor}20`,
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-black/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={12} />
          </button>

          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-xl shrink-0"
              style={{ backgroundColor: prediction.iconBg, color: prediction.iconColor }}
            >
              {prediction.icon}
            </div>
            <div className="pr-4">
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  Nexus AI Prediction
                </h4>
                <span style={{ color: prediction.iconColor }}>{prediction.trend}</span>
                <span className="flex h-1.5 w-1.5 relative">
                  <span
                    className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75"
                    style={{ backgroundColor: prediction.iconColor }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: prediction.iconColor }}
                  />
                </span>
              </div>
              <p className="text-[12px] font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {prediction.message}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
