/**
 * Routing service using OSRM (Open Source Routing Machine).
 * Computes walking routes and scores them by safety.
 */
import { ComputedRoute, GeoLocation, RouteStep, BusSegment } from '../types';
import { scoreRoute } from './safetyScoring';
import { findNearbyStops, findCommonLines, estimateBusDuration, AMTAB_LINES } from './busData';

const OSRM_BASE = 'https://router.project-osrm.org';

// Walking speed: ~4.5 km/h average for a child
const WALK_SPEED_MS = 4.5 / 3.6; // meters per second (~1.25 m/s)

// ── Decode OSRM polyline (precision 5 or 6) ──

function decodePolyline(encoded: string, precision: number = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const points: [number, number][] = [];
  let lat = 0, lon = 0, i = 0;

  while (i < encoded.length) {
    let result = 0, shift = 0, byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0; shift = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push([lat / factor, lon / factor]);
  }

  return points;
}

// ── Convert GeoJSON coordinates [lon, lat] to [lat, lon] ──

function geoJsonToLatLon(coords: number[][]): [number, number][] {
  return coords.map(([lon, lat]) => [lat, lon]);
}

// ── Fetch walking routes from OSRM ──

interface OSRMRoute {
  geometry: { coordinates: number[][] };
  distance: number;
  duration: number;
  legs: {
    steps: {
      name: string;
      distance: number;
      duration: number;
      maneuver: { type: string; modifier?: string; instruction?: string };
    }[];
  }[];
}

async function fetchWalkingRoutes(
  from: GeoLocation,
  to: GeoLocation
): Promise<OSRMRoute[]> {
  // NOTE: OSRM demo server only supports 'driving' profile.
  // We request driving geometry but recalculate durations for walking speed.
  const url = `${OSRM_BASE}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&alternatives=true&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM error: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No routes found');
  }

  return data.routes;
}

// ── Map OSRM maneuver types to Italian instructions ──

function translateInstruction(step: OSRMRoute['legs'][0]['steps'][0]): string {
  const name = step.name || 'strada senza nome';
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;

  switch (type) {
    case 'depart': return `Parti da ${name}`;
    case 'arrive': return `Arrivo su ${name}`;
    case 'turn':
      if (modifier === 'left') return `Gira a sinistra su ${name}`;
      if (modifier === 'right') return `Gira a destra su ${name}`;
      if (modifier === 'slight left') return `Leggera sinistra su ${name}`;
      if (modifier === 'slight right') return `Leggera destra su ${name}`;
      return `Prosegui su ${name}`;
    case 'new name': return `Continua su ${name}`;
    case 'continue': return `Continua dritto su ${name}`;
    case 'end of road':
      if (modifier === 'left') return `Fine strada, gira a sinistra su ${name}`;
      if (modifier === 'right') return `Fine strada, gira a destra su ${name}`;
      return `Fine strada su ${name}`;
    default: return `Prosegui su ${name}`;
  }
}

// ── Build ComputedRoute from OSRM response ──

function buildRoute(
  osrmRoute: OSRMRoute,
  from: GeoLocation,
  to: GeoLocation,
  type: 'fast' | 'safe',
  id: string
): ComputedRoute {
  const geometry = geoJsonToLatLon(osrmRoute.geometry.coordinates);

  // Recalculate durations for walking speed (OSRM demo returns driving times)
  const totalWalkDuration = Math.round(osrmRoute.distance / WALK_SPEED_MS);

  // Extract steps
  const steps: RouteStep[] = [];
  for (const leg of osrmRoute.legs) {
    for (const step of leg.steps) {
      if (step.distance < 5) continue; // skip tiny steps
      steps.push({
        instruction: translateInstruction(step),
        distance: step.distance,
        duration: Math.round(step.distance / WALK_SPEED_MS), // recalculate for walking
        name: step.name || '',
        type: 'walk',
      });
    }
  }

  // Score safety
  const safetyResult = scoreRoute(geometry);

  return {
    id,
    type,
    geometry,
    totalDistance: osrmRoute.distance,
    totalDuration: totalWalkDuration,
    safetyScore: safetyResult.safetyScore,
    steps,
    warnings: safetyResult.warnings,
    departure: from,
    arrival: to,
  };
}

// ── Build a multimodal (walk + bus + walk) route ──

async function buildBusRoute(
  from: GeoLocation,
  to: GeoLocation
): Promise<ComputedRoute | null> {
  try {
    // Find bus stops near origin and destination
    const stopsNearFrom = findNearbyStops(from.lat, from.lon, 1.0);
    const stopsNearTo = findNearbyStops(to.lat, to.lon, 1.0);

    if (stopsNearFrom.length === 0 || stopsNearTo.length === 0) return null;

    // Find common bus lines
    const connections = findCommonLines(stopsNearFrom, stopsNearTo);
    if (connections.length === 0) return null;

    // Pick the best connection (closest stops)
    const best = connections[0];

    // Get walking route to bus stop
    const walkToStop = await fetchWalkingRoutes(from, {
      lat: best.fromStop.lat,
      lon: best.fromStop.lon,
      name: best.fromStop.name,
      displayName: best.fromStop.name,
    });

    // Get walking route from bus stop to destination
    const walkFromStop = await fetchWalkingRoutes(
      {
        lat: best.toStop.lat,
        lon: best.toStop.lon,
        name: best.toStop.name,
        displayName: best.toStop.name,
      },
      to
    );

    if (!walkToStop.length || !walkFromStop.length) return null;

    const walkToStopRoute = walkToStop[0];
    const walkFromStopRoute = walkFromStop[0];

    // Construct bus segment geometry (straight line between stops for demo)
    const busGeometry: [number, number][] = [
      [best.fromStop.lat, best.fromStop.lon],
      [best.toStop.lat, best.toStop.lon],
    ];

    const busDuration = estimateBusDuration(best.fromStop, best.toStop);

    // Combine geometries
    const fullGeometry: [number, number][] = [
      ...geoJsonToLatLon(walkToStopRoute.geometry.coordinates),
      ...busGeometry,
      ...geoJsonToLatLon(walkFromStopRoute.geometry.coordinates),
    ];

    // Recalculate walking durations for realistic times
    const walkToStopDuration = Math.round(walkToStopRoute.distance / WALK_SPEED_MS);
    const walkFromStopDuration = Math.round(walkFromStopRoute.distance / WALK_SPEED_MS);
    const totalDuration = walkToStopDuration + busDuration + walkFromStopDuration;
    const totalDistance = walkToStopRoute.distance + walkFromStopRoute.distance +
      Math.sqrt((best.fromStop.lat - best.toStop.lat) ** 2 + (best.fromStop.lon - best.toStop.lon) ** 2) * 111000;

    // Score safety for entire route
    const safetyResult = scoreRoute(fullGeometry);

    const lineInfo = AMTAB_LINES[best.line];

    // Build steps
    const steps: RouteStep[] = [
      {
        instruction: `Cammina verso fermata ${best.fromStop.name}`,
        distance: walkToStopRoute.distance,
        duration: walkToStopDuration,
        name: best.fromStop.name,
        type: 'walk',
      },
      {
        instruction: `Prendi ${lineInfo?.name || `Linea ${best.line}`} AMTAB verso ${best.toStop.name}`,
        distance: totalDistance - walkToStopRoute.distance - walkFromStopRoute.distance,
        duration: busDuration,
        name: lineInfo?.description || `Bus ${best.line}`,
        type: 'bus',
        busLine: best.line,
      },
      {
        instruction: `Scendi a ${best.toStop.name} e cammina verso destinazione`,
        distance: walkFromStopRoute.distance,
        duration: walkFromStopDuration,
        name: to.name,
        type: 'walk',
      },
    ];

    const busSegments: BusSegment[] = [{
      line: best.line,
      from: best.fromStop,
      to: best.toStop,
      geometry: busGeometry,
      duration: busDuration,
    }];

    return {
      id: `bus-${best.line}-${Date.now()}`,
      type: 'bus',
      geometry: fullGeometry,
      totalDistance,
      totalDuration,
      safetyScore: safetyResult.safetyScore,
      steps,
      warnings: safetyResult.warnings,
      departure: from,
      arrival: to,
      busSegments,
    };
  } catch (err) {
    console.error('Bus route error:', err);
    return null;
  }
}

// ── Main routing function ──

export async function computeRoutes(
  from: GeoLocation,
  to: GeoLocation
): Promise<ComputedRoute[]> {
  // Fetch walking alternatives from OSRM
  const osrmRoutes = await fetchWalkingRoutes(from, to);

  // Build and score each route (initially all typed 'fast')
  const routes: ComputedRoute[] = osrmRoutes.map((r, i) =>
    buildRoute(r, from, to, 'fast', `walk-${i}-${Date.now()}`)
  );

  // Assign types based on actual scores:
  // - The one with the HIGHEST safety score → 'safe'
  // - The one with the LOWEST duration → 'fast'
  if (routes.length >= 2) {
    // Find safest (highest safetyScore)
    const safestIdx = routes.reduce((best, r, i) =>
      r.safetyScore > routes[best].safetyScore ? i : best, 0
    );
    // Find fastest (lowest duration)
    const fastestIdx = routes.reduce((best, r, i) =>
      r.totalDuration < routes[best].totalDuration ? i : best, 0
    );

    // If they're the same route, keep fastest as 'fast' and second-best safety as 'safe'
    if (safestIdx === fastestIdx) {
      routes[fastestIdx].type = 'fast';
      // Find second-safest
      const secondSafest = routes.reduce((best, r, i) =>
        i !== safestIdx && r.safetyScore > routes[best].safetyScore ? i : best,
        safestIdx === 0 ? 1 : 0
      );
      if (secondSafest !== safestIdx) {
        routes[secondSafest].type = 'safe';
      }
    } else {
      routes[safestIdx].type = 'safe';
      routes[fastestIdx].type = 'fast';
    }
  }

  // Try to find a bus route
  const busRoute = await buildBusRoute(from, to);
  if (busRoute) {
    routes.push(busRoute);
  }

  return routes;
}

// ── Format duration for display ──

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}min`;
}

// ── Format distance for display ──

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
