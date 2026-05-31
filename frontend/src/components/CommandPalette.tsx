import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BarChart3,
  Clock,
  Settings,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { useStore } from '../store';

interface CommandItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  shortcut?: string;
  action?: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dynamicCommands: CommandItem[] = [
    // --- Regions navigation ---
    ...store.regions.map((r, idx) => ({
      icon: <Globe size={16} />,
      label: `Focus Region: ${r.name}`,
      description: `Center map on ${r.name} and load telemetry`,
      shortcut: idx < 5 ? `F${idx + 1}` : undefined,
      action: () => {
        store.selectRegion(r);
        store.setSidebarOpen(true);
      },
      category: 'Navigation',
    })),

    // --- Active region comparison ---
    ...store.regions
      .filter((r) => r.region_id !== store.selectedRegion?.region_id)
      .map((r) => ({
        icon: <BarChart3 size={16} />,
        label: `Compare with: ${r.name}`,
        description: `Compare ${store.selectedRegion?.name || 'current region'} with ${r.name}`,
        action: () => {
          store.setCompareRegion(r);
        },
        category: 'Comparison',
      })),



    // --- Timeline controls ---
    {
      icon: <Clock size={16} />,
      label: store.isReplaying ? 'Pause Timeline Replay' : 'Start Timeline Replay',
      description: store.isReplaying ? 'Pause historical data playback' : 'Play 24h historical telemetry playback',
      shortcut: 'T',
      action: () => store.setIsReplaying(!store.isReplaying),
      category: 'Timeline Simulation',
    },
    {
      icon: <RefreshCw size={16} />,
      label: 'Reset Timeline to Live',
      description: 'Restore telemetry display to real-time feed',
      shortcut: 'R',
      action: () => {
        store.setIsReplaying(false);
        store.setReplayOffset(100);
      },
      category: 'Timeline Simulation',
    },


    {
      icon: <Settings size={16} />,
      label: store.sidebarOpen ? 'Hide Left Sidebar' : 'Show Left Sidebar',
      description: 'Toggle the left regions & layers control panel',
      shortcut: 'S',
      action: () => store.setSidebarOpen(!store.sidebarOpen),
      category: 'System',
    },
  ];

  const filteredCommands = query.trim()
    ? dynamicCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : dynamicCommands;

  const categories = [...new Set(filteredCommands.map((c) => c.category))];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!isOpen && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Will be handled by parent
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filteredCommands[activeIndex]) {
        filteredCommands[activeIndex].action?.();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, filteredCommands, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="command-palette-backdrop" onClick={onClose} />
      <div className="command-palette">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border-subtle">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            className="command-palette-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-[10px] text-muted font-mono px-1.5 py-0.5 border border-border-subtle rounded bg-white/5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {categories.map((category) => {
            const items = filteredCommands.filter((c) => c.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <div className="command-palette-group-label">{category}</div>
                {items.map((cmd, idx) => {
                  const globalIdx = filteredCommands.indexOf(cmd);
                  return (
                    <div
                      key={cmd.label}
                      className={`command-palette-item ${globalIdx === activeIndex ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      onClick={() => { cmd.action?.(); onClose(); }}
                    >
                      <div className="command-palette-item-icon">
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="command-palette-item-label">{cmd.label}</div>
                        <div className="command-palette-item-desc truncate">{cmd.description}</div>
                      </div>
                      {cmd.shortcut && (
                        <div className="command-palette-item-shortcut">{cmd.shortcut}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};