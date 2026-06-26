import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap, LayersControl } from 'react-leaflet';

const { BaseLayer } = LayersControl;
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DailyHousehold, VillageCollection, Boundary, Road, LayerType } from './MapVisualization';
import { convexHull } from './MapVisualization';

const WARD_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#14B8A6'];
const VILLAGE_COLOR = '#6366F1';

function coverageFill(pct: number) {
  if (pct >= 90) return '#16a34a';
  if (pct >= 60) return '#ca8a04';
  if (pct >= 30) return '#ea580c';
  return '#dc2626';
}
function segregationFill(avg: number | null) {
  if (avg === null) return '#d1d5db';
  if (avg >= 4) return '#16a34a';
  if (avg >= 3) return '#ca8a04';
  if (avg >= 2) return '#ea580c';
  return '#dc2626';
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [bounds, map]);
  return null;
}

interface Props {
  boundaries: Boundary[];
  roads: Road[];
  households: DailyHousehold[];
  villageCollections: VillageCollection[];
  collectorVehicleMap: Map<number, string>;
  activeLayer: LayerType;
  wardCoverage: Map<string, { total: number; collected: number }>;
  wardSegregation: Map<string, { sum: number; count: number }>;
  vehicleColors: string[];
  selectedVehicle: string;
}

