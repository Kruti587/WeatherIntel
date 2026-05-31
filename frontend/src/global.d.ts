// Zustand type declarations
declare module 'zustand' {
  export function create<T>(initializer: (set: any, get?: any) => T): any;
}

declare module 'zustand/middleware' {
  export function devtools<T extends Function>(fn: T): T;
  export function persist<T extends Function>(fn: T, config: any): T;
}

declare module 'zustand/shallow' {
  export * from 'zustand/shallow';
}

// Leaflet type declarations
declare module 'leaflet' {
  export interface Icon {
    options: any;
  }
  export interface IconDefault extends Icon {
    _getIconUrl: () => void;
  }
  export interface IconStatic {
    new (options?: any): Icon;
    Default: IconDefault;
  }
  export const Icon: IconStatic;
  export const version: string;
}

// React-Leaflet extended types
declare module 'react-leaflet' {
  export const MapContainer: any;
  export const TileLayer: any;
  export const Marker: any;
  export const Popup: any;
  export const CircleMarker: any;
  export const useMap: any;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
