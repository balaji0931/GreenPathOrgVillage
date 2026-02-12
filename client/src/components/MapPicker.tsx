import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from 'react-leaflet';
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

interface MapPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ location, setLocation, onLocationSelect, initialLocation }: any) {
  const map = useMap();

  useEffect(() => {
    if (initialLocation?.lat && initialLocation?.lng) {
      const latlng = new L.LatLng(initialLocation.lat, initialLocation.lng);
      setLocation(latlng);

      // Smooth strong zoom
      map.setView(latlng, 19, {
        animate: false,
      });
    }
  }, [initialLocation, map, setLocation]);

  useMapEvents({
    click(e) {
      setLocation(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);

      // Zoom in when clicked
      map.flyTo(e.latlng, 19, {
        animate: true,
        duration: 1,
      });
    },
  });

  return location === null ? null : <Marker position={location} />;
}

export default function MapPicker({ initialLocation, onLocationSelect }: MapPickerProps) {
  const [location, setLocation] = useState<L.LatLng | null>(null);

  return (
    <div className="h-full w-full rounded-md border overflow-hidden relative z-0">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={3}
        scrollWheelZoom={true}
        maxZoom={19}
        className="h-full w-full"
      >
        <LayersControl position="topright">
          <BaseLayer checked name="Satellite">
            <TileLayer
              maxZoom={19}
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>

          <BaseLayer name="Street">
            <TileLayer
              maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>
        </LayersControl>

        <LocationMarker
          location={location}
          setLocation={setLocation}
          onLocationSelect={onLocationSelect}
          initialLocation={initialLocation}
        />
      </MapContainer>
    </div>
  );
}
