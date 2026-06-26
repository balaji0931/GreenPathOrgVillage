import { useState, useRef, useCallback, useEffect } from 'react';

export type GpsSignal = 'waiting' | 'strong' | 'fair' | 'poor';
export type RecordingState = 'idle' | 'ready' | 'recording' | 'paused' | 'stopped';

interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

const DRAFT_KEY = 'greenpath_road_draft';
const MIN_DISTANCE_M = 5;
const MAX_ACCURACY_M = 40;        // Reject above this — but weight below
const MAX_SPEED_MS = 8.5;         // ~30 km/h
const DRAFT_SAVE_INTERVAL = 15000;
const BEARING_SPEED_THRESHOLD = 1.4; // ~5 km/h — only check bearing above this speed
const MAX_BEARING_CHANGE = 150;   // degrees — generous for U-turns, catches 180° spikes
const DP_TOLERANCE_M = 5;         // Douglas-Peucker simplification tolerance

// ─── Math Utilities ──────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function bearingDiff(b1: number, b2: number): number {
  let diff = Math.abs(b2 - b1) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function computeTotalDistance(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return Math.round(total);
}

// ─── Kalman Filter (1D, per-axis) ────────────────────────────

class Kalman1D {
  private x: number;
  private p: number;
  private q: number; // process noise — dynamically adjusted
  private r: number;

  constructor(initialValue: number) {
    this.x = initialValue;
    this.p = 1;
    this.q = 0.00001;
    this.r = 1;
  }

  update(measurement: number, accuracy: number, speedMs: number): number {
    // Dynamic process noise: adapt to movement speed
    // Stopped → very stable (low noise), Moving → responsive (higher noise)
    if (speedMs < 1) this.q = 0.000003;
    else if (speedMs < 3) this.q = 0.00001;
    else this.q = 0.00005;

    // Measurement noise from GPS accuracy (higher accuracy = lower noise)
    this.r = Math.max(0.00001, (accuracy / 111000) ** 2);

    // Predict
    this.p += this.q;

    // Update
    const k = this.p / (this.p + this.r);
    this.x += k * (measurement - this.x);
    this.p *= (1 - k);

    return this.x;
  }

  reset(value: number) {
    this.x = value;
    this.p = 1;
  }
}

// ─── Douglas-Peucker Simplification ──────────────────────────

function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  // Use haversine-based cross-track distance for accuracy
  const d13 = haversineDistance(lineStart[0], lineStart[1], point[0], point[1]);
  const b13 = bearing(lineStart[0], lineStart[1], point[0], point[1]) * Math.PI / 180;
  const b12 = bearing(lineStart[0], lineStart[1], lineEnd[0], lineEnd[1]) * Math.PI / 180;
  return Math.abs(Math.asin(Math.sin(d13 / 6371000) * Math.sin(b13 - b12)) * 6371000);
}

