/**
 * Spatial Utilities for GeoEnv-IP
 * Handles geospatial logic using standard SQL/JSONB (Fallback for PostGIS)
 */

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const isPointInRegion = (lat, lon, regionBoundary) => {
    // Basic bounding box check for JSONB boundaries
    if (!regionBoundary || !regionBoundary.bbox) return true;
    const [minLon, minLat, maxLon, maxLat] = regionBoundary.bbox;
    return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
};

module.exports = { calculateDistance, isPointInRegion };
