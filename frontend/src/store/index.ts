// Zustand store for GeoEnv-IP dashboard state
import { create } from 'zustand';
import type { DashboardState, Region, Telemetry, Alert, LayerType } from '../types/index';

interface StoreState extends DashboardState {
  regions: Region[];
  telemetry: Telemetry[];
  compareTelemetry: Telemetry[];
  alerts: Alert[];
  stabilityData: any[];
  setRegions: (regions: Region[]) => void;
  selectRegion: (region: Region | null) => void;
  setCompareRegion: (compareRegion: Region | null) => void;
  setTelemetry: (telemetry: Telemetry[]) => void;
  setCompareTelemetry: (compareTelemetry: Telemetry[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setStabilityData: (stabilityData: any[]) => void;
  setActiveLayers: (activeLayers: LayerType[]) => void;
  toggleLayer: (layer: LayerType) => void;
  setReplayOffset: (replayOffset: number) => void;
  setIsReplaying: (isReplaying: boolean) => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  reset: () => void;
}

const initialState: Omit<StoreState, 'setRegions' | 'selectRegion' | 'setCompareRegion' | 'setTelemetry' | 'setCompareTelemetry' | 'setAlerts' | 'setStabilityData' | 'setActiveLayers' | 'toggleLayer' | 'setReplayOffset' | 'setIsReplaying' | 'setSidebarOpen' | 'reset'> = {
  regions: [],
  telemetry: [],
  compareTelemetry: [],
  alerts: [],
  stabilityData: [],
  selectedRegion: null,
  compareRegion: null,
  activeLayers: ['atmospheric'],
  replayOffset: 100,
  isReplaying: false,
  sidebarOpen: true,
};

export const useStore = create<StoreState>((set) => ({
  ...initialState,
  setRegions: (regions: Region[]) => set({ regions }),
  selectRegion: (region: Region | null) => set({ selectedRegion: region }),
  setCompareRegion: (compareRegion: Region | null) => set({ compareRegion }),
  setTelemetry: (telemetry: Telemetry[]) => set({ telemetry }),
  setCompareTelemetry: (compareTelemetry: Telemetry[]) => set({ compareTelemetry }),
  setAlerts: (alerts: Alert[]) => set({ alerts }),
  setStabilityData: (stabilityData: any[]) => set({ stabilityData }),
  setActiveLayers: (activeLayers: LayerType[]) => set({ activeLayers }),
  toggleLayer: (layer: LayerType) => set((state) => ({
    activeLayers: state.activeLayers.includes(layer)
      ? state.activeLayers.filter((l) => l !== layer)
      : [...state.activeLayers, layer],
  })),
  setReplayOffset: (replayOffset: number) => set({ replayOffset }),
  setIsReplaying: (isReplaying: boolean) => set({ isReplaying }),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
  reset: () => set(initialState),
}));
