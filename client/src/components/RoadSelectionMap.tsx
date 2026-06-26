import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

// Fix for default marker icon in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Road {
  id: number;
  name: string;
  coordinates: [number, number][];
}

interface RoadSelectionMapProps {
  initialLocation: { lat: number; lng: number };
  roads: Road[];
  selectedRoadId?: number;
  onSelectRoad: (id: number) => void;
}

function MapController({ initialLocation }: { initialLocation: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (initialLocation?.lat && initialLocation?.lng) {
      const latlng = new L.LatLng(initialLocation.lat, initialLocation.lng);
      map.setView(latlng, 17, { animate: false });
    }
  }, [initialLocation, map]);
  return null;
}

export default function RoadSelectionMap({ initialLocation, roads, selectedRoadId, onSelectRoad }: RoadSelectionMapProps) {
  return (
    <div className="h-full w-full rounded-md border overflow-hidden relative z-0">
      <MapContainer
        center={[initialLocation.lat || 0, initialLocation.lng || 0]}
        zoom={17}
        className="h-full w-full"
      >
        <MapController initialLocation={initialLocation} />

        <LayersControl position="topright">
          <BaseLayer checked name="Street Map">
            <TileLayer
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

        <Marker position={[initialLocation.lat, initialLocation.lng]} />

        {roads.map(road => {
          const isSelected = road.id === selectedRoadId;
          return (
            <Polyline
              key={road.id}
              positions={road.coordinates}
              pathOptions={{
                color: isSelected ? '#10B981' : '#3B82F6',
                weight: isSelected ? 8 : 4,
                opacity: 0.8,
              }}
              eventHandlers={{
                click: () => onSelectRoad(road.id)
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
