import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

interface RoadMapViewProps {
  center?: [number, number];
  zoom?: number;
  /** Previously saved roads — thin grey lines */
  savedRoads?: { id: number; coordinates: [number, number][]; name: string }[];
  /** Currently recording polyline — bold colored line */
  activePolyline?: [number, number][];
  /** Current GPS position — pulsing dot */
  currentPosition?: { lat: number; lng: number } | null;
  /** Auto-follow current position */
  followPosition?: boolean;
  /** Highlight a specific road (for review/preview) */
  highlightRoadId?: number | null;
  className?: string;
}

function MapFollower({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [bounds, map]);
  return null;
}

const ROAD_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function RoadMapView({
  center,
  zoom = 16,
  savedRoads = [],
  activePolyline = [],
  currentPosition,
  followPosition = false,
  highlightRoadId,
  className = '',
}: RoadMapViewProps) {
  const mapCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (currentPosition) return [currentPosition.lat, currentPosition.lng];
    if (savedRoads.length > 0 && savedRoads[0].coordinates.length > 0) return savedRoads[0].coordinates[0];
    return [20.5937, 78.9629]; // India center fallback
  }, [center, currentPosition, savedRoads]);

  // Compute bounds to fit all saved roads
  const allBounds = useMemo(() => {
    if (savedRoads.length === 0 && activePolyline.length === 0) return null;
    const allPoints: [number, number][] = [
      ...savedRoads.flatMap(r => r.coordinates),
      ...activePolyline,
    ];
    if (allPoints.length < 2) return null;
    return L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
  }, [savedRoads, activePolyline]);

  return (
    <div className={`w-full h-full ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        maxZoom={19}
        className="h-full w-full"
        zoomControl={false}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="Street">
            <TileLayer
              maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>
          <BaseLayer name="Satellite">
            <TileLayer
              maxZoom={19}
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>
        </LayersControl>

        {/* Saved roads */}
        {savedRoads.map((road, idx) => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            pathOptions={{
              color: highlightRoadId === road.id ? ROAD_COLORS[idx % ROAD_COLORS.length] : '#9CA3AF',
              weight: highlightRoadId === road.id ? 5 : 3,
              opacity: highlightRoadId === road.id ? 1 : 0.6,
            }}
          />
        ))}

        {/* Active recording line */}
        {activePolyline.length > 1 && (
          <Polyline
            positions={activePolyline}
            pathOptions={{ color: '#10B981', weight: 5, opacity: 0.9 }}
          />
        )}

        {/* Current GPS position dot */}
        {currentPosition && (
          <>
            {/* Accuracy ring */}
            <CircleMarker
              center={[currentPosition.lat, currentPosition.lng]}
              radius={20}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.1, weight: 1 }}
            />
            {/* Position dot */}
            <CircleMarker
              center={[currentPosition.lat, currentPosition.lng]}
              radius={6}
              pathOptions={{ color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }}
            />
          </>
        )}

        {followPosition && currentPosition && (
          <MapFollower position={currentPosition} />
        )}

        {!followPosition && allBounds && !activePolyline.length && (
          <FitBounds bounds={allBounds} />
        )}
      </MapContainer>
    </div>
  );
}
