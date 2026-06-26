import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Marker, Tooltip, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

const WARD_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6',
];
const VILLAGE_BOUNDARY_COLOR = '#6366F1';

// Create a small colored circle icon for draggable vertex markers
function vertexIcon(color: string, size = 14) {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
  });
}

interface Household { id: number; uid: string; headName: string; ward?: string | null; wardId?: number | null; latitude: string | null; longitude: string | null; }
interface Boundary { id: number; type: string; wardId?: number | null; wardName?: string | null; coordinates: [number, number][]; }
interface Road { id: number; name: string; coordinates: [number, number][]; }
interface Ward { id: number; name: string; }

interface BoundaryMapViewProps {
  households?: Household[];
  boundaries?: Boundary[];
  roads?: Road[];
  wards?: Ward[];
  drawingPolygon?: [number, number][];
  drawMode?: 'draw' | 'edit' | null;
  onMapClick?: (latlng: [number, number]) => void;
  onVertexDrag?: (idx: number, newPos: [number, number]) => void;
  editingWardId?: number | null;
  editingVillage?: boolean;
  mismatchedIds?: Set<number>;
  selectedRoadId?: number | null;
  onRoadVertexDrag?: (roadId: number, vertexIdx: number, newPos: [number, number]) => void;
  onRoadSelect?: (roadId: number) => void;
  /** Override points to zoom to (ward-specific zoom) */
  focusPoints?: [number, number][];
  className?: string;
}

// Matches RoadMapView pattern exactly — fitBounds called when bounds object changes
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [bounds, map]);
  return null;
}

