import { useState, useRef, useCallback, useEffect } from 'react';

interface GPSSimulationState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number; // 0–1
  currentIndex: number;
  currentPosition: [number, number] | null;
  speed: number; // multiplier (1x, 2x, 5x, 10x)
}

interface GPSSimulationActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  deviate: () => void;
}

const TICK_MS = 200; // update every 200ms

// Distance between two lat/lon points in meters (Haversine)
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Interpolate between two points
function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function useGPSSimulation(
  geometry: [number, number][] | undefined,
  onPositionUpdate: (pos: [number, number] | null) => void,
  onArrived?: () => void,
): [GPSSimulationState, GPSSimulationActions] {
  const [state, setState] = useState<GPSSimulationState>({
    isRunning: false,
    isPaused: false,
    progress: 0,
    currentIndex: 0,
    currentPosition: null,
    speed: 1,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;

  // Precompute cumulative distances
  const cumulativeRef = useRef<number[]>([]);
  const totalDistanceRef = useRef(0);

  useEffect(() => {
    if (!geometry || geometry.length < 2) {
      cumulativeRef.current = [];
      totalDistanceRef.current = 0;
      return;
    }
    const cum = [0];
    for (let i = 1; i < geometry.length; i++) {
      cum.push(cum[i - 1] + haversine(geometry[i - 1], geometry[i]));
    }
    cumulativeRef.current = cum;
    totalDistanceRef.current = cum[cum.length - 1];
  }, [geometry]);

  // Get position from a progress fraction 0–1
  const getPositionAtProgress = useCallback((progress: number): [number, number] | null => {
    const geom = geometryRef.current;
    const cum = cumulativeRef.current;
    const totalDist = totalDistanceRef.current;
    if (!geom || geom.length < 2 || totalDist === 0) return null;

    const targetDist = progress * totalDist;

    // Find segment
    for (let i = 1; i < cum.length; i++) {
      if (cum[i] >= targetDist) {
        const segDist = cum[i] - cum[i - 1];
        if (segDist === 0) return geom[i];
        const t = (targetDist - cum[i - 1]) / segDist;
        return lerp(geom[i - 1], geom[i], t);
      }
    }
    return geom[geom.length - 1];
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.isRunning || s.isPaused) return;

    const totalDist = totalDistanceRef.current;
    if (totalDist === 0) return;

    // Walking speed: ~1.25 m/s * speed multiplier
    const walkSpeed = 1.25 * s.speed;
    const distPerTick = walkSpeed * (TICK_MS / 1000);
    const progressPerTick = distPerTick / totalDist;

    const newProgress = Math.min(s.progress + progressPerTick, 1);
    const newPos = getPositionAtProgress(newProgress);

    // Find current index for reference
    const cum = cumulativeRef.current;
    const targetDist = newProgress * totalDist;
    let newIndex = 0;
    for (let i = 1; i < cum.length; i++) {
      if (cum[i] >= targetDist) {
        newIndex = i;
        break;
      }
    }

    setState(prev => ({
      ...prev,
      progress: newProgress,
      currentIndex: newIndex,
      currentPosition: newPos,
    }));

    if (newPos) onPositionUpdate(newPos);

    if (newProgress >= 1) {
      clearTimer();
      setState(prev => ({ ...prev, isRunning: false }));
      onArrived?.();
    }
  }, [getPositionAtProgress, onPositionUpdate, onArrived, clearTimer]);

  // Start/stop interval based on state
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      clearTimer();
      intervalRef.current = setInterval(tick, TICK_MS);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [state.isRunning, state.isPaused, state.speed, tick, clearTimer]);

  const start = useCallback(() => {
    const geom = geometryRef.current;
    if (!geom || geom.length < 2) return;

    const startPos = geom[0];
    setState({
      isRunning: true,
      isPaused: false,
      progress: 0,
      currentIndex: 0,
      currentPosition: startPos,
      speed: stateRef.current.speed || 1,
    });
    onPositionUpdate(startPos);
  }, [onPositionUpdate]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setState({
      isRunning: false,
      isPaused: false,
      progress: 0,
      currentIndex: 0,
      currentPosition: null,
      speed: stateRef.current.speed,
    });
    onPositionUpdate(null);
  }, [clearTimer, onPositionUpdate]);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  // Deviate: offset position randomly ~50m perpendicular to route
  const deviate = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentPosition) return;
    const offsetLat = (Math.random() - 0.5) * 0.001; // ~50m
    const offsetLon = (Math.random() - 0.5) * 0.001;
    const deviatedPos: [number, number] = [
      s.currentPosition[0] + offsetLat,
      s.currentPosition[1] + offsetLon,
    ];
    setState(prev => ({ ...prev, currentPosition: deviatedPos }));
    onPositionUpdate(deviatedPos);
  }, [onPositionUpdate]);

  return [state, { start, pause, resume, stop, setSpeed, deviate }];
}