export default function MapVisualizationLayer({
  boundaries, roads, households, villageCollections, collectorVehicleMap,
  activeLayer, wardCoverage, wardSegregation, vehicleColors, selectedVehicle,
}: Props) {
  const villageBoundary = boundaries.find(b => b.type === 'village');
  const wardBoundaries = boundaries.filter(b => b.type === 'ward');

  // ── Focus bounds ────────────────────────────────────────────────────────────
  const focusBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [];
    if (villageBoundary) pts.push(...villageBoundary.coordinates);
    else wardBoundaries.forEach(w => pts.push(...w.coordinates));
    if (pts.length === 0) {
      households.forEach(h => {
        if (h.latitude && h.longitude) pts.push([parseFloat(h.latitude), parseFloat(h.longitude)]);
      });
    }
    if (pts.length === 0) return null;
    return L.latLngBounds(pts.map(p => L.latLng(p[0], p[1])));
  }, [villageBoundary, wardBoundaries, households]);

  // ── GPS households ──────────────────────────────────────────────────────────
  const gpsHouseholds = useMemo(() =>
    households.filter(h => h.latitude && h.longitude).map(h => ({
      ...h, lat: parseFloat(h.latitude!), lng: parseFloat(h.longitude!),
    })), [households]);

  // Build householdId → gps lookup
  const hhGpsById = useMemo(() => {
    const m = new Map<number, { lat: number; lng: number }>();
    gpsHouseholds.forEach(h => m.set(h.id, { lat: h.lat, lng: h.lng }));
    return m;
  }, [gpsHouseholds]);

  // ── Vehicle grouping ─────────────────────────────────────────────────────────
  const vehicleGroups = useMemo(() => {
    const groups = new Map<string, VillageCollection[]>();
    villageCollections.forEach(c => {
      const reg = collectorVehicleMap.get(c.collectorId) || `Collector ${c.collectorId}`;
      const arr = groups.get(reg) || [];
      arr.push(c);
      groups.set(reg, arr);
    });
    return groups;
  }, [villageCollections, collectorVehicleMap]);

  const vehicleList = useMemo(() => Array.from(vehicleGroups.keys()), [vehicleGroups]);

  // ── Inferred routes (sorted by collectionDate) ───────────────────────────────
  const inferredRoutes = useMemo(() => {
    const routes: { reg: string; color: string; points: [number, number][] }[] = [];
    vehicleGroups.forEach((collections, reg) => {
      if (selectedVehicle !== 'all' && reg !== selectedVehicle) return;
      const sorted = [...collections].sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime());
      const points: [number, number][] = [];
      sorted.forEach(c => {
        const gps = hhGpsById.get(c.householdId);
        if (gps) points.push([gps.lat, gps.lng]);
      });
      if (points.length >= 2) {
        const idx = vehicleList.indexOf(reg);
        routes.push({ reg, color: vehicleColors[idx % vehicleColors.length], points });
      }
    });
    return routes;
  }, [vehicleGroups, selectedVehicle, hhGpsById, vehicleList, vehicleColors]);

  // ── Vehicle territory convex hulls ────────────────────────────────────────
  const vehicleHulls = useMemo(() => {
    const hulls: { reg: string; color: string; hull: [number, number][] }[] = [];
    vehicleGroups.forEach((collections, reg) => {
      if (selectedVehicle !== 'all' && reg !== selectedVehicle) return;
      const pts: [number, number][] = collections.map(c => {
        const gps = hhGpsById.get(c.householdId);
        return gps ? [gps.lat, gps.lng] as [number,number] : null;
      }).filter(Boolean) as [number,number][];
      if (pts.length >= 3) {
        const idx = vehicleList.indexOf(reg);
        hulls.push({ reg, color: vehicleColors[idx % vehicleColors.length], hull: convexHull(pts) });
      }
    });
    return hulls;
  }, [vehicleGroups, selectedVehicle, hhGpsById, vehicleList, vehicleColors]);

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      attributionControl={true}
      preferCanvas
      maxZoom={19}
    >
      <FitBounds bounds={focusBounds} />

      <LayersControl position="topright">
        <BaseLayer checked name="Street">
          <TileLayer maxZoom={19} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
        </BaseLayer>
        <BaseLayer name="Satellite">
          <TileLayer maxZoom={19} url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />
        </BaseLayer>
      </LayersControl>

      {/* ── Village boundary (always) ── */}
      {villageBoundary && (
        <Polygon
          positions={villageBoundary.coordinates}
          pathOptions={{ color: VILLAGE_COLOR, weight: 2.5, fillOpacity: 0, dashArray: '6 4' }}
        />
      )}

      {/* ── Ward boundaries ── */}
      {wardBoundaries.map((wb, idx) => {
        let fillColor = 'transparent';
        let fillOpacity = 0;

        if (activeLayer === 'ward-coverage' && wb.wardName) {
          const cov = wardCoverage.get(wb.wardName);
          if (cov) {
            const pct = cov.total > 0 ? (cov.collected / cov.total) * 100 : 0;
            fillColor = coverageFill(pct);
            fillOpacity = 0.55;
          }
        } else if (activeLayer === 'segregation-quality' && wb.wardName) {
          const seg = wardSegregation.get(wb.wardName);
          const avg = seg && seg.count > 0 ? seg.sum / seg.count : null;
          fillColor = segregationFill(avg);
          fillOpacity = 0.55;
        } else {
          fillColor = WARD_COLORS[idx % WARD_COLORS.length];
          fillOpacity = 0.08;
        }

        const cov = wb.wardName ? wardCoverage.get(wb.wardName) : undefined;
        const seg = wb.wardName ? wardSegregation.get(wb.wardName) : undefined;

        return (
          <Polygon key={wb.id} positions={wb.coordinates}
            pathOptions={{ color: WARD_COLORS[idx % WARD_COLORS.length], weight: 1.5, fillColor, fillOpacity }}>
            <Tooltip sticky>
              <div className="text-xs font-bold">{wb.wardName || 'Ward'}</div>
              {activeLayer === 'ward-coverage' && cov && (
                <div className="text-xs">{cov.collected}/{cov.total} ({cov.total > 0 ? Math.round(cov.collected/cov.total*100) : 0}%)</div>
              )}
              {activeLayer === 'segregation-quality' && seg && seg.count > 0 && (
                <div className="text-xs">Avg {(seg.sum/seg.count).toFixed(1)} ★</div>
              )}
            </Tooltip>
          </Polygon>
        );
      })}

      {/* ── Roads ── */}
      {roads.map(r => (
        <Polyline key={r.id} positions={r.coordinates}
          pathOptions={{ color: '#6b7280', weight: 2, opacity: 0.6 }}>
          <Tooltip sticky><span className="text-xs">{r.name}</span></Tooltip>
        </Polyline>
      ))}

      {/* ── Collection status dots ── */}
      {activeLayer === 'collection-status' && gpsHouseholds.map(h => (
        <CircleMarker key={h.id}
          center={[h.lat, h.lng]}
          radius={5}
          pathOptions={{
            color: h.collected ? '#16a34a' : '#9ca3af',
            fillColor: h.collected ? '#22c55e' : '#d1d5db',
            fillOpacity: 0.9, weight: 1.5,
          }}>
          <Tooltip sticky>
            <div className="text-xs font-bold">{h.headName}</div>
            <div className="text-xs">{h.ward}</div>
            <div className="text-xs">{h.collected ? `✅ ${h.collectionTime || ''}` : '⚪ Not collected'}</div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* ── Segregation quality dots ── */}
      {activeLayer === 'segregation-quality' && gpsHouseholds.filter(h => h.collected).map(h => {
        const r = h.segregationRating;
        const fill = r === null ? '#9ca3af' : r >= 4 ? '#22c55e' : r >= 3 ? '#eab308' : r >= 2 ? '#f97316' : '#ef4444';
        return (
          <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={5}
            pathOptions={{ color: fill, fillColor: fill, fillOpacity: 0.85, weight: 1.5 }}>
            <Tooltip sticky>
              <div className="text-xs font-bold">{h.headName}</div>
              <div className="text-xs">{r !== null ? `${r} ★` : 'No rating'}</div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* ── Vehicle territory hulls + dots ── */}
      {activeLayer === 'vehicle-territory' && (
        <>
          {vehicleHulls.map(({ reg, color, hull }) => (
            <Polygon key={reg} positions={hull}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.15, dashArray: '5 3' }}>
              <Tooltip sticky><span className="text-xs font-bold">{reg}</span></Tooltip>
            </Polygon>
          ))}
          {villageCollections.map(c => {
            const gps = hhGpsById.get(c.householdId);
            if (!gps) return null;
            const reg = collectorVehicleMap.get(c.collectorId) || `Collector ${c.collectorId}`;
            if (selectedVehicle !== 'all' && reg !== selectedVehicle) return null;
            const idx = vehicleList.indexOf(reg);
            const color = vehicleColors[idx % vehicleColors.length];
            return (
              <CircleMarker key={c.id} center={[gps.lat, gps.lng]} radius={5}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1.5 }}>
                <Tooltip sticky>
                  <div className="text-xs font-bold">{c.headName}</div>
                  <div className="text-xs">{reg}</div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </>
      )}

      {/* ── Inferred routes ── */}
      {activeLayer === 'inferred-route' && (
        <>
          {inferredRoutes.map(({ reg, color, points }) => (
            <Polyline key={reg} positions={points}
              pathOptions={{ color, weight: 3, opacity: 0.85 }}>
              <Tooltip sticky><span className="text-xs font-bold">{reg}</span></Tooltip>
            </Polyline>
          ))}
          {/* Start/end markers */}
          {inferredRoutes.map(({ reg, color, points }) => [
            <CircleMarker key={`${reg}-start`} center={points[0]} radius={7}
              pathOptions={{ color, fillColor: '#fff', fillOpacity: 1, weight: 3 }}>
              <Tooltip permanent><span className="text-[10px] font-bold">Start</span></Tooltip>
            </CircleMarker>,
            <CircleMarker key={`${reg}-end`} center={points[points.length-1]} radius={7}
              pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}>
              <Tooltip permanent><span className="text-[10px] font-bold">End</span></Tooltip>
            </CircleMarker>,
          ])}
        </>
      )}
    </MapContainer>
  );
}
