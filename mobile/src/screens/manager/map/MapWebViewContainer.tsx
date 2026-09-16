/**
 * GreenPath Village Manager Mobile — Map Screen: Leaflet WebView Bridge
 *
 * 100% Client-Side Leaflet Map:
 * - Street (OpenStreetMap) & Satellite (Esri World Imagery) base tiles
 * - Village boundary (Indigo polygon)
 * - Ward boundaries with dynamic fills (% coverage or segregation quality)
 * - Road network overlay (polylines) with toggle
 * - Household circle markers (Green collected, Grey pending) with interactive popup
 * - Auto-fit bounds to village / households
 * - Client-side snapshot export via canvas
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, BorderRadius, Shadows } from '../../../constants/theme';
import type {
  VillageBoundary,
  VillageRoad,
  ManagerCollectionHousehold,
  MapLayerType,
} from '../../../types/manager';

interface MapWebViewContainerProps {
  boundaries: VillageBoundary[];
  roads: VillageRoad[];
  households: ManagerCollectionHousehold[];
  activeLayer: MapLayerType;
  showRoads: boolean;
  wardCoverage: Map<string, { total: number; collected: number }>;
  wardSegregation: Map<string, { sum: number; count: number }>;
  onSnapshotReady?: (dataUrl: string) => void;
  onMarkerSelect?: (household: ManagerCollectionHousehold) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
}

export function MapWebViewContainer({
  boundaries,
  roads,
  households,
  activeLayer,
  showRoads,
  wardCoverage,
  wardSegregation,
  onSnapshotReady,
  onMarkerSelect,
  onInteractionChange,
}: MapWebViewContainerProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [baseTile, setBaseTile] = useState<'street' | 'satellite'>('satellite');

  // Convert Map data to plain serializable objects
  const wardCoverageObj = useMemo(() => {
    const obj: Record<string, { total: number; collected: number }> = {};
    wardCoverage.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }, [wardCoverage]);

  const wardSegregationObj = useMemo(() => {
    const obj: Record<string, { sum: number; count: number }> = {};
    wardSegregation.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }, [wardSegregation]);

  // Push updated data to Leaflet when props change
  useEffect(() => {
    if (!isReady || !webViewRef.current) return;

    const payload = JSON.stringify({
      type: 'UPDATE_MAP_DATA',
      boundaries,
      roads: showRoads ? roads : [],
      households,
      activeLayer,
      showRoads,
      wardCoverage: wardCoverageObj,
      wardSegregation: wardSegregationObj,
      baseTile,
    });

    webViewRef.current.injectJavaScript(`
      if (window.updateMapData) {
        window.updateMapData(${payload});
      }
      true;
    `);
  }, [
    isReady,
    boundaries,
    roads,
    households,
    activeLayer,
    showRoads,
    wardCoverageObj,
    wardSegregationObj,
    baseTile,
  ]);

  // Handle messages sent from Leaflet inside WebView
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setIsReady(true);
      } else if (data.type === 'HOUSEHOLD_CLICKED' && data.householdId) {
        const found = households.find((h) => h.id === data.householdId);
        if (found && onMarkerSelect) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMarkerSelect(found);
        }
      } else if (data.type === 'SNAPSHOT_READY' && data.dataUrl) {
        if (onSnapshotReady) {
          onSnapshotReady(data.dataUrl);
        }
      } else if (data.type === 'MAP_TOUCH_START') {
        onInteractionChange?.(true);
      } else if (data.type === 'MAP_TOUCH_END') {
        onInteractionChange?.(false);
      }
    } catch {
      // Ignore unparseable messages
    }
  };

  const handleTileSwitch = (tile: 'street' | 'satellite') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBaseTile(tile);
  };

  const htmlContent = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      overflow: hidden;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .leaflet-control-attribution {
      display: none !important;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
    }
    .popup-title {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .popup-meta {
      font-size: 11px;
      color: #64748b;
      line-height: 15px;
    }
    .popup-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-collected {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-pending {
      background: #f1f5f9;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 4
    }).setView([12.9716, 77.5946], 13);

    var streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    var satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    satelliteTiles.addTo(map);
    var currentTileLayer = satelliteTiles;

    var boundariesLayer = L.featureGroup().addTo(map);
    var roadsLayer = L.featureGroup().addTo(map);
    var householdsLayer = L.featureGroup().addTo(map);
    var hasFittedBounds = false;

    function getCoverageFill(pct) {
      if (pct >= 90) return '#16a34a';
      if (pct >= 60) return '#ca8a04';
      if (pct >= 30) return '#ea580c';
      return '#dc2626';
    }

    function getSegregationFill(avg) {
      if (avg === null || avg === undefined || isNaN(avg) || avg <= 0) return '#cbd5e1';
      if (avg >= 4) return '#16a34a';
      if (avg >= 3) return '#ca8a04';
      if (avg >= 2) return '#ea580c';
      return '#dc2626';
    }

    window.updateMapData = function(data) {
      if (!data) return;

      // Base tile switch
      if (data.baseTile === 'street' && currentTileLayer !== streetTiles) {
        map.removeLayer(satelliteTiles);
        streetTiles.addTo(map);
        currentTileLayer = streetTiles;
      } else if (data.baseTile === 'satellite' && currentTileLayer !== satelliteTiles) {
        map.removeLayer(streetTiles);
        satelliteTiles.addTo(map);
        currentTileLayer = satelliteTiles;
      }

      // Clear layers
      boundariesLayer.clearLayers();
      roadsLayer.clearLayers();
      householdsLayer.clearLayers();

      var allCoords = [];

      // 1. Boundaries (village & ward polygons)
      if (data.boundaries && data.boundaries.length > 0) {
        data.boundaries.forEach(function(b) {
          if (!b.coordinates || b.coordinates.length < 3) return;

          var wardName = b.wardName || '';
          var fillColor = 'transparent';
          var fillOpacity = 0.05;
          var strokeColor = b.type === 'village' ? '#6366F1' : '#3B82F6';
          var weight = b.type === 'village' ? 3 : 2;

          if (data.activeLayer === 'ward-coverage' && wardName) {
            var cov = (data.wardCoverage && data.wardCoverage[wardName]) || { total: 0, collected: 0 };
            var pct = cov.total > 0 ? Math.round((cov.collected / cov.total) * 100) : 0;
            fillColor = getCoverageFill(pct);
            fillOpacity = 0.35;
          } else if (data.activeLayer === 'segregation-quality' && wardName) {
            var seg = (data.wardSegregation && data.wardSegregation[wardName]) || { sum: 0, count: 0 };
            var avg = seg.count > 0 ? (seg.sum / seg.count) : null;
            fillColor = getSegregationFill(avg);
            fillOpacity = 0.35;
          }

          var poly = L.polygon(b.coordinates, {
            color: strokeColor,
            weight: weight,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            dashArray: b.type === 'village' ? null : '4, 4'
          });

          if (wardName) {
            poly.bindTooltip(wardName, { permanent: false, direction: 'center' });
          }

          poly.addTo(boundariesLayer);
          b.coordinates.forEach(function(c) { allCoords.push(c); });
        });
      }

      // 2. Roads overlay
      if (data.showRoads && data.roads && data.roads.length > 0) {
        data.roads.forEach(function(r) {
          if (!r.coordinates || r.coordinates.length < 2) return;
          var line = L.polyline(r.coordinates, {
            color: '#334155',
            weight: 3.5,
            opacity: 0.85
          });
          if (r.name) {
            line.bindTooltip(r.name, { sticky: true });
          }
          line.addTo(roadsLayer);
          r.coordinates.forEach(function(c) { allCoords.push(c); });
        });
      }

      // 3. Household GPS markers
      if (data.households && data.households.length > 0) {
        data.households.forEach(function(h) {
          if (!h.latitude || !h.longitude) return;
          var lat = parseFloat(h.latitude);
          var lng = parseFloat(h.longitude);
          if (isNaN(lat) || isNaN(lng)) return;

          allCoords.push([lat, lng]);

          var markerColor = h.collected ? '#22c55e' : '#94a3b8';
          var markerBorder = h.collected ? '#15803d' : '#64748b';

          var marker = L.circleMarker([lat, lng], {
            radius: 5,
            fillColor: markerColor,
            color: markerBorder,
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.9
          });

          var popupContent = [
            '<div class="popup-title">' + (h.headName || 'Household') + '</div>',
            '<div class="popup-meta">House #' + (h.houseNumber || '—') + ' • ' + (h.ward || 'Ward') + '</div>',
            '<div class="popup-badge ' + (h.collected ? 'badge-collected' : 'badge-pending') + '">',
            (h.collected ? 'Collected' : 'Pending'),
            '</div>'
          ];

          if (h.collected && h.segregationRating) {
            popupContent.push('<div class="popup-meta" style="margin-top:4px; font-weight:bold; color:#ca8a04;">★ Rating: ' + h.segregationRating + ' / 5</div>');
          }

          marker.bindPopup(popupContent.join(''));

          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'HOUSEHOLD_CLICKED',
                householdId: h.id
              }));
            }
          });

          marker.addTo(householdsLayer);
        });
      }

      // Auto fit bounds on initial population
      if (!hasFittedBounds && allCoords.length > 0) {
        try {
          var bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
          hasFittedBounds = true;
        } catch(e) {}
      }
    };

    // Touch interaction tracking for parent ScrollView cooperation
    document.addEventListener('touchstart', function() {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TOUCH_START' }));
        }
      } catch(e) {}
    }, { passive: true });

    document.addEventListener('touchend', function() {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TOUCH_END' }));
        }
      } catch(e) {}
    }, { passive: true });

    document.addEventListener('touchcancel', function() {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TOUCH_END' }));
        }
      } catch(e) {}
    }, { passive: true });

    // Signal map readiness to React Native
    setTimeout(function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 250);
  </script>
</body>
</html>`,
    []
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
        style={styles.webView}
      />

      {/* Street vs Satellite Switcher Pill */}
      <View style={styles.layerSwitcher}>
        <TouchableOpacity
          style={[styles.tileBtn, baseTile === 'satellite' && styles.tileBtnActive]}
          onPress={() => handleTileSwitch('satellite')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="earth"
            size={12}
            color={baseTile === 'satellite' ? Colors.white : Colors.slate700}
          />
          <Text
            style={[styles.tileBtnText, baseTile === 'satellite' && styles.tileBtnTextActive]}
          >
            Satellite
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tileBtn, baseTile === 'street' && styles.tileBtnActive]}
          onPress={() => handleTileSwitch('street')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map"
            size={12}
            color={baseTile === 'street' ? Colors.white : Colors.slate700}
          />
          <Text style={[styles.tileBtnText, baseTile === 'street' && styles.tileBtnTextActive]}>
            Street
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={Colors.emerald700} />
          <Text style={styles.loadingText}>Initializing Map…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
  },
  layerSwitcher: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Shadows.md,
  },
  tileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  tileBtnActive: {
    backgroundColor: Colors.emerald700,
  },
  tileBtnText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  tileBtnTextActive: {
    color: Colors.white,
  },
});
