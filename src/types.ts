// ── Extended types for real routing ──

export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum ChildTripState {
  IDLE = 'IDLE',
  WALKING_TO_STOP = 'WALKING_TO_STOP',
  ON_BUS = 'ON_BUS',
  ARRIVED_AT_STOP = 'ARRIVED_AT_STOP',
  WALKING_TO_DEST = 'WALKING_TO_DEST',
}

// ── Geocoding ──

export interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  displayName: string;
}

// ── Routing ──

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
  type: 'walk' | 'bus';
  busLine?: string;
}

export interface ComputedRoute {
  id: string;
  type: 'fast' | 'safe' | 'bus';
  geometry: [number, number][];
  totalDistance: number;
  totalDuration: number;
  safetyScore: number;
  steps: RouteStep[];
  warnings: string[];
  departure: GeoLocation;
  arrival: GeoLocation;
  busSegments?: BusSegment[];
  // AI-enhanced analysis (loaded async after initial computation)
  aiAnalysis?: {
    adjustedScore: number;
    recommendation: string;
    risks: string[];
    tips: string[];
    scoreExplanation: string;
    warningExplanations: Record<string, string>;
  };
}

export interface BusSegment {
  line: string;
  from: BusStop;
  to: BusStop;
  geometry: [number, number][];
  duration: number;
}

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: string[];
}

// ── Travel document ──

export interface TravelDocument {
  name: string;
  dataUrl: string;
  uploadedAt: Date;
}

// ── Legacy types (kept for AppContext compatibility) ──

export interface RouteOption {
  id: string;
  estimatedTime: string;
  safetyScore: number;
  departure: string;
  arrival: string;
  time: string;
  computedRoute?: ComputedRoute;
}

export interface Notification {
  id: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  message: string;
  timestamp: Date;
}

export interface Trip {
  id: string;
  route: RouteOption;
  status: ChildTripState;
  hasBus: boolean;
}
