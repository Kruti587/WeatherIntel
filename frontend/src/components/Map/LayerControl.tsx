import React from 'react';
import { LayerType } from '../../types/index';
import { layerColors } from '../../utils/index';

interface LayerControlProps {
  activeLayers: LayerType[];
  onToggleLayer: (layer: LayerType) => void;
}

const layers: { key: LayerType; label: string; desc: string }[] = [
  { key: 'atmospheric', label: 'Atmospheric', desc: 'Aerosol & Air Quality' },
  { key: 'thermal', label: 'Thermal', desc: 'Heat Maps & Fires' },
  { key: 'vegetation', label: 'Vegetation', desc: 'NDVI & Canopy Health' },
  { key: 'risk', label: 'Risk', desc: 'Integrated Hazard Model' },
];

export const LayerControl: React.FC<LayerControlProps> = ({ activeLayers, onToggleLayer }) => (
  <div className="space-y-1.5">
    {layers.map((layer) => {
      const isActive = activeLayers.includes(layer.key);
      return (
        <button
          key={layer.key}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLayer(layer.key);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 group border ${
            isActive
              ? 'bg-amber-100/80 border-amber-300 text-amber-700 font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] border-transparent'
          }`}
        >
          <span 
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-125 border"
            style={{ 
              backgroundColor: layerColors[layer.key], 
              borderColor: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.08)' 
            }} 
          />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-bold tracking-tight transition-colors ${isActive ? 'text-amber-800' : 'text-[var(--text-primary)]'}`}>
              {layer.label}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{layer.desc}</p>
          </div>
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--roti-500)' }} />
          )}
        </button>
      );
    })}
  </div>
);
