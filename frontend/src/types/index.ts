// Region data structure
export interface Region {
  region_id: number;
  name: string;
  code?: string;
  // Root server uses latitude/longitude; backend subfolder uses center_lat/center_lon
  latitude?: number;
  longitude?: number;
  center_lat?: number;
  center_lon?: number;
  elevation?: number;
  overall_score?: number;
  risk_level?: string;
  readings?: Record<string, { value: number; recorded_at: string }>;
}

// Telemetry / sensor reading
export interface Telemetry {
  parameter_id: number;
  code: string;
  name: string;
  value: number | string;
  unit: string;
  timestamp?: string;
  region_id?: number;
}

// Alert object
export interface Alert {
  alert_id: number;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  message: string;
  parameter_id?: number;
  region_id?: number;
  created_at?: string;
}

// Stability data point (24H trend)
export interface StabilityPoint {
  hour: string;
  overall_score: number;
  [key: string]: number | string;
}

// Snapshot data for timeline replay
export interface TelemetrySnapshot {
  region_id: number;
  parameter_id: number;
  value: number | string;
  unit: string;
  recorded_at: string;
}

// Dashboard filter / view state
export interface DashboardState {
  selectedRegion: Region | null;
  compareRegion: Region | null;
  activeLayers: LayerType[];
  replayOffset: number;
  isReplaying: boolean;
  sidebarOpen: boolean;
}

export type LayerType = 'atmospheric' | 'thermal' | 'vegetation' | 'risk';

// API response shapes
export interface AnalyticsSummary {
  total_regions: number;
  active_alerts: number;
  avg_health_score: number;
  telemetry_count_24h: number;
}

// Coordinate pair
export interface Coords {
  lat: number;
  lon: number;
}