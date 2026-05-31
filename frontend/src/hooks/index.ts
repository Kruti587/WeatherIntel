import { useEffect, useState, useCallback, useRef } from 'react';
import { Region, Telemetry, Alert, StabilityPoint, TelemetrySnapshot } from '../types/index';
import { apiBase, safeNum, buzzOnDanger } from '../utils/index';

// Fetch all regions
export const useRegions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase()}/regions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalise: root server returns { latitude, longitude }
      // backend subfolder returns { center_lat, center_lon }
      const normalised: Region[] = data.map((r: any) => ({
        ...r,
        center_lat: r.center_lat ?? parseFloat(r.latitude),
        center_lon: r.center_lon ?? parseFloat(r.longitude),
      }));
      setRegions(normalised);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch regions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  return { regions, loading, error, refetch: fetchRegions };
};

// Fetch telemetry for a region
export const useTelemetry = (regionId?: number) => {
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTelemetry = useCallback(async (id: number) => {
    try {
      setLoading(true);
      // Try the geo-backend route first, fall back to latest-weather
      const res = await fetch(`${apiBase()}/telemetry/latest/${id}`);
      if (res.ok) {
        const data: Telemetry[] = await res.json();
        setTelemetry(data);
      } else {
        // Root server: use latest-weather (region 1 only)
        const res2 = await fetch(`${apiBase()}/latest-weather`);
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const data = await res2.json();
        // Map to Telemetry shape
        const mapped: Telemetry[] = (Array.isArray(data) ? data : []).map((d: any, i: number) => ({
          parameter_id: i,
          code: d.parameter_name?.toUpperCase().replace(/\s+/g, '_') ?? `P${i}`,
          name: d.parameter_name ?? `Parameter ${i}`,
          value: d.measured_value ?? 0,
          unit: d.unit_measure ?? '',
          timestamp: d.recorded_at,
          region_id: id,
        }));
        setTelemetry(mapped);
      }
    } catch {
      setTelemetry([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (regionId != null) {
      fetchTelemetry(regionId);
    } else {
      setTelemetry([]);
    }
  }, [regionId, fetchTelemetry]);

  return { telemetry, loading, refetch: fetchTelemetry };
};

// Fetch alerts
export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase()}/alerts?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const normalised: Alert[] = (Array.isArray(data) ? data : [])
        .map((a: any) => ({
          alert_id: a.alert_id,
          severity: a.severity === 'Critical' ? 'Critical' : a.severity === 'Warning' ? 'High' : (a.severity ?? 'Low'),
          message: a.alert_message ?? a.message ?? '',
          parameter_id: a.parameter_id,
          region_id: a.region_id,
          created_at: a.created_at,
        }))
        .filter((a) => {
          if (!a.created_at) return true;
          try {
            const d = new Date(a.created_at);
            if (isNaN(d.getTime())) return true;
            const today = new Date();
            return (
              d.getDate() === today.getDate() &&
              d.getMonth() === today.getMonth() &&
              d.getFullYear() === today.getFullYear()
            );
          } catch {
            return true;
          }
        });
      setAlerts(normalised);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
};

// Fetch stability data for a region
export const useStability = (regionId?: number) => {
  const [data, setData] = useState<StabilityPoint[]>([]);

  const fetchStability = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${apiBase()}/regions/${id}/stability`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: StabilityPoint[] = await res.json();
      setData(result);
    } catch {
      setData([]);
    }
  }, []);

  useEffect(() => {
    if (regionId != null) fetchStability(regionId);
  }, [regionId, fetchStability]);

  return { data, refetch: fetchStability };
};

// Fetch telemetry snapshot for timeline replay
export const useSnapshot = () => {
  const [data, setData] = useState<TelemetrySnapshot[]>([]);

  const fetchSnapshot = useCallback(async (time: string) => {
    try {
      const res = await fetch(`${apiBase()}/telemetry/snapshot?time=${time}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: TelemetrySnapshot[] = await res.json();
      setData(result);
    } catch {
      setData([]);
    }
  }, []);

  return { data, fetchSnapshot };
};

// WebSocket hook for real-time telemetry
export const useWebSocket = (url: string, onMessage: (data: any) => void) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;   // always points to the latest callback

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessageRef.current(msg);   // call latest callback without re-triggering the effect
      } catch { /* ignore malformed messages */ }
    };
    ws.onerror = () => console.error('WebSocket error');
    ws.onclose = () => console.log('WebSocket disconnected');

    return () => { ws.close(); wsRef.current = null; };
  }, [url]);   // url only — prevents endless reconnect loop

  return wsRef;
};

// Alert Sound — reacts to incoming Critical / High alerts
export const useAlertSound = (
  alerts: Array<{ severity: string; alert_id: number }>,
  soundEnabled: boolean,
) => {
  const lastIdRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    buzzOnDanger(alerts, soundEnabled, lastIdRef);
  }, [alerts, soundEnabled]);
};
export const usePolling = (callback: () => void, intervalMs: number, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs, enabled]);
};