function douglasPeucker(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;

  // Iterative (stack-based) to avoid recursion depth issues on long routes
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > tolerance) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push([start, maxIdx]);
      if (end - maxIdx > 1) stack.push([maxIdx, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

// ─── Hook ────────────────────────────────────────────────────

export function useGpsRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [signal, setSignal] = useState<GpsSignal>('waiting');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(999);
  const [distanceM, setDistanceM] = useState(0);
  const distanceRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastAccepted = useRef<GpsPoint | null>(null);
  const lastBearing = useRef<number | null>(null);
  const pointsRef = useRef<[number, number][]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const kalmanLat = useRef<Kalman1D | null>(null);
  const kalmanLng = useRef<Kalman1D | null>(null);

  // Check for draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed?.points?.length > 1) setHasDraft(true);
      }
    } catch { /* ignore */ }
  }, []);

  const updateSignal = useCallback((acc: number) => {
    if (acc < 10) setSignal('strong');
    else if (acc <= 25) setSignal('fair');
    else setSignal('poor');
    setAccuracy(acc);
  }, []);

  const saveDraft = useCallback(() => {
    try {
      if (pointsRef.current.length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          points: pointsRef.current,
          timestamp: Date.now(),
        }));
      }
    } catch { /* quota exceeded */ }
  }, []);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setHasDraft(false);
  }, []);

  const recoverDraft = useCallback((): [number, number][] | null => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed?.points?.length > 1) {
          clearDraft();
          return parsed.points;
        }
      }
    } catch { /* ignore */ }
    return null;
  }, [clearDraft]);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy: acc } = position.coords;
    setCurrentPos({ lat: latitude, lng: longitude });
    updateSignal(acc);

    if (isPausedRef.current) return;

    // Filter 1: Hard accuracy reject
    if (acc > MAX_ACCURACY_M) return;

    // Initialize Kalman filters on first point
    if (!kalmanLat.current) {
      kalmanLat.current = new Kalman1D(latitude);
      kalmanLng.current = new Kalman1D(longitude);
    }

    // Estimate current speed for adaptive Kalman
    const last = lastAccepted.current;
    const now = position.timestamp;
    let estimatedSpeed = 0;
    if (last) {
      const dt = (now - last.timestamp) / 1000;
      if (dt > 0) {
        const rawDist = haversineDistance(last.lat, last.lng, latitude, longitude);
        estimatedSpeed = rawDist / dt;
      }
    }

    // Apply weighted Kalman smoothing — accuracy + speed-adaptive
    const smoothLat = kalmanLat.current.update(latitude, acc, estimatedSpeed);
    const smoothLng = kalmanLng.current!.update(longitude, acc, estimatedSpeed);

    if (last) {
      const dist = haversineDistance(last.lat, last.lng, smoothLat, smoothLng);

      // Filter 2: Min distance
      if (dist < MIN_DISTANCE_M) return;

      // Filter 3: Speed check
      const dt = (now - last.timestamp) / 1000;
      if (dt > 0 && (dist / dt) > MAX_SPEED_MS) return;

      // Filter 4: Bearing sanity — only at moving speed, only if accuracy reasonable
      const speed = dt > 0 ? dist / dt : 0;
      if (speed > BEARING_SPEED_THRESHOLD && acc < 25 && lastBearing.current !== null) {
        const newBearing = bearing(last.lat, last.lng, smoothLat, smoothLng);
        const diff = bearingDiff(lastBearing.current, newBearing);
        if (diff > MAX_BEARING_CHANGE) return; // Spike — skip
        lastBearing.current = newBearing;
      } else if (last) {
        // Update bearing regardless when slow/inaccurate
        lastBearing.current = bearing(last.lat, last.lng, smoothLat, smoothLng);
      }
    }

    const newPoint: [number, number] = [smoothLat, smoothLng];
    // Incremental distance: O(1) instead of O(n)
    const segDist = last ? haversineDistance(last.lat, last.lng, smoothLat, smoothLng) : 0;
    distanceRef.current += segDist;

    pointsRef.current = [...pointsRef.current, newPoint];
    lastAccepted.current = { lat: smoothLat, lng: smoothLng, accuracy: acc, timestamp: now };

    setPoints([...pointsRef.current]);
    setDistanceM(Math.round(distanceRef.current));
  }, [updateSignal]);

  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => setSignal('poor'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handlePosition]);

  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const acquireGps = useCallback(() => {
    setState('ready');
    setSignal('waiting');
    startGpsWatch();
  }, [startGpsWatch]);

  const startRecording = useCallback(() => {
    pointsRef.current = [];
    lastAccepted.current = null;
    lastBearing.current = null;
    kalmanLat.current = null;
    kalmanLng.current = null;
    isPausedRef.current = false;
    distanceRef.current = 0;
    setPoints([]);
    setDistanceM(0);
    startTimeRef.current = Date.now();
    setElapsed(0);
    setState('recording');

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    draftTimerRef.current = setInterval(saveDraft, DRAFT_SAVE_INTERVAL);

    if (watchIdRef.current === null) startGpsWatch();
  }, [startGpsWatch, saveDraft]);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setState('paused');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (draftTimerRef.current) { clearInterval(draftTimerRef.current); draftTimerRef.current = null; }
    saveDraft();
  }, [saveDraft]);

  const resumeRecording = useCallback(() => {
    // Reset tracking state to prevent jump from paused position
    lastAccepted.current = null;
    lastBearing.current = null;
    kalmanLat.current = null;
    kalmanLng.current = null;

    isPausedRef.current = false;
    setState('recording');
    startTimeRef.current = Date.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    draftTimerRef.current = setInterval(saveDraft, DRAFT_SAVE_INTERVAL);
  }, [elapsed, saveDraft]);

  const stopRecording = useCallback((): { points: [number, number][]; distanceMeters: number } => {
    isPausedRef.current = false;
    setState('stopped');
    stopGpsWatch();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (draftTimerRef.current) { clearInterval(draftTimerRef.current); draftTimerRef.current = null; }
    clearDraft();

    // Apply Douglas-Peucker simplification before saving
    const rawPoints = [...pointsRef.current];
    const simplified = rawPoints.length > 2
      ? douglasPeucker(rawPoints, DP_TOLERANCE_M)
      : rawPoints;

    return { points: simplified, distanceMeters: computeTotalDistance(simplified) };
  }, [stopGpsWatch, clearDraft]);

  const reset = useCallback(() => {
    stopGpsWatch();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (draftTimerRef.current) { clearInterval(draftTimerRef.current); draftTimerRef.current = null; }
    pointsRef.current = [];
    lastAccepted.current = null;
    lastBearing.current = null;
    kalmanLat.current = null;
    kalmanLng.current = null;
    isPausedRef.current = false;
    distanceRef.current = 0;
    setPoints([]);
    setDistanceM(0);
    setElapsed(0);
    setCurrentPos(null);
    setSignal('waiting');
    setState('idle');
  }, [stopGpsWatch]);

  useEffect(() => {
    return () => {
      stopGpsWatch();
      if (timerRef.current) clearInterval(timerRef.current);
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    };
  }, [stopGpsWatch]);

  return {
    state, signal, points, currentPos, accuracy, distanceM, elapsed, hasDraft,
    acquireGps, startRecording, pauseRecording, resumeRecording, stopRecording,
    reset, recoverDraft, clearDraft,
  };
}
