import L from 'leaflet';
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Region, LayerType } from '../../types/index';
import { layerColors, riskColor } from '../../utils/index';
import { LayerControl } from './LayerControl';

// Fix leaflet default icon path
const iconDefault = (L.Icon.Default as any).prototype;
delete iconDefault._getIconUrl;
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeoMapProps {
  regions: Region[];
  selectedRegion: Region | null;
  activeLayers: LayerType[];
  onRegionSelect: (region: Region) => void;
  onToggleLayer?: (layer: LayerType) => void;
}

// Helper to auto-center map and force Leaflet size recalculation
const MapAutoCenter = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(coords, map.getZoom(), { animate: true });
    
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [coords, map]);
  return null;
};


export const GeoMap: React.FC<GeoMapProps> = ({
  regions,
  selectedRegion,
  activeLayers,
  onRegionSelect,
  onToggleLayer,
}) => {
  const [layerDropdownOpen, setLayerDropdownOpen] = useState(false);
  const center: [number, number] = useMemo(() => {
    const lat = (r: Region) => r.center_lat ?? r.latitude ?? 12.9716;
    const lon = (r: Region) => r.center_lon ?? r.longitude ?? 77.5946;
    if (selectedRegion) return [lat(selectedRegion), lon(selectedRegion)];
    if (regions.length > 0) return [lat(regions[0]), lon(regions[0])];
    return [12.9716, 77.5946];
  }, [selectedRegion, regions]);

  // CARTO maps light tiles
  const tileUrl = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Helper to dynamically style layers based on active Spectral Filter
  const getLayerStyle = (region: Region, layer: LayerType) => {
    const latVal = region.center_lat ?? region.latitude ?? 12.9;
    const lonVal = region.center_lon ?? region.longitude ?? 77.5;
    // Standard deterministic noise based on coordinates to represent heat maps offline
    const seed = Math.sin(latVal * 15) * Math.cos(lonVal * 20);
    const seedAbs = Math.abs(seed);

    switch (layer) {
      case 'thermal': {
        // Temperature representation: 25C to 45C
        const temp = 24.5 + seedAbs * 21.0;
        let color = '#fbbf24'; // Yellow
        if (temp > 40.0) color = '#f43f5e'; // Hot critical red
        else if (temp > 32.0) color = '#f97316'; // Hot orange
        else if (temp < 28.0) color = '#3b82f6'; // Cold blue
        return { color, value: `${temp.toFixed(1)} °C`, name: 'Thermal Footprint' };
      }
      case 'vegetation': {
        // NDVI index: -0.1 to 0.8
        const ndvi = -0.1 + seedAbs * 0.95;
        let color = '#fbbf24'; // yellow (sandy)
        if (ndvi > 0.6) color = '#10b981'; // Lush green
        else if (ndvi > 0.3) color = '#34d399'; // Moderate green
        else if (ndvi < 0.1) color = '#f43f5e'; // Drought aridity
        return { color, value: ndvi.toFixed(2), name: 'NDVI Index' };
      }
      case 'atmospheric': {
        // Aerosol Optical Depth: 0.1 to 1.1
        const aod = 0.08 + seedAbs * 0.95;
        let color = '#10b981'; // Clean green
        if (aod > 0.7) color = '#f43f5e'; // Severe haze
        else if (aod > 0.4) color = '#f97316'; // Poor orange
        else if (aod > 0.2) color = '#fbbf24'; // Moderate yellow
        return { color, value: aod.toFixed(2), name: 'Aerosol Density' };
      }
      case 'risk':
      default: {
        return { color: riskColor(region.risk_level), value: region.risk_level || 'Low', name: 'Integrated Risk' };
      }
    }
  };

  return (
    <div className="w-full h-full relative group overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution={attribution}
        />
        {/* Danger / calamity overlay — translucent red-amber wash over map */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
          attribution=""
          zIndex={300}
          opacity={0.6}
        />

        {regions.map((region) => {
          return activeLayers.map((layer, index) => {
            const style = getLayerStyle(region, layer);
            // Decrease radius for subsequent layers so they stack visibly
            const radiusBase = isSelected(selectedRegion, region) ? 20 : 12;
            const radius = Math.max(4, radiusBase - (index * 3));
            
            return (
              <CircleMarker
                key={`${region.region_id}-${layer}`}
                center={[region.center_lat ?? region.latitude ?? 12.9716, region.center_lon ?? region.longitude ?? 77.5946]}
                radius={radius}
                pathOptions={{
                  fillColor: style.color,
                  fillOpacity: isSelected(selectedRegion, region) ? 0.85 : 0.5,
                  color: style.color,
                  weight: isSelected(selectedRegion, region) ? 3 : 1,
                }}
                eventHandlers={{
                  click: () => onRegionSelect(region),
                }}
              >
                {index === 0 && (
                  <Popup>
                    <div className="p-1 font-sans">
                      <h3 className="font-bold text-sm mb-1 text-[var(--text-primary)]">{region.name}</h3>
                      <p className="text-[10px] text-stone-600 dark:text-stone-400 mb-2">Region Code: {region.code || 'N/A'}</p>
                      
                      {activeLayers.map(l => {
                        const lStyle = getLayerStyle(region, l);
                        return (
                          <div key={l} className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[10px] font-bold uppercase text-stone-700 dark:text-stone-300">{lStyle.name}</span>
                            <span className="text-xs font-black" style={{ color: lStyle.color }}>{lStyle.value}</span>
                          </div>
                        );
                      })}
                      
                      <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                        <span className="text-[10px] font-bold uppercase text-stone-700 dark:text-stone-300">Overall Health</span>
                        <span className="text-xs font-black">{Number(region.overall_score || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                  </Popup>
                )}
              </CircleMarker>
            );
          });
        })}

        <MapAutoCenter coords={center} />
      </MapContainer>

      {/* Custom overlay controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 w-48">
        <button 
          onClick={() => setLayerDropdownOpen(!layerDropdownOpen)}
          className="p-2 rounded-lg border shadow-lg w-full text-left transition-all hover:bg-[var(--surface-hover)]" 
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: activeLayers.length > 0 ? layerColors[activeLayers[0]] : 'var(--border-subtle)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Active Layers
            </p>
            <ChevronDown size={12} className={`transition-transform duration-300 ${layerDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="flex items-center flex-wrap gap-1 px-1">
            {activeLayers.length === 0 && <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">None</span>}
            {activeLayers.map(layer => (
              <div key={layer} className="flex items-center gap-1.5 bg-[var(--surface-alt)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layerColors[layer] }} />
                <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
                  {layer.substring(0, 4)}
                </span>
              </div>
            ))}
          </div>
        </button>

        {layerDropdownOpen && onToggleLayer && (
          <div className="p-2 rounded-lg border shadow-lg w-full mt-1 animate-in fade-in slide-in-from-top-2" style={{ background: 'rgba(255,255,255,0.98)', borderColor: 'var(--border-subtle)' }}>
            <LayerControl 
              activeLayers={activeLayers} 
              onToggleLayer={onToggleLayer} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

const isSelected = (selected: Region | null, current: Region) =>
  selected?.region_id === current.region_id;
