/**
 * Client-side geospatial utilities — zero dependencies.
 * All computations run in the browser; server stores raw JSON only.
 */

// ─── Haversine Distance ──────────────────────────────────────

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function polylineDistance(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return Math.round(total);
}

// ─── Point-in-Polygon (Ray Casting) ─────────────────────────

/**
 * Returns true if point is inside polygon.
 * Uses ray casting algorithm — O(n) where n = polygon vertices.
 */
export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Batch point-in-polygon check for multiple points against multiple polygons.
 * Returns map of pointIndex → polygonIndex (first match).
 * Points not in any polygon are omitted from result.
 */
export function batchPointInPolygons(
  points: [number, number][],
  polygons: { id: number; coordinates: [number, number][] }[]
): Map<number, number> {
  const result = new Map<number, number>();

  for (let pi = 0; pi < points.length; pi++) {
    for (const polygon of polygons) {
      if (pointInPolygon(points[pi], polygon.coordinates)) {
        result.set(pi, polygon.id);
        break; // First match — no overlapping ward boundaries
      }
    }
  }

  return result;
}

// ─── Polygon Area (Shoelace Formula) ─────────────────────────

/**
 * Compute polygon area in square meters using the Shoelace formula
 * with latitude correction for accurate results.
 */
export function polygonAreaSqMeters(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0;

  const n = polygon.length;
  let area = 0;

  // Convert to approximate meters using center latitude
  const centerLat = polygon.reduce((sum, p) => sum + p[0], 0) / n;
  const latScale = 111320; // meters per degree latitude
  const lngScale = 111320 * Math.cos(centerLat * Math.PI / 180); // meters per degree longitude

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = polygon[i][1] * lngScale;
    const yi = polygon[i][0] * latScale;
    const xj = polygon[j][1] * lngScale;
    const yj = polygon[j][0] * latScale;
    area += xi * yj - xj * yi;
  }

  return Math.round(Math.abs(area) / 2);
}

// ─── Polygon Overlap Detection ───────────────────────────────

/**
 * Check if two polygons' interiors overlap.
 * Edges touching is allowed; interior overlap is not.
 * Uses simplified approach: check if any vertex of A is inside B, or vice versa,
 * or if any edges intersect.
 */
