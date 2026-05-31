import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Layers,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Activity,
  Eye,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../store';
import { useRegions, useTelemetry, useStability } from '../hooks';

interface Mission {
  id: number;
  title: string;
  description: string;
  objective: string;
  hint: string;
  status: 'locked' | 'available' | 'active' | 'completed';
}

interface MissionOverlayProps {
  onClose: () => void;
}

const MISSIONS: Mission[] = [
  {
    id: 1,
    title: 'Thermal Investigation',
    description: 'Investigate temperature anomaly in Bangalore',
    objective: 'Select Bangalore region and examine thermal readings',
    hint: 'Click on any region node in the sidebar or map to begin.',
    status: 'available',
  },
  {
    id: 2,
    title: 'Atmospheric Analysis',
    description: 'Explore atmospheric data patterns',
    objective: 'Switch to the Atmospheric layer and observe aerosol density',
    hint: 'Use the layer controls on the left panel to switch views.',
    status: 'locked',
  },
  {
    id: 3,
    title: 'Temporal Replay',
    description: 'Rewind time to observe environmental changes',
    objective: 'Use the timeline scrubber to replay the last 24 hours',
    hint: 'Find the timeline panel below the main view.',
    status: 'locked',
  },
  {
    id: 4,
    title: 'Region Comparison',
    description: 'Compare conditions between two regions',
    objective: 'Select a second region for side-by-side comparison',
    hint: 'Click the "VS" button on any region in the sidebar.',
    status: 'locked',
  },
  {
    id: 5,
    title: 'Anomaly Detection',
    description: 'Identify and investigate anomalous readings',
    objective: 'Find any telemetry value that deviates significantly from normal',
    hint: 'Look for unusually high or low values in the telemetry panel.',
    status: 'locked',
  },
];

export const MissionOverlay: React.FC<MissionOverlayProps> = ({ onClose }) => {
  const [currentMission, setCurrentMission] = useState<number>(0);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [missionProgress, setMissionProgress] = useState(0);

  const store = useStore();
  const { data: stabilityData } = useStability(store.selectedRegion?.region_id);

  // Check mission completion
  useEffect(() => {
    // Mission 1: Selected a region
    if (store.selectedRegion && !completedMissions.includes(1)) {
      setCompletedMissions((prev) => [...prev, 1]);
      setTimeout(() => setCurrentMission(1), 1500);
    }
    // Mission 5: Anomaly - check for high telemetry variance
    if (store.telemetry.length > 0) {
      const hasAnomaly = store.telemetry.some((t) => {
        const v = Number(t.value);
        return v > 100 || v < -50;
      });
      if (hasAnomaly && !completedMissions.includes(5) && completedMissions.includes(1)) {
        setCompletedMissions((prev) => [...prev, 5]);
      }
    }
    // Mission 3: Replay active
    if (store.isReplaying && !completedMissions.includes(3)) {
      setCompletedMissions((prev) => [...prev, 3]);
    }
    // Mission 4: Compare region
    if (store.compareRegion && !completedMissions.includes(4)) {
      setCompletedMissions((prev) => [...prev, 4]);
    }
  }, [store.selectedRegion, store.telemetry, store.isReplaying, store.compareRegion]);

  // Update progress
  useEffect(() => {
    setMissionProgress(Math.round((completedMissions.length / MISSIONS.length) * 100));
  }, [completedMissions]);

  const currentMissionData = MISSIONS[currentMission];
  const isCompleted = completedMissions.includes(currentMissionData.id);

  const handleNextMission = () => {
    if (currentMission < MISSIONS.length - 1) {
      setCurrentMission((prev) => prev + 1);
    }
  };

  const handlePrevMission = () => {
    if (currentMission > 0) {
      setCurrentMission((prev) => prev - 1);
    }
  };

  const handleSkipAll = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[6000] pointer-events-none overflow-hidden"
      >
        {/* Mission sidebar panel */}
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-80 bg-[#0e0e1a]/95 backdrop-blur-2xl border border-cyan-500/20 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.08)] p-5 space-y-4 z-[6001] pointer-events-auto"
        >
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-cyan-400 font-mono font-bold">MISSION PROGRESS</span>
              <span className="text-gray-500 font-mono">{missionProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                style={{ width: `${missionProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Mission counter */}
          <div className="text-[10px] text-gray-600 font-mono">
            Mission {currentMission + 1} of {MISSIONS.length}
          </div>

          {/* Current mission */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Target size={14} className="text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white tracking-wide">
                  {currentMissionData.title}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  {currentMissionData.description}
                </p>
              </div>
            </div>

            {/* Objective */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-start gap-2">
                <CheckCircle size={12} className={`mt-0.5 flex-shrink-0 ${isCompleted ? 'text-emerald-400' : 'text-gray-600'}`} />
                <div>
                  <p className={`text-[10px] font-medium ${isCompleted ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {isCompleted ? '✓ Objective Complete!' : 'Objective:'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {currentMissionData.objective}
                  </p>
                </div>
              </div>
            </div>

            {/* Hint */}
            <div className="mt-2">
              <button
                onClick={() => setHintsVisible(!hintsVisible)}
                className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <Eye size={10} />
                {hintsVisible ? 'Hide' : 'Show'} Hint
              </button>
              <AnimatePresence>
                {hintsVisible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-2 bg-violet-500/5 border border-violet-500/15 rounded-lg"
                  >
                    <p className="text-[10px] text-violet-300 italic">
                      <span className="font-bold uppercase tracking-wider not-italic mr-1 text-[9px] text-violet-400">Hint:</span> {currentMissionData.hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Completed indicator */}
            <AnimatePresence>
              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 flex items-center justify-center py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                >
                  <CheckCircle size={14} className="text-emerald-400 mr-2" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Mission Complete
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={handlePrevMission}
              disabled={currentMission === 0}
              className="flex-1 py-2 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <button
              onClick={handleNextMission}
              disabled={!isCompleted || currentMission === MISSIONS.length - 1}
              className="flex-1 py-2 px-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[11px] text-cyan-400 hover:bg-cyan-500/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {currentMission === MISSIONS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={12} />
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={12} /> Dismiss Mission Guide
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const MissionSystem: React.FC<MissionOverlayProps> = MissionOverlay;