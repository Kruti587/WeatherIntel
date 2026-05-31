import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Wifi, Database, Globe, CheckCircle } from 'lucide-react';

export const InitializationSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);

  const R = {
    50:  '#F9F7ED',
    100: '#F1EDD1',
    200: '#E4DCA7',
    300: '#D4C575',
    400: '#C5AE4D',
    500: '#BFA440',   // PRIMARY GOLD
    600: '#977B30',
    700: '#775D29',
    800: '#644D27',
    900: '#564226',
    950: '#141210',   // DEEP BLACK-BROWN
  };

  const sequence = [
    { log: 'KERNEL_INITIALIZATION_V2.4.1', sub: 'Loading core environmental runtime modules...', duration: 800, icon: Activity, color: R[300] },
    { log: 'ESTABLISHING_SECURE_UPLINK', sub: 'Authenticating encrypted telemetric channels...', duration: 1000, icon: Shield, color: R[400] },
    { log: 'SYNCING_SATELLITE_EPHEMERIS', sub: 'Resolving multi-region orbital coordinates...', duration: 900, icon: Globe, color: '#3b82f6' }, // Secondary blue
    { log: 'MOUNTING_GEOSPATIAL_VOLUMES', sub: 'Indexing PostgreSQL time-series partitions...', duration: 800, icon: Database, color: R[500] },
    { log: 'NEURAL_ALERT_PIPELINE_ONLINE', sub: 'Activating ML threshold inference engines...', duration: 1000, icon: Wifi, color: '#f43f5e' }, // Rose danger
    { log: 'GEOENV_IP_OPERATIONAL', sub: 'All regional digital twins active and synchronized.', duration: 700, icon: Activity, color: '#10b981' }, // Emerald success
  ];

  const progress = Math.round((phase / sequence.length) * 100);

  useEffect(() => {
    if (phase < sequence.length) {
      const timer = setTimeout(() => {
        setPhase((prev) => prev + 1);
      }, sequence[phase].duration);
      return () => clearTimeout(timer);
    } else {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden font-mono"
      style={{ background: '#0e0b08' }} // Deep Roti warm black-brown
    >
      {/* ── Background Grid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.09 }}>
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(to right, ${R[500]} 1px, transparent 1px), linear-gradient(to bottom, ${R[500]} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Warm golden scanline sweep ── */}
      <motion.div
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-x-0 h-[2.5px] pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, rgba(191,164,64,0.2), transparent)` }}
      />

      {/* ── Roti Gold Corner brackets ── */}
      {[
        { top: '24px', left: '28px', borderTop: `2px solid ${R[500]}`, borderLeft: `2px solid ${R[500]}`, borderRadius: '4px 0 0 0' },
        { top: '24px', right: '28px', borderTop: `2px solid ${R[500]}`, borderRight: `2px solid ${R[500]}`, borderRadius: '0 4px 0 0' },
        { bottom: '24px', left: '28px', borderBottom: `2px solid ${R[500]}`, borderLeft: `2px solid ${R[500]}`, borderRadius: '0 0 0 4px' },
        { bottom: '24px', right: '28px', borderBottom: `2px solid ${R[500]}`, borderRight: `2px solid ${R[500]}`, borderRadius: '0 0 4px 0' },
      ].map((s, i) => (
        <div key={i} className="absolute w-6 h-6 opacity-80" style={s as any} />
      ))}

      <div className="relative z-10 w-[540px] max-w-[92vw]">

        {/* ── Logo ── */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-5">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[84px] h-[84px] rounded-[20px] flex items-center justify-center relative"
              style={{
                background: 'rgba(191,164,64,0.06)',
                border: `2.5px solid ${R[500]}`,
                boxShadow: `0 0 32px rgba(191,164,64,0.25), inset 0 0 18px rgba(191,164,64,0.1)`,
              }}
            >
              <Activity size={38} style={{ color: R[500] }} />
              {/* Ping ring */}
              <motion.div
                animate={{ scale: [1, 1.35], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-[20px]"
                style={{ border: `2px solid ${R[400]}` }}
              />
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-black tracking-[0.45em] uppercase"
            style={{ color: R[50], letterSpacing: '0.42em' }}
          >
            G E O E N V – I P
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] font-bold tracking-[0.28em] uppercase mt-2"
            style={{ color: R[400] }}
          >
            Environmental Intelligence OS
          </motion.p>
        </div>

        {/* ── Terminal Card ── */}
        <div
          className="rounded-2xl p-6 space-y-3.5 min-h-[220px]"
          style={{
            background: 'rgba(20, 16, 12, 0.94)',
            border: `1.5px solid ${R[700]}`,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(191,164,64,0.06)',
          }}
        >
          <AnimatePresence mode="popLayout">
            {sequence.slice(0, phase + 1).map((step, i) => {
              const Icon = step.icon;
              const isActive = i === phase && phase < sequence.length;
              const isComplete = i < phase;
              return (
                <motion.div
                  key={step.log}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3.5"
                >
                  {/* Index */}
                  <span className="text-[11px] font-black tabular-nums shrink-0 mt-0.5" style={{ color: R[700] }}>
                    [{String(i).padStart(2, '0')}]
                  </span>

                  {/* Icon / Status indicator with perfect visual feedback */}
                  <div className="shrink-0 mt-0.5">
                    {isComplete ? (
                      <CheckCircle size={14} className="text-emerald-500 animate-pulse" />
                    ) : (
                      <Icon size={14} style={{ color: step.color }} />
                    )}
                  </div>

                  {/* Text (Fixed all text contrast issues) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`text-[11px] font-black tracking-widest uppercase ${
                          isComplete ? 'text-[var(--text-muted)] opacity-60' : 'text-slate-100'
                        }`}
                      >
                        {step.log}
                      </span>
                      {isActive && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity }}
                          className="inline-block w-1.5 h-3 rounded-sm"
                          style={{ background: R[500] }}
                        />
                      )}
                      {isComplete && (
                        <span className="text-[9px] font-black tracking-wider text-emerald-400">NOMINAL</span>
                      )}
                    </div>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[9.5px] mt-0.5 font-medium leading-relaxed"
                        style={{ color: R[200] }} // High contrast cream description
                      >
                        {step.sub}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Progress bar ── */}
        <div className="mt-6 px-1">
          <div className="flex justify-between items-center mb-2.5">
            {/* Segmented Roti golden bars */}
            <div className="flex gap-1 items-end">
              {Array.from({ length: 18 }).map((_, i) => {
                const filled = i < Math.round((phase / sequence.length) * 18);
                return (
                  <motion.div
                    key={i}
                    animate={{
                      opacity: filled ? 1 : 0.15,
                      scaleY: filled ? [1, 1.4, 1] : 1,
                    }}
                    transition={{ duration: 0.4, delay: filled ? i * 0.02 : 0 }}
                    className="w-[3px] rounded-full"
                    style={{
                      height: `${10 + (i % 3) * 4}px`,
                      background: filled ? R[500] : `rgba(191,164,64,0.25)`,
                    }}
                  />
                );
              })}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: R[700] }}>
                System Boot Initialization
              </p>
              <p className="text-[11px] font-black tracking-wider font-mono" style={{ color: R[400] }}>
                {progress}%
              </p>
            </div>
          </div>

          {/* Continuous golden progress bar */}
          <div className="h-[2px] rounded-full w-full overflow-hidden" style={{ background: `rgba(191,164,64,0.1)` }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${R[700]}, ${R[500]})` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
