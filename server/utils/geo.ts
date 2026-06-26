/**
 * Server-side geo utilities for validation.
 * Mirrors critical client-side functions needed for trust boundary enforcement.
 */

export function polygonAreaSqMeters(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0;
  const n = polygon.length;
  let area = 0;
  const centerLat = polygon.reduce((sum, p) => sum + p[0], 0) / n;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos(centerLat * Math.PI / 180);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i][1] * lngScale * polygon[j][0] * latScale
          - polygon[j][1] * lngScale * polygon[i][0] * latScale;
  }
  return Math.round(Math.abs(area) / 2);
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function segmentsProperlyIntersect(
  a1: [number, number], a2: [number, number],
  b1: [number, number], b2: [number, number]
): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function polygonSelfIntersects(polygon: [number, number][]): boolean {
  const n = polygon.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // Skip adjacent closing edge
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % n];
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonsOverlap(polyA: [number, number][], polyB: [number, number][]): boolean {
  for (const p of polyA) { if (pointInPolygon(p, polyB)) return true; }
  for (const p of polyB) { if (pointInPolygon(p, polyA)) return true; }
  for (let i = 0; i < polyA.length; i++) {
    for (let j = 0; j < polyB.length; j++) {
      if (segmentsProperlyIntersect(
        polyA[i], polyA[(i + 1) % polyA.length],
        polyB[j], polyB[(j + 1) % polyB.length]
      )) return true;
    }
  }
  return false;
}

export function validateCoordinates(coords: any): coords is [number, number][] {
  if (!Array.isArray(coords)) return false;
  return coords.every(
    (c: any) =>
      Array.isArray(c) &&
      c.length === 2 &&
      typeof c[0] === 'number' && typeof c[1] === 'number' &&
      Number.isFinite(c[0]) && Number.isFinite(c[1]) &&
      c[0] >= -90 && c[0] <= 90 &&
      c[1] >= -180 && c[1] <= 180
  );
}
