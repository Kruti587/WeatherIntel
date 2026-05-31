import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Settings,
  Menu,
  Zap,
  Activity as ActivityIcon,
  Shield,
  Cpu,
  Cloud,
  ChevronDown,
  Sun,
  Moon,
  Command,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react';
import { useOnboarding } from './onboarding/OnboardingContext';
import { useStore } from '../store';
import { formatAlertTime } from '@/utils';
import { AnimatedThemeToggler } from '@/registry/magicui/animated-theme-toggler';

interface TopNavProps {
  onCommandPaletteOpen: () => void;
  onToggleTheme: () => void;
  theme?: 'dark' | 'light';
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSettingsOpen?: () => void;
  onPolicyOpen?: () => void;
}

const systemStatus = {
  gpu: { usage: 73, temperature: 67, label: 'GPU Cluster' },
  memory: { usage: 61, label: 'Memory' },
  cloud: { status: 'synced', label: 'Cloud Sync' },
  agents: { count: 4, active: 3, label: 'AI Agents' },
};

export const TopNavigation: React.FC<TopNavProps> = ({ 
  onCommandPaletteOpen, 
  onToggleTheme, 
  theme = 'light', 
  soundEnabled = true, 
  onToggleSound = () => { },
  onSettingsOpen = () => { },
  onPolicyOpen = () => { }
}) => {
  const store = useStore();
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const activeHighAlerts = store.alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High');
  const notificationCount = activeHighAlerts.length;
  const { user, setUser, setStep } = useOnboarding();

  const handleLogout = async () => {
    const session = localStorage.getItem('geoenv_session');
    if (session) {
      try {
        await fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: { 'X-Session-Id': session },
          credentials: 'include',
        });
      } catch { /* ignore */ }
    }
    setUser(null);
    setStep('LOGIN');
  };

  // User initials for avatar
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'RD';

  const StatusIndicator: React.FC<{ label: string; value: number; max?: number; suffix?: string; color: string }> = ({
    label, value, max = 100, suffix = '%', color,
  }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-subtle)' }}>
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${(value / max) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={`text-[10px] font-mono font-bold ${value > 80 ? 'text-[var(--danger)]' : value > 60 ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}`}>
        {value}{suffix}
      </span>
    </div>
  );

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="h-14 flex-shrink-0 z-40 flex items-center justify-between px-5 transition-colors duration-300"
      style={{ background: theme === 'dark' ? 'rgba(34, 28, 17, 0.90)' : 'rgba(255, 255, 255, 0.90)', borderBottom: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: 'var(--primaryBg)', borderColor: 'var(--primaryLt)' }}>
            <Zap size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <span className="text-sm font-black text-[var(--text-primary)] tracking-[0.15em] uppercase">
            GeoEnv-IP
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-alt)', color: 'var(--text-mute)' }}>
            v2.4.1
          </span>
        </div>


      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-lg mx-8">
        <div
          className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-[var(--border-subtle)] cursor-pointer transition-all"
          style={{ background: 'var(--surface-alt)' }}
          onClick={onCommandPaletteOpen}
        >
          <Search size={15} className="text-[var(--text-mute)] group-hover:text-[var(--text-secondary)] transition-colors" />
          <span className="text-sm text-[var(--text-mute)] group-hover:text-[var(--text-secondary)] transition-colors">
            Search datasets, models, regions...
          </span>
          <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border text-[var(--text-mute)]"
            style={{ background: 'var(--bg-card)' }}>⌘K</kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSettingsOpen}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-alt)]"
          title="System Settings"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={15} />
        </button>
        <button
          onClick={onToggleSound}
          className={`btn-sound relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-alt)] ${soundEnabled ? 'is-on' : ''}`}
          title={soundEnabled ? 'Disable threat voiceover announcements' : 'Enable threat voiceover announcements'}
        >
          {soundEnabled ? <Volume2 size={15} style={{ color: 'var(--danger)' }} /> : <VolumeX size={15} style={{ color: 'var(--text-mute)' }} />}
        </button>
        <AnimatedThemeToggler theme={theme} onToggle={onToggleTheme} />
        <div className="relative">
          <button
            onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-alt)]"
            title="Notifications"
          >
            <Bell size={15} style={{ color: 'var(--text-secondary)' }} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white animate-pulse"
                style={{ background: 'var(--danger)' }}>
                {notificationCount}
              </span>
            )}
          </button>

          {alertsDropdownOpen && (
            <div className="absolute right-0 top-10 w-80 glass-panel-solid rounded-2xl border p-4 shadow-xl z-50 animate-fadeIn" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)]">Active Threat Alerts</span>
                <button onClick={() => setAlertsDropdownOpen(false)} className="text-[9px] font-black text-[var(--danger)] hover:underline uppercase">Close</button>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {activeHighAlerts.length === 0 ? (
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider py-4 text-center">No high-severity threats active</p>
                ) : (
                  activeHighAlerts.map((a) => (
                    <div key={a.alert_id} className="p-2.5 rounded-xl border flex flex-col gap-1" style={{ background: 'var(--dangerBg)', borderColor: 'var(--dangerLt)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--danger)]">{a.severity}</span>
                        <span className="text-[8px] font-mono text-[var(--text-muted)]">{formatAlertTime(a.created_at)}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-snug">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border-subtle)' }} />

        {/* User badge + logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 cursor-default">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: 'var(--secondaryBg)', borderColor: 'var(--secondaryLt)' }}>
              <span className="text-[10px] font-black" style={{ color: 'var(--secondary)' }}>{initials}</span>
            </div>
            {user && (
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">{user.username}</span>
                <span className="text-[9px] font-mono text-[var(--text-mute)] uppercase">{user.role}</span>
              </div>
            )}
            {!user && (
              <span className="text-[11px] font-medium text-[var(--text-secondary)] hidden sm:inline">Research Division</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-50 hover:text-rose-500"
            style={{ color: 'var(--text-mute)' }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </motion.header>
  );
};

