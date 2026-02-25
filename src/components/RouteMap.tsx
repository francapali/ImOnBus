import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ComputedRoute, GeoLocation } from '../types';
import { getIncidentPoints, getNeighborhoods } from '../services/safetyScoring';
import { AMTAB_STOPS } from '../services/busData';

interface RouteMapProps {
  routes?: ComputedRoute[];
  selectedRouteId?: string | null;
  departure?: GeoLocation | null;
  arrival?: GeoLocation | null;
  showHeatmap?: boolean;
  showBusStops?: boolean;
  height?: string;
  childPosition?: [number, number] | null;
  compact?: boolean;
}

// Bari center
const BARI_CENTER: [number, number] = [41.1171, 16.8719];
const DEFAULT_ZOOM = 13;

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ROUTE_COLORS: Record<string, string> = {
  fast: '#3b82f6',
  safe: '#10b981',
  bus: '#f59e0b',
};

const ROUTE_LABELS: Record<string, string> = {
  fast: 'Più Veloce',
  safe: 'Più Sicuro',
  bus: 'Bus AMTAB',
};

function createColoredIcon(color: string, size: number = 12): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createBusStopIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:#3b82f6;border:2px solid white;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🚌</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createChildIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:#6366f1;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.3);">👦</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export const RouteMap: React.FC<RouteMapProps> = ({
  routes = [],
  selectedRouteId,
  departure,
  arrival,
  showHeatmap = false,
  showBusStops = false,
  height = '400px',
  childPosition,
  compact = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayersRef = useRef<L.LayerGroup>(L.layerGroup());
  const markersLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const heatmapLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const busStopsLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: BARI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: !compact,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    routeLayersRef.current.addTo(map);
    markersLayerRef.current.addTo(map);
    heatmapLayerRef.current.addTo(map);
    busStopsLayerRef.current.addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  // Draw routes
  useEffect(() => {
    if (!mapRef.current) return;

    routeLayersRef.current.clearLayers();

    if (routes.length === 0) return;

    const bounds = L.latLngBounds([]);

    for (const route of routes) {
      const isSelected = selectedRouteId ? route.id === selectedRouteId : true;
      const color = ROUTE_COLORS[route.type] || '#6b7280';
      const opacity = isSelected ? 0.9 : 0.3;
      const weight = isSelected ? 5 : 3;

      // Main route line
      const polyline = L.polyline(
        route.geometry.map(([lat, lon]) => [lat, lon] as L.LatLngExpression),
        {
          color,
          weight,
          opacity,
          dashArray: route.type === 'bus' ? '10 6' : undefined,
        }
      );

      // Tooltip with route info
      polyline.bindTooltip(
        `${ROUTE_LABELS[route.type] || route.type} — ${Math.round(route.totalDuration / 60)} min — Sicurezza: ${route.safetyScore}/100`,
        { sticky: true, className: 'route-tooltip' }
      );

      routeLayersRef.current.addLayer(polyline);

      // Add to bounds
      route.geometry.forEach(([lat, lon]) => bounds.extend([lat, lon]));

      // Highlight dangerous segments in red for selected route
      if (isSelected && route.warnings.length > 0) {
        // Draw a faint red overlay on the route to indicate danger areas
        const dangerLine = L.polyline(
          route.geometry.map(([lat, lon]) => [lat, lon] as L.LatLngExpression),
          { color: '#ef4444', weight: weight + 4, opacity: 0.15 }
        );
        routeLayersRef.current.addLayer(dangerLine);
      }
    }

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRouteId]);

  // Draw markers (departure, arrival, child)
  useEffect(() => {
    if (!mapRef.current) return;
    markersLayerRef.current.clearLayers();

    if (departure) {
      const marker = L.marker([departure.lat, departure.lon], {
        icon: createColoredIcon('#10b981', 16),
      }).bindPopup(`<b>Partenza</b><br/>${departure.displayName}`);
      markersLayerRef.current.addLayer(marker);
    }

    if (arrival) {
      const marker = L.marker([arrival.lat, arrival.lon], {
        icon: createColoredIcon('#ef4444', 16),
      }).bindPopup(`<b>Arrivo</b><br/>${arrival.displayName}`);
      markersLayerRef.current.addLayer(marker);
    }

    if (childPosition) {
      const marker = L.marker(childPosition, {
        icon: createChildIcon(),
      }).bindPopup('Posizione ragazzo');
      markersLayerRef.current.addLayer(marker);
    }

    // Fit to markers if no routes
    if (routes.length === 0 && (departure || arrival)) {
      const bounds = L.latLngBounds([]);
      if (departure) bounds.extend([departure.lat, departure.lon]);
      if (arrival) bounds.extend([arrival.lat, arrival.lon]);
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
      }
    }
  }, [departure, arrival, childPosition, routes.length]);

  // Draw incident heatmap (as circle markers)
  useEffect(() => {
    if (!mapRef.current) return;
    heatmapLayerRef.current.clearLayers();

    if (!showHeatmap) return;

    const incidentPoints = getIncidentPoints();
    for (const [lat, lon] of incidentPoints) {
      const circle = L.circleMarker([lat, lon], {
        radius: 4,
        color: 'transparent',
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        weight: 0,
      });
      heatmapLayerRef.current.addLayer(circle);
    }

    // Neighborhood risk circles
    const neighborhoods = getNeighborhoods();
    for (const n of neighborhoods) {
      if (n.risk > 0.35) {
        const circle = L.circle([n.lat, n.lon], {
          radius: 800,
          color: n.risk > 0.5 ? '#ef4444' : '#f59e0b',
          fillColor: n.risk > 0.5 ? '#ef4444' : '#f59e0b',
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.3,
        });
        circle.bindTooltip(
          `${n.name}: rischio ${Math.round(n.risk * 100)}%`,
          { sticky: false }
        );
        heatmapLayerRef.current.addLayer(circle);
      }
    }
  }, [showHeatmap]);

  // Draw bus stops
  useEffect(() => {
    if (!mapRef.current) return;
    busStopsLayerRef.current.clearLayers();

    if (!showBusStops) return;

    for (const stop of AMTAB_STOPS) {
      const marker = L.marker([stop.lat, stop.lon], {
        icon: createBusStopIcon(),
      }).bindPopup(
        `<b>${stop.name}</b><br/>Linee: ${stop.lines.join(', ')}`
      );
      busStopsLayerRef.current.addLayer(marker);
    }
  }, [showBusStops]);

  // Invalidate size when container changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [height]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* Map legend */}
      {routes.length > 0 && !compact && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs shadow-md">
          {Object.entries(ROUTE_COLORS).map(([type, color]) => {
            const hasRoute = routes.some(r => r.type === type);
            if (!hasRoute) return null;
            return (
              <div key={type} className="flex items-center gap-2 py-0.5">
                <div
                  className="w-4 h-1 rounded-full"
                  style={{
                    background: color,
                    borderStyle: type === 'bus' ? 'dashed' : 'solid',
                  }}
                />
                <span className="text-slate-700 font-medium">{ROUTE_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
