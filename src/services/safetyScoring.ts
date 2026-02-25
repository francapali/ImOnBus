/**
 * Safety scoring engine for Bari routes.
 * Uses pre-processed data from questionnaire surveys + incident reports.
 */
import safetyData from '../data/safetyData.json';

// ── Neighborhood definitions with approximate geographic centers ──

interface NeighborhoodDef {
  name: string;
  lat: number;
  lon: number;
  radius: number; // degrees (~0.009 ≈ 1km)
  riskScore: number; // 0-1
}

const NEIGHBORHOODS: NeighborhoodDef[] = [
  { name: 'San Nicola', lat: 41.1290, lon: 16.8730, radius: 0.008, riskScore: 0 },
  { name: 'Murat', lat: 41.1240, lon: 16.8680, radius: 0.009, riskScore: 0 },
  { name: 'Libertà', lat: 41.1260, lon: 16.8640, radius: 0.009, riskScore: 0 },
  { name: 'Madonnella', lat: 41.1210, lon: 16.8800, radius: 0.008, riskScore: 0 },
  { name: 'Picone', lat: 41.1140, lon: 16.8600, radius: 0.008, riskScore: 0 },
  { name: 'Carrassi', lat: 41.1070, lon: 16.8620, radius: 0.009, riskScore: 0 },
  { name: 'San Pasquale', lat: 41.1120, lon: 16.8720, radius: 0.008, riskScore: 0 },
  { name: 'Mungivacca', lat: 41.0940, lon: 16.8760, radius: 0.008, riskScore: 0 },
  { name: 'Poggiofranco', lat: 41.1050, lon: 16.8510, radius: 0.010, riskScore: 0 },
  { name: 'San Paolo', lat: 41.1100, lon: 16.8380, radius: 0.010, riskScore: 0 },
  { name: 'Stanic-Villaggio del Lavoratore', lat: 41.1140, lon: 16.8240, radius: 0.008, riskScore: 0 },
  { name: 'San Girolamo', lat: 41.1300, lon: 16.8350, radius: 0.009, riskScore: 0 },
  { name: 'Fesca', lat: 41.1370, lon: 16.8300, radius: 0.008, riskScore: 0 },
  { name: 'Marconi', lat: 41.1350, lon: 16.8280, radius: 0.007, riskScore: 0 },
  { name: 'Palese', lat: 41.1450, lon: 16.7900, radius: 0.012, riskScore: 0 },
  { name: 'Santo Spirito', lat: 41.1540, lon: 16.7780, radius: 0.010, riskScore: 0 },
  { name: 'San Pio / Torricella', lat: 41.1500, lon: 16.7580, radius: 0.010, riskScore: 0 },
  { name: 'Carbonara', lat: 41.0750, lon: 16.9200, radius: 0.010, riskScore: 0 },
  { name: 'Ceglie', lat: 41.0830, lon: 16.9290, radius: 0.009, riskScore: 0 },
  { name: 'Loseto', lat: 41.0640, lon: 16.9000, radius: 0.010, riskScore: 0 },
  { name: 'Torre a Mare', lat: 41.0580, lon: 16.9270, radius: 0.009, riskScore: 0 },
  { name: 'Japigia', lat: 41.0985, lon: 16.8850, radius: 0.010, riskScore: 0 },
  { name: 'San Giorgio', lat: 41.0600, lon: 16.9150, radius: 0.008, riskScore: 0 },
  { name: "Sant'Anna", lat: 41.0890, lon: 16.8650, radius: 0.008, riskScore: 0 },
];

// Populate riskScore from the processed JSON data
const neighborhoodScores = safetyData.neighborhoodScores as Record<string, { risk_score: number }>;
for (const n of NEIGHBORHOODS) {
  const data = neighborhoodScores[n.name];
  if (data) {
    n.riskScore = data.risk_score;
  }
}

// ── Incident density grid ──

const incidentGrid = safetyData.incidentGrid as Record<string, number>;
const GRID_LAT = safetyData.gridConfig.latStep;
const GRID_LON = safetyData.gridConfig.lonStep;

function getGridKey(lat: number, lon: number): string {
  const glat = (Math.floor(lat / GRID_LAT) * GRID_LAT).toFixed(4);
  const glon = (Math.floor(lon / GRID_LON) * GRID_LON).toFixed(4);
  return `${glat},${glon}`;
}

function getIncidentDensity(lat: number, lon: number): number {
  // Check current cell and 8 neighbors
  let total = 0;
  for (let dlat = -1; dlat <= 1; dlat++) {
    for (let dlon = -1; dlon <= 1; dlon++) {
      const key = getGridKey(lat + dlat * GRID_LAT, lon + dlon * GRID_LON);
      total += incidentGrid[key] || 0;
    }
  }
  // Normalize: max observed in a cell is ~49, neighborhood of 9 cells max ~100
  return Math.min(total / 60, 1.0);
}

// ── Find nearest neighborhood ──

function getNeighborhoodRisk(lat: number, lon: number): { name: string; risk: number } {
  let bestDist = Infinity;
  let bestNeighborhood = NEIGHBORHOODS[0];

  for (const n of NEIGHBORHOODS) {
    const dlat = lat - n.lat;
    const dlon = lon - n.lon;
    const dist = Math.sqrt(dlat * dlat + dlon * dlon);
    if (dist < bestDist) {
      bestDist = dist;
      bestNeighborhood = n;
    }
  }

  return { name: bestNeighborhood.name, risk: bestNeighborhood.riskScore };
}

// ── Known unsafe places in Bari (from survey: luoghiinsicurezza) ──

