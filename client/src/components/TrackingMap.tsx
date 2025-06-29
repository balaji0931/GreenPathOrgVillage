import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TrackingMapProps {
  trackingData?: any[];
  currentLocation?: { lat: number; lng: number } | null;
  isCollectorView?: boolean;
  height?: string;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  trackingData = [],
  currentLocation,
  isCollectorView = false,
  height = "400px"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([12.9716, 77.5946], 13); // Default to Bangalore

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add current location marker if available
    if (currentLocation) {
      const currentMarker = L.marker([currentLocation.lat, currentLocation.lng])
        .addTo(map)
        .bindPopup('Current Location')
        .openPopup();

      // Center map on current location
      map.setView([currentLocation.lat, currentLocation.lng], 15);
    }

    // Add tracking data for manager view
    if (!isCollectorView && trackingData.length > 0) {
      trackingData.forEach((session) => {
        if (session.locationTracking && session.locationTracking.length > 0) {
          const coordinates = session.locationTracking.map((loc: any) => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          ]);

          // Create polyline for the path
          const polyline = L.polyline(coordinates, {
            color: session.color || '#3388ff',
            weight: 4,
            opacity: 0.8
          }).addTo(map);

          // Add start marker
          if (coordinates.length > 0) {
            L.marker(coordinates[0])
              .addTo(map)
              .bindPopup(`${session.collector.name} - ${session.dayLabel} - Start`);
          }

          // Add end marker
          if (coordinates.length > 1) {
            L.marker(coordinates[coordinates.length - 1])
              .addTo(map)
              .bindPopup(`${session.collector.name} - ${session.dayLabel} - End`);
          }

          // Fit map to show all paths
          if (trackingData.length === 1) {
            map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
          }
        }
      });

      // If multiple sessions, fit bounds to show all
      if (trackingData.length > 1) {
        const allCoordinates: L.LatLngExpression[] = [];
        trackingData.forEach((session) => {
          if (session.locationTracking) {
            session.locationTracking.forEach((loc: any) => {
              allCoordinates.push([parseFloat(loc.latitude), parseFloat(loc.longitude)]);
            });
          }
        });

        if (allCoordinates.length > 0) {
          const group = new L.FeatureGroup(allCoordinates.map(coord => L.marker(coord)));
          map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
      }
    }
  }, [trackingData, currentLocation, isCollectorView, isMapReady]);

  return (
    <div className="w-full">
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-lg border border-gray-300"
      />
      
      {!isCollectorView && trackingData.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Path Legend (Last 5 Days)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {trackingData.map((session, index) => (
              <div key={session.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: session.color }}
                />
                <span className="text-sm">{session.dayLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};