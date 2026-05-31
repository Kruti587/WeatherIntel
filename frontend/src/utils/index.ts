import { LayerType } from '../types/index';

// ─── Alert Sound — Web Audio API synth (no external assets needed) ────────────
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Play a short alert buzzer. `count` = how many beeps; gapMs = silence between beeps. */
export const playAlertSound = (count = 2, gapMs = 180): void => {
  try {
    const ctx = getCtx();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!audioCtx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        // Danger tone: 800 Hz square → 600 Hz descending sweep
        osc.type = 'square';
        osc.frequency.setValueAtTime(820, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.26);
      }, i * gapMs);
    }
  } catch { /* audio unavailable — fail silently */ }
};

/** Dynamic browser speech synthesis vocal announcer for critical operations alerts */
export const speakAlert = (message: string): void => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any current announcements to speak the fresh warning immediately
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 1.02;
      utterance.volume = 0.95;

      // Select high-fidelity English voices if available
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Zira') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel'))
      );
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.error('Speech synthesis failure:', err);
  }
};

/** Stripe critical + high alerts from `alerts` and play chime + natural voiceover on new ones. */
export const buzzOnDanger = (
  alerts: Array<{ severity: string; alert_id: number; message?: string }>,
  soundEnabled: boolean,
  lastCriticalIds: React.MutableRefObject<Set<number>>,
): void => {
  if (!soundEnabled) return;
  const now = Date.now();
  // Cooldown — only voiceover once every 5 s at most
  if (now - (lastCriticalIds.current as any)._ts < 5000) return;
  const critical = alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High');
  const newOnes = critical.filter((a) => !lastCriticalIds.current.has(a.alert_id));
  if (newOnes.length > 0) {
    (lastCriticalIds.current as any)._ts = now;
    
    // Play a single warning chime
    playAlertSound(1, 120);
    
    // Extract primary alert details for speech
    const alert = newOnes[0];
    const message = alert.message || 'System telemetry variance spike detected.';
    const speechText = `Operational Alert. ${alert.severity} threshold breached. ${message}`;
    
    // Speak out loud!
    speakAlert(speechText);
    
    newOnes.forEach((a) => lastCriticalIds.current.add(a.alert_id));
  }
};

// Convert string or number to safe number
export const safeNum = (val: unknown, fallback = 0): number => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

// Format number with optional decimals - wraps with Number() for safety
export const fmt = (val: unknown, decimals = 1): string => {
  return Number(safeNum(val)).toFixed(decimals);
};

// Build conus-safe URL params
export const apiBase = (): string => {
  return 'http://localhost:3001/api';
};

// Generate color for a layer type
export const layerColors: Record<LayerType, string> = {
  atmospheric: '#06b6d4',
  thermal: '#f59e0b',
  vegetation: '#10b981',
  risk: '#ef4444',
};

// Bright Motiosites-inspired palette (warm cream + amber/blue/violet)
export const lightColors = {
  // Core surfaces
  bg:        '#fdfcfb',              // cream-50
  bgAlt:     '#f9f8f4',              // cream-100
  surface:   '#f9f8f4',              // cream-100
  surfaceAlt:'#f3f1ea',              // cream-200
  card:      '#ffffff',
  sidebar:   '#ffffff',

  // Text
  text:      '#171412',              // charcoal-900
  textAlt:   '#25201a',              // charcoal-800
  textSec:   '#6b6358',              // charcoal-500
  textMute:  '#8a857b',              // charcoal-400

  // Borders
  border:    '#e8e4d9',              // cream-300
  borderSub: '#f3f1ea',              // cream-200
  borderBrt: '#ccc6b0',              // cream-400

  // Accent — Amber (primary)
  primary:   '#f59e0b',      // amber-500
  primaryLt: '#fcd34d',      // amber-300
  primaryBg: '#fef3c7',      // amber-100

  // Accent — Electric Blue (secondary)
  secondary:   '#3b82f6',    // blue-500
  secondaryLt: '#93c5fd',    // blue-300
  secondaryBg: '#dbeafe',    // blue-100

  // Accent — Lavender (tertiary)
  tertiary:    '#8b5cf6',    // violet-500
  tertiaryLt:  '#c4b5fd',    // violet-300
  tertiaryBg:  '#ede9fe',    // violet-100

  // Accent — Rose/Coral (danger)
  danger:   '#f43f5e',       // rose-500
  dangerLt: '#fda4af',       // rose-300
  dangerBg: '#fff0f3',       // rose-300-ish

  // Safe/OK
  success:  '#10b981',
  successLt:'#a7f3d0',
  warning:  '#f59e0b',

  // Shadows
  shadow:  '0 1px 4px rgba(26,20,14,0.06), 0 1px 2px rgba(26,20,14,0.04)',
  shadowMd:'0 4px 12px rgba(26,20,14,0.08)',
  shadowLg:'0 8px 24px rgba(26,20,14,0.10)',

  radius:   '8px',
  radiusSm: '6px',
  radiusLg: '20px',
  radiusXl: '28px',
};

// Risk color helper (bright palette)
export const riskColor = (level?: string): string => {
  switch (level) {
    case 'Extreme': return lightColors.danger;
    case 'High':    return lightColors.warning;
    case 'Moderate':return '#f59e0b';   // amber
    case 'Low':     return lightColors.success;
    default:        return lightColors.textMute;
  }
};

// Parameter display metadata
export const paramMeta: Record<string, { icon: string; label: string; unit: string; color: string }> = {
  TEMP: { icon: '•', label: 'Temperature', unit: '°C', color: '#f59e0b' },
  HUM: { icon: '•', label: 'Humidity', unit: '%', color: '#06b6d4' },
  PRESSURE: { icon: '•', label: 'Pressure', unit: 'hPa', color: '#8b5cf6' },
  WIND: { icon: '•', label: 'Wind Speed', unit: 'km/h', color: '#6366f1' },
  PRECIP: { icon: '•', label: 'Precipitation', unit: 'mm', color: '#0ea5e9' },
  AOD: { icon: '•', label: 'Aerosol Density', unit: 'AOD', color: '#94a3b8' },
  NDVI: { icon: '•', label: 'Vegetation Index', unit: 'NDVI', color: '#10b981' },
  UV: { icon: '•', label: 'UV Index', unit: 'UV', color: '#f97316' },
  CO: { icon: '•', label: 'CO Level', unit: 'ppm', color: '#a8a29e' },
  NO2: { icon: '•', label: 'NO₂ Level', unit: 'ppb', color: '#94a3b8' },
};

export const paramKeys = ['TEMP', 'HUM', 'PRESSURE', 'WIND', 'PRECIP', 'AOD', 'NDVI', 'UV', 'CO', 'NO2'];

// Format ISO string to a friendly time representation
export const formatAlertTime = (isoString?: string): string => {
  if (!isoString) return 'Just Now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return `Today at ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return isoString;
  }
};