const UNSAFE_POIS: { name: string; lat: number; lon: number; radius: number; weight: number }[] = [
  { name: 'Stazione Ferroviaria', lat: 41.1175, lon: 16.8697, radius: 0.003, weight: 0.8 },
  { name: 'Piazza Umberto I', lat: 41.1249, lon: 16.8699, radius: 0.002, weight: 0.6 },
  { name: 'Piazza Cesare Battisti', lat: 41.1233, lon: 16.8667, radius: 0.002, weight: 0.5 },
  { name: 'Bari Vecchia', lat: 41.1290, lon: 16.8730, radius: 0.005, weight: 0.7 },
  { name: 'Piazza Garibaldi', lat: 41.1263, lon: 16.8650, radius: 0.002, weight: 0.4 },
];

function getUnsafePOIRisk(lat: number, lon: number): number {
  let maxRisk = 0;
  for (const poi of UNSAFE_POIS) {
    const dlat = lat - poi.lat;
    const dlon = lon - poi.lon;
    const dist = Math.sqrt(dlat * dlat + dlon * dlon);
    if (dist < poi.radius) {
      const proximity = 1 - (dist / poi.radius);
      maxRisk = Math.max(maxRisk, proximity * poi.weight);
    }
  }
  return maxRisk;
}

// ── Composite safety score for a single point ──

export function getPointRisk(lat: number, lon: number): number {
  const neighborhoodRisk = getNeighborhoodRisk(lat, lon).risk;
  const incidentRisk = getIncidentDensity(lat, lon);
  const poiRisk = getUnsafePOIRisk(lat, lon);

  // Weighted combination (0 = safe, 1 = dangerous)
  return Math.min(1, 0.40 * neighborhoodRisk + 0.40 * incidentRisk + 0.20 * poiRisk);
}

// ── Score an entire route polyline ──

export interface RouteSafetyResult {
  safetyScore: number;         // 0-100, 100 = safest
  avgRisk: number;             // 0-1
  maxRisk: number;             // 0-1
  warnings: string[];          // specific warnings
  dangerousSegments: number[]; // indices of high-risk points
}

export function scoreRoute(points: [number, number][]): RouteSafetyResult {
  if (points.length === 0) {
    return { safetyScore: 100, avgRisk: 0, maxRisk: 0, warnings: [], dangerousSegments: [] };
  }

  let totalRisk = 0;
  let maxRisk = 0;
  const dangerousSegments: number[] = [];
  const warningSet = new Set<string>();
  const encounteredPOIs = new Set<string>();

  // Sample every Nth point to avoid excessive computation
  const step = Math.max(1, Math.floor(points.length / 100));

  let sampledCount = 0;
  for (let i = 0; i < points.length; i += step) {
    const [lat, lon] = points[i];
    const risk = getPointRisk(lat, lon);
    totalRisk += risk;
    sampledCount++;

    if (risk > maxRisk) maxRisk = risk;

    if (risk > 0.5) {
      dangerousSegments.push(i);
      const neighborhood = getNeighborhoodRisk(lat, lon);
      warningSet.add(`Zona a rischio: ${neighborhood.name} (rischio ${Math.round(neighborhood.risk * 100)}%)`);
    }

    // Check for specific unsafe POIs
    for (const poi of UNSAFE_POIS) {
      const dlat = lat - poi.lat;
      const dlon = lon - poi.lon;
      const dist = Math.sqrt(dlat * dlat + dlon * dlon);
      if (dist < poi.radius * 1.5) {
        warningSet.add(`Vicino a: ${poi.name}`);
        encounteredPOIs.add(poi.name);
      }
    }
  }

  const avgRisk = totalRisk / sampledCount;

  // ── Composite safety score ──
  // Base score from average risk (0-100, inverted)
  let safetyScore = (1 - avgRisk) * 100;

  // Penalty for each unsafe POI encountered (-5 points each)
  // This is the key fix: more POIs = lower score, period.
  safetyScore -= encounteredPOIs.size * 5;

  // Penalty for high concentration of dangerous segments
  // (% of sampled points that are high-risk, scaled to -15 max)
  const dangerRatio = dangerousSegments.length / Math.max(sampledCount, 1);
  safetyScore -= dangerRatio * 15;

  // Penalty for extreme max risk (-5 if any point > 0.7)
  if (maxRisk > 0.7) {
    safetyScore -= 5;
  }

  // Penalty for route length: longer routes expose children longer.
  // Estimate total distance from point count & typical spacing.
  // Routes > 3km get a slight penalty, > 5km more.
  const estimatedDistKm = estimateRouteLength(points) / 1000;
  if (estimatedDistKm > 5) {
    safetyScore -= 4;
  } else if (estimatedDistKm > 3) {
    safetyScore -= 2;
  }

  safetyScore = Math.round(Math.max(0, Math.min(100, safetyScore)));

  return {
    safetyScore,
    avgRisk,
    maxRisk,
    warnings: Array.from(warningSet),
    dangerousSegments,
  };
}

// ── Estimate route length in meters from geometry ──

function estimateRouteLength(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dlat = (points[i][0] - points[i - 1][0]) * 111000;
    const dlon = (points[i][1] - points[i - 1][1]) * 111000 * Math.cos(points[i][0] * Math.PI / 180);
    total += Math.sqrt(dlat * dlat + dlon * dlon);
  }
  return total;
}

// ── Incident points for heatmap visualization ──

export function getIncidentPoints(): [number, number][] {
  return safetyData.incidentPoints2023 as [number, number][];
}

// ── Get neighborhood data for visualization ──

export function getNeighborhoods(): { name: string; lat: number; lon: number; risk: number }[] {
  return NEIGHBORHOODS.map(n => ({
    name: n.name,
    lat: n.lat,
    lon: n.lon,
    risk: n.riskScore,
  }));
}