function DrawClickHandler({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export default function BoundaryMapView({
  households = [], boundaries = [], roads = [], wards = [],
  drawingPolygon = [], drawMode, onMapClick, onVertexDrag,
  editingWardId, editingVillage, mismatchedIds = new Set(),
  selectedRoadId, onRoadVertexDrag, onRoadSelect, focusPoints, className = '',
}: BoundaryMapViewProps) {
  // Use focusPoints if provided, else collect all meaningful points
  const allPoints = useMemo<[number, number][]>(() => {
    if (focusPoints && focusPoints.length > 0) return focusPoints;
    const pts: [number, number][] = [];
    households.forEach(h => { if (h.latitude && h.longitude) { const lat = parseFloat(h.latitude); const lng = parseFloat(h.longitude); if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng]); } });
    boundaries.forEach(b => pts.push(...b.coordinates));
    roads.forEach(r => pts.push(...r.coordinates));
    return pts;
  }, [focusPoints, households, boundaries, roads]);

  // Compute initial center from first available point (avoids India fallback on mount)
  const mapCenter = useMemo<[number, number]>(() => {
    if (allPoints.length > 0) return allPoints[0];
    return [20.5937, 78.9629];
  }, [allPoints]);

  // Pre-compute L.LatLngBounds so FitBounds triggers correctly (same as RoadMapView)
  const mapBounds = useMemo(() => {
    if (allPoints.length < 2) return null;
    return L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
  }, [allPoints]);

  return (
    <div className={`w-full h-full ${className}`}>
      <MapContainer center={mapCenter} zoom={16} scrollWheelZoom maxZoom={19} className="h-full w-full" zoomControl={false} preferCanvas>
        <LayersControl position="topright">
          <BaseLayer checked name="Street">
            <TileLayer maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>
          <BaseLayer name="Satellite">
            <TileLayer maxZoom={19} attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </BaseLayer>
        </LayersControl>

        {/* Fit to bounds — same pattern as RoadMapView */}
        <FitBounds bounds={mapBounds} />
        {drawMode === 'draw' && onMapClick && <DrawClickHandler onMapClick={onMapClick} />}

        {/* Village boundary */}
        {boundaries.filter(b => b.type === 'village' && !editingVillage).map(b => (
          <Polygon key={`village-${b.id}`} positions={b.coordinates}
            pathOptions={{ color: VILLAGE_BOUNDARY_COLOR, weight: 3, fillOpacity: 0.05, dashArray: '10, 6' }} />
        ))}

        {/* Ward boundaries */}
        {boundaries.filter(b => b.type === 'ward' && (b.wardId !== editingWardId || editingWardId === undefined)).map(b => {
          const wardIdx = b.wardId ?? wards.findIndex(w => w.name === b.wardName);
          const color = wardIdx >= 0 ? WARD_COLORS[wardIdx % WARD_COLORS.length] : '#9CA3AF';
          const ward = wardIdx >= 0 ? wards[wardIdx] : wards.find(w => w.name === b.wardName);
          return (
            <Polygon key={`ward-${b.id}`} positions={b.coordinates}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.12 }}>
              {ward && <Tooltip permanent direction="center" className="ward-label">{ward.name}</Tooltip>}
            </Polygon>
          );
        })}

        {/* #9: Drawing polygon — handle 1 point (marker), 2 points (polyline), 3+ (polygon) */}
        {drawingPolygon.length === 1 && (
          <CircleMarker center={drawingPolygon[0]} radius={8}
            pathOptions={{ color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }} />
        )}
        {drawingPolygon.length === 2 && (
          <>
            <Polyline positions={drawingPolygon} pathOptions={{ color: '#3B82F6', weight: 3, dashArray: '6, 4' }} />
            {drawingPolygon.map((pos, idx) => (
              <CircleMarker key={`v-${idx}`} center={pos} radius={7}
                pathOptions={{ color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }} />
            ))}
          </>
        )}
        {drawingPolygon.length >= 3 && (
          <>
            <Polygon positions={drawingPolygon}
              pathOptions={{ color: '#3B82F6', weight: 3, fillColor: '#3B82F6', fillOpacity: 0.15, dashArray: '6, 4' }} />
            {/* #7/#25: Draggable vertex markers */}
            {drawingPolygon.map((pos, idx) => (
              onVertexDrag ? (
                <Marker key={`dv-${idx}`} position={pos} icon={vertexIcon(idx === 0 ? '#EF4444' : '#3B82F6')}
                  draggable
                  eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onVertexDrag(idx, [ll.lat, ll.lng]); } }} />
              ) : (
                <CircleMarker key={`v-${idx}`} center={pos} radius={7}
                  pathOptions={{ color: '#fff', fillColor: idx === 0 ? '#EF4444' : '#3B82F6', fillOpacity: 1, weight: 2 }} />
              )
            ))}
          </>
        )}

        {/* Roads */}
        {roads.map(road => (
          <Polyline key={`road-${road.id}`} positions={road.coordinates}
            pathOptions={{ color: selectedRoadId === road.id ? '#3B82F6' : '#9CA3AF', weight: selectedRoadId === road.id ? 5 : 3, opacity: selectedRoadId === road.id ? 1 : 0.5 }}
            eventHandlers={{ click: () => onRoadSelect?.(road.id) }} />
        ))}

        {/* #8: Draggable road vertices when selected */}
        {selectedRoadId && roads.filter(r => r.id === selectedRoadId).map(road =>
          road.coordinates.map((pos, idx) => (
            onRoadVertexDrag ? (
              <Marker key={`rv-${road.id}-${idx}`} position={pos} icon={vertexIcon('#3B82F6', 10)}
                draggable
                eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onRoadVertexDrag(road.id, idx, [ll.lat, ll.lng]); } }} />
            ) : (
              <CircleMarker key={`rv-${road.id}-${idx}`} center={pos} radius={5}
                pathOptions={{ color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }} />
            )
          ))
        )}

        {/* #24: Household dots — tooltips only for mismatched to avoid perf issues */}
        {households.map(h => {
          if (!h.latitude || !h.longitude) return null;
          const lat = parseFloat(h.latitude);
          const lng = parseFloat(h.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const isMismatched = mismatchedIds.has(h.id);
          const wardName = h.ward || h.wardId?.toString();
          const wardIdx = wardName ? wards.findIndex(w => w.name === wardName) : -1;
          const wardColor = wardIdx >= 0 ? WARD_COLORS[wardIdx % WARD_COLORS.length] : '#6B7280';
          return (
            <CircleMarker key={`hh-${h.id}`} center={[lat, lng]} radius={isMismatched ? 6 : 4}
              pathOptions={{ color: isMismatched ? '#F59E0B' : '#fff', fillColor: isMismatched ? '#F59E0B' : wardColor, fillOpacity: 0.9, weight: isMismatched ? 2 : 1 }}>
              {isMismatched && (
                <Tooltip><div className="text-xs"><p className="font-bold">{h.headName || h.uid}</p><p className="text-amber-600 font-bold">⚠️ May be in wrong ward</p></div></Tooltip>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