export function polygonsOverlap(
  polyA: [number, number][],
  polyB: [number, number][]
): boolean {
  // Check if any vertex of A is strictly inside B
  for (const p of polyA) {
    if (pointInPolygon(p, polyB)) return true;
  }
  // Check if any vertex of B is strictly inside A
  for (const p of polyB) {
    if (pointInPolygon(p, polyA)) return true;
  }
  // Check edge intersections (catches crossing without contained vertices)
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Check if two line segments properly intersect (not just touch at endpoints).
 */
function segmentsIntersect(
  a1: [number, number], a2: [number, number],
  b1: [number, number], b2: [number, number]
): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false; // Collinear/touching cases treated as non-overlapping
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// ─── Polygon Centroid ────────────────────────────────────────

export function polygonCentroid(polygon: [number, number][]): [number, number] {
  const n = polygon.length;
  if (n === 0) return [0, 0];
  const lat = polygon.reduce((s, p) => s + p[0], 0) / n;
  const lng = polygon.reduce((s, p) => s + p[1], 0) / n;
  return [lat, lng];
}

// ─── Bounding Box ────────────────────────────────────────────

export function boundingBox(points: [number, number][]): {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
} {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return { minLat, maxLat, minLng, maxLng };
}

// ─── Douglas-Peucker Line Simplification ─────────────────────

function perpendicularDistanceDP(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const d13 = haversineDistance(lineStart[0], lineStart[1], point[0], point[1]);
  const bearing13 = Math.atan2(
    Math.sin((point[1] - lineStart[1]) * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180),
    Math.cos(lineStart[0] * Math.PI / 180) * Math.sin(point[0] * Math.PI / 180) -
    Math.sin(lineStart[0] * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180) *
    Math.cos((point[1] - lineStart[1]) * Math.PI / 180)
  );
  const bearing12 = Math.atan2(
    Math.sin((lineEnd[1] - lineStart[1]) * Math.PI / 180) * Math.cos(lineEnd[0] * Math.PI / 180),
    Math.cos(lineStart[0] * Math.PI / 180) * Math.sin(lineEnd[0] * Math.PI / 180) -
    Math.sin(lineStart[0] * Math.PI / 180) * Math.cos(lineEnd[0] * Math.PI / 180) *
    Math.cos((lineEnd[1] - lineStart[1]) * Math.PI / 180)
  );
  return Math.abs(Math.asin(Math.sin(d13 / 6371000) * Math.sin(bearing13 - bearing12)) * 6371000);
}

/**
 * Douglas-Peucker line simplification — iterative (stack-based).
 * Tolerance in meters.
 */
export function simplifyPolyline(points: [number, number][], toleranceM: number): [number, number][] {
  if (points.length <= 2) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistanceDP(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > toleranceM) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push([start, maxIdx]);
      if (end - maxIdx > 1) stack.push([maxIdx, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

// ─── Auto-Generate Boundary (Buffer + Simplify) ──────────────

/**
 * Generate a boundary polygon from a set of points using buffer+simplify.
 * NOT convex hull — creates organic shapes that follow household spread.
 * 
 * Algorithm:
 * 1. Compute centroid of all points
 * 2. For each point, push it outward from centroid by bufferMeters
 * 3. Sort all buffered points by angle around centroid (polar sort)
 * 4. Simplify with Douglas-Peucker to remove noise
 * 5. Result: organic boundary that wraps around the point cluster
 * 
 * @param points Array of [lat, lng] household locations
 * @param bufferMeters How far to expand beyond outermost points (default 30m)
 * @param simplifyTolerance Douglas-Peucker tolerance in meters (default 5m)
 */
export function generateBoundary(
  points: [number, number][],
  bufferMeters = 30,
  simplifyTolerance = 5
): [number, number][] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    // Single point: create small circle (8 vertices)
    return createCircle(points[0], bufferMeters, 8);
  }
  if (points.length === 2) {
    // Two points: create capsule shape
    return createCapsule(points[0], points[1], bufferMeters);
  }

  // Compute centroid
  const cLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cLng = points.reduce((s, p) => s + p[1], 0) / points.length;

  // Meters-per-degree at this latitude
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(cLat * Math.PI / 180);

  // Push each point outward from centroid by bufferMeters
  const buffered: [number, number][] = points.map(([lat, lng]) => {
    const dx = (lng - cLng) * mPerDegLng;
    const dy = (lat - cLat) * mPerDegLat;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return [lat + bufferMeters / mPerDegLat, lng] as [number, number];
    const scale = (dist + bufferMeters) / dist;
    return [
      cLat + (lat - cLat) * scale,
      cLng + (lng - cLng) * scale,
    ] as [number, number];
  });

  // Sort by angle around centroid (polar sort)
  const sorted = buffered.sort((a, b) => {
    const angleA = Math.atan2(a[0] - cLat, a[1] - cLng);
    const angleB = Math.atan2(b[0] - cLat, b[1] - cLng);
    return angleA - angleB;
  });

  // Remove points that would create concavities (monotone chain for outer boundary)
  const outer = grahamScanOuter(sorted);

  // Simplify to reduce noise
  if (outer.length > 4) {
    return simplifyPolygon(outer, simplifyTolerance);
  }
  return outer;
}

/** Graham scan — compute outer boundary only (not full convex hull, but close) */
function grahamScanOuter(points: [number, number][]): [number, number][] {
  if (points.length <= 3) return points;
  const hull: [number, number][] = [];
  for (const p of points) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  // Close: process in reverse for lower hull
  const lower: [number, number][] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  // Remove first and last of lower (they're same as hull endpoints)
  lower.shift();
  lower.pop();
  return hull.concat(lower);
}

/** Simplify a closed polygon using Douglas-Peucker */
function simplifyPolygon(polygon: [number, number][], toleranceM: number): [number, number][] {
  // Treat as a line from first to last point (which wraps around)
  const simplified = simplifyPolyline([...polygon, polygon[0]], toleranceM);
  // Remove the duplicated closing point
  if (simplified.length > 1 &&
    simplified[0][0] === simplified[simplified.length - 1][0] &&
    simplified[0][1] === simplified[simplified.length - 1][1]) {
    simplified.pop();
  }
  return simplified;
}

/** Create a circle polygon approximation around a point */
function createCircle(center: [number, number], radiusM: number, segments: number): [number, number][] {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(center[0] * Math.PI / 180);
  const pts: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    pts.push([
      center[0] + (radiusM * Math.sin(angle)) / mPerDegLat,
      center[1] + (radiusM * Math.cos(angle)) / mPerDegLng,
    ]);
  }
  return pts;
}

/** Create a capsule/stadium shape around two points */
function createCapsule(p1: [number, number], p2: [number, number], radiusM: number): [number, number][] {
  const mPerDegLat = 111320;
  const midLat = (p1[0] + p2[0]) / 2;
  const mPerDegLng = 111320 * Math.cos(midLat * Math.PI / 180);
  // Direction vector
  const dx = (p2[1] - p1[1]) * mPerDegLng;
  const dy = (p2[0] - p1[0]) * mPerDegLat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return createCircle(p1, radiusM, 8);
  // Perpendicular offset in degrees
  const perpLatDeg = (-dx / len) * radiusM / mPerDegLat;
  const perpLngDeg = (dy / len) * radiusM / mPerDegLng;
  const extLatDeg = (dy / len) * radiusM / mPerDegLat;
  const extLngDeg = (dx / len) * radiusM / mPerDegLng;
  return [
    [p1[0] + perpLatDeg - extLatDeg, p1[1] + perpLngDeg - extLngDeg],
    [p2[0] + perpLatDeg + extLatDeg, p2[1] + perpLngDeg + extLngDeg],
    [p2[0] - perpLatDeg + extLatDeg, p2[1] - perpLngDeg + extLngDeg],
    [p1[0] - perpLatDeg - extLatDeg, p1[1] - perpLngDeg - extLngDeg],
  ];
}

/**
 * Generate all boundaries at once: one per ward + one village boundary.
 * @param households Array of { ward, latitude, longitude }
 * @param wardNames Array of ward name strings
 * @param bufferMeters Buffer distance in meters
 * @returns Map of wardName → polygon, plus 'village' → polygon
 */
export function generateAllBoundaries(
  households: { ward: string | null; latitude: string | null; longitude: string | null }[],
  wardNames: string[],
  bufferMeters = 30
): Map<string, [number, number][]> {
  const result = new Map<string, [number, number][]>();

  // Group households by ward
  const allValidPoints: [number, number][] = [];
  for (const wardName of wardNames) {
    const pts: [number, number][] = [];
    for (const h of households) {
      if (h.ward !== wardName || !h.latitude || !h.longitude) continue;
      const lat = parseFloat(h.latitude);
      const lng = parseFloat(h.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        pts.push([lat, lng]);
        allValidPoints.push([lat, lng]);
      }
    }
    if (pts.length > 0) {
      result.set(wardName, generateBoundary(pts, bufferMeters));
    }
  }

  // Village boundary from ALL household points (slightly larger buffer)
  if (allValidPoints.length > 0) {
    result.set('__village__', generateBoundary(allValidPoints, bufferMeters * 1.5));
  }

  return result;
}

// ─── Format Helpers ──────────────────────────────────────────

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) return `${sqMeters.toLocaleString()} m²`;
  const hectares = sqMeters / 10000;
  if (hectares < 100) return `${hectares.toFixed(1)} ha`;
  return `${(sqMeters / 1000000).toFixed(2)} km²`;
}
