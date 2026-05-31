import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Check, Globe, Activity as ActivityIcon } from 'lucide-react';
import { Region } from '../../types/index';
import { riskColor } from '../../utils/index';

interface RegionListProps {
  regions: Region[];
  selectedRegion: Region | null;
  onSelect: (region: Region) => void;
  compareRegion: Region | null;
  onCompare: (region: Region | null) => void;
}

export const RegionList: React.FC<RegionListProps> = ({
  regions,
  selectedRegion,
  onSelect,
  compareRegion,
  onCompare,
}) => {
  const [activeDropdownOpen, setActiveDropdownOpen] = useState(false);
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);
  
  const activeRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeRef.current && !activeRef.current.contains(e.target as Node)) {
        setActiveDropdownOpen(false);
      }
      if (compareRef.current && !compareRef.current.contains(e.target as Node)) {
        setCompareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const otherRegions = regions.filter(
    (r) => r.region_id !== selectedRegion?.region_id
  );

  return (
    <div className="space-y-5 p-1 font-sans">
      {/* 1. FOCUS NODE SELECTOR */}
      <div className="space-y-1.5" ref={activeRef}>
        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
          Select Active Node (Focus)
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdownOpen(!activeDropdownOpen)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-black uppercase tracking-wider transition-all bg-[var(--surface-alt)] hover:bg-[var(--border-subtle)] active:scale-[0.99] cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2.5 truncate">
              <Globe size={14} className="text-amber-500 shrink-0 animate-spin-slow" />
              {selectedRegion ? selectedRegion.name : 'Choose Focus Node...'}
            </span>
            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${activeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {activeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 mt-1.5 max-h-[220px] overflow-y-auto rounded-xl border shadow-xl z-50 custom-scrollbar"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-default)' }}
              >
                {regions.map((region) => {
                  const isSel = selectedRegion?.region_id === region.region_id;
                  return (
                    <button
                      key={region.region_id}
                      type="button"
                      onClick={() => {
                        onSelect(region);
                        setActiveDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold transition-all text-left uppercase tracking-wider hover:bg-[var(--surface-alt)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: riskColor(region.risk_level) }} />
                        {region.name}
                      </span>
                      {isSel && <Check size={13} className="text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. COMPARATIVE NODE SELECTOR */}
      <div className="space-y-1.5" ref={compareRef}>
        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
          Select Differential Target (Compare)
        </label>
        <div className="relative">
          <button
            type="button"
            disabled={!selectedRegion}
            onClick={() => setCompareDropdownOpen(!compareDropdownOpen)}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-black uppercase tracking-wider transition-all bg-[var(--surface-alt)] hover:bg-[var(--border-subtle)] active:scale-[0.99] cursor-pointer ${
              !selectedRegion ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2.5 truncate">
              <ActivityIcon size={14} className="text-cyan-500 shrink-0" />
              {compareRegion ? compareRegion.name : 'Real-time Feed Only (None)'}
            </span>
            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${compareDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {compareDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 mt-1.5 max-h-[180px] overflow-y-auto rounded-xl border shadow-xl z-50 custom-scrollbar"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-default)' }}
              >
                {/* None option */}
                <button
                  type="button"
                  onClick={() => {
                    onCompare(null);
                    setCompareDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold transition-all text-left uppercase tracking-wider hover:bg-[var(--surface-alt)] border-b cursor-pointer"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                >
                  <span className="font-semibold italic">None (Real-time telemetry only)</span>
                  {!compareRegion && <Check size={13} className="text-emerald-500 shrink-0" />}
                </button>

                {otherRegions.map((region) => {
                  const isComp = compareRegion?.region_id === region.region_id;
                  return (
                    <button
                      key={region.region_id}
                      type="button"
                      onClick={() => {
                        onCompare(region);
                        setCompareDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold transition-all text-left uppercase tracking-wider hover:bg-[var(--surface-alt)] cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: riskColor(region.risk_level) }} />
                        {region.name}
                      </span>
                      {isComp && <Check size={13} className="text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. CONDITIONAL ACTIVE NODE OVERVIEW MINI CARDS */}
      <AnimatePresence mode="wait">
        {selectedRegion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-2xl border p-4.5 space-y-3.5"
            style={{
              background: 'var(--bg-surface-alt)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Primary active region info */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">Active Focus</span>
                <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] font-mono">{selectedRegion.code}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide truncate pr-2">
                  {selectedRegion.name}
                </span>
                <span className="text-xs font-black shrink-0 text-emerald-500" style={{ color: riskColor(selectedRegion.risk_level) }}>
                  {selectedRegion.risk_level || 'STABLE'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)] mt-1.5">
                <ActivityIcon size={11} className="text-amber-500" />
                <span className="text-[11px] font-black text-[var(--text-primary)]">
                  Stability Performance Index: <span className="font-mono text-amber-600 dark:text-amber-400">{Number(selectedRegion.overall_score ?? 0).toFixed(0)}%</span>
                </span>
              </div>
            </div>

            {/* Compared region info if active */}
            {compareRegion && (
              <div className="pt-3.5 border-t border-dashed border-[var(--border-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Differential Node</span>
                  <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] font-mono">{compareRegion.code}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide truncate pr-2">
                    {compareRegion.name}
                  </span>
                  <span className="text-[10px] font-black shrink-0 text-cyan-500">
                    {compareRegion.risk_level || 'STABLE'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
