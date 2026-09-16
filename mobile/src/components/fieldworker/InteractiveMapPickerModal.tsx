/**
 * Interactive Map Picker Modal — Field Worker
 *
 * Allows field workers to view their satellite GPS position and interactively
 * tap anywhere on the map or drag to mark the exact household location.
 *
 * Rendered using high-performance Leaflet inside WebView (Esri World Imagery + OpenStreetMap)
 * matching the Manager Dashboard map engine, while preserving 100% of Field Worker UI & UX.
 *
 * Features:
 * - High-resolution Esri World Imagery (Satellite) & OpenStreetMap (Street)
 * - Multi-touch smooth pinch-to-zoom & drag panning via Leaflet engine
 * - Top-right Satellite vs Street layer switcher
 * - Tap anywhere on map to smoothly glide pin to that position
 * - Floating zoom controls (+ / -) on bottom-left
 * - Real-time distance shift badge (Live GPS Match vs Shifted Xm)
 * - Two bottom buttons:
 *    1. "Live Location" (Left): re-captures satellite GPS with high accuracy & re-centers
 *    2. "Confirm Location" (Right): locks the selected coordinates
 * - Consistent GreenPath header with safe-area status bar
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface InteractiveMapPickerModalProps {
  visible: boolean;
  initialLocation: { latitude: number; longitude: number } | null;
  onConfirm: (location: { latitude: number; longitude: number; distanceShiftMeters: number }) => void;
  onClose: () => void;
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function InteractiveMapPickerModal({
  visible,
  initialLocation,
  onConfirm,
  onClose,
}: InteractiveMapPickerModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  // Selected & live coordinates
  const [currentLat, setCurrentLat] = useState<number>(initialLocation?.latitude || 12.9716);
  const [currentLng, setCurrentLng] = useState<number>(initialLocation?.longitude || 77.5946);
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ latitude: number; longitude: number } | null>(initialLocation);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [zoom, setZoom] = useState<number>(18);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street'>('satellite');

  // Re-capture high-accuracy satellite GPS
  const handleRecaptureLiveGps = useCallback(async () => {
    setIsAcquiringGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to capture live GPS.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      setLiveGpsCoords({ latitude: newLat, longitude: newLng });

      // Pan Leaflet map to the new live GPS location
      webViewRef.current?.injectJavaScript(`
        if (window.recenterMap) {
          window.recenterMap(${newLat}, ${newLng});
        }
        true;
      `);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not acquire high-accuracy satellite GPS signal.');
    } finally {
      setIsAcquiringGps(false);
    }
  }, []);

  // Sync state when initialLocation changes or modal opens
  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setCurrentLat(initialLocation.latitude);
        setCurrentLng(initialLocation.longitude);
        setLiveGpsCoords(initialLocation);

        webViewRef.current?.injectJavaScript(`
          if (window.recenterMap) {
            window.recenterMap(${initialLocation.latitude}, ${initialLocation.longitude});
          }
          true;
        `);
      } else {
        handleRecaptureLiveGps();
      }
    }
  }, [visible, initialLocation, handleRecaptureLiveGps]);

  // Distance shift from device's live GPS fix
  const distanceShift = useMemo(() => {
    if (!liveGpsCoords) return 0;
    return getDistanceMeters(
      liveGpsCoords.latitude,
      liveGpsCoords.longitude,
      currentLat,
      currentLng
    );
  }, [liveGpsCoords, currentLat, currentLng]);

  // Handle messages from Leaflet map inside WebView
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'move') {
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          setCurrentLat(data.lat);
          setCurrentLng(data.lng);
        }
        if (typeof data.zoom === 'number') {
          setZoom(Math.round(data.zoom));
        }
      } else if (data.type === 'tap') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript(`
      if (window.zoomIn) {
        window.zoomIn();
      }
      true;
    `);
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript(`
      if (window.zoomOut) {
        window.zoomOut();
      }
      true;
    `);
  };

  // Base tile layer toggle
  const handleSwitchLayer = (layer: 'satellite' | 'street') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMapLayer(layer);
    webViewRef.current?.injectJavaScript(`
      if (window.setBaseTile) {
        window.setBaseTile('${layer}');
      }
      true;
    `);
  };

  // Confirm selection
  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      distanceShiftMeters: distanceShift,
    });
  };

  // High-performance Leaflet HTML matching the Manager Dashboard map engine
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
      background: #0f172a;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .leaflet-control-attribution {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var initialLat = ${currentLat};
    var initialLng = ${currentLng};
    var initialZoom = 18;

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 12
    }).setView([initialLat, initialLng], initialZoom);

    var satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    var streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    satelliteTiles.addTo(map);
    var currentTileLayer = satelliteTiles;

    function postCenter() {
      try {
        var center = map.getCenter();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'move',
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom()
        }));
      } catch (e) {}
    }

    map.on('move', postCenter);
    map.on('moveend', postCenter);

    map.on('click', function(e) {
      map.panTo(e.latlng, { animate: true, duration: 0.35 });
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap' }));
      } catch (e) {}
    });

    window.setBaseTile = function(tile) {
      if (tile === 'street' && currentTileLayer !== streetTiles) {
        map.removeLayer(satelliteTiles);
        streetTiles.addTo(map);
        currentTileLayer = streetTiles;
      } else if (tile === 'satellite' && currentTileLayer !== satelliteTiles) {
        map.removeLayer(streetTiles);
        satelliteTiles.addTo(map);
        currentTileLayer = satelliteTiles;
      }
    };

    window.zoomIn = function() {
      map.zoomIn();
    };

    window.zoomOut = function() {
      map.zoomOut();
    };

    window.recenterMap = function(lat, lng) {
      map.setView([lat, lng], 18, { animate: true });
      postCenter();
    };

    // Initial post
    setTimeout(postCenter, 300);
  </script>
</body>
</html>`,
    [] // Stable initial HTML, dynamic interactions handled via injectJavaScript
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Status Bar & Safe Area Fill */}
        <StatusBar barStyle="light-content" backgroundColor={Colors.greenPrimary} />
        <View style={{ height: insets.top, backgroundColor: Colors.greenPrimary }} />

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Mark House on Map</Text>
            <Text style={styles.headerSubtitle}>Tap anywhere or drag to point</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Interactive Map Viewport */}
        <View style={styles.mapViewport}>
          {/* Leaflet WebView Rendering Engine */}
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={StyleSheet.absoluteFill}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
          />

          {/* Center Target Crosshair & Pin */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            {/* Exact target ring on the center pixel */}
            <View style={styles.centerTargetRing}>
              <View style={styles.centerTargetDot} />
            </View>
            {/* Elevated Pin with tip pointing directly to the target ring */}
            <View style={styles.pinWrapper}>
              <View style={styles.pinBubble}>
                <Ionicons name="home" size={14} color="#ffffff" />
              </View>
              <View style={styles.pinTail} />
            </View>
          </View>

          {/* Layer Switcher (Satellite vs Street) — Top Right */}
          <View style={styles.layerSwitcher}>
            <TouchableOpacity
              style={[styles.layerButton, mapLayer === 'satellite' && styles.layerButtonActive]}
              onPress={() => handleSwitchLayer('satellite')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="earth"
                size={14}
                color={mapLayer === 'satellite' ? '#ffffff' : Colors.slate700}
              />
              <Text
                style={[
                  styles.layerButtonText,
                  mapLayer === 'satellite' && styles.layerButtonTextActive,
                ]}
              >
                Satellite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.layerButton, mapLayer === 'street' && styles.layerButtonActive]}
              onPress={() => handleSwitchLayer('street')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="map"
                size={14}
                color={mapLayer === 'street' ? '#ffffff' : Colors.slate700}
              />
              <Text
                style={[
                  styles.layerButtonText,
                  mapLayer === 'street' && styles.layerButtonTextActive,
                ]}
              >
                Street
              </Text>
            </TouchableOpacity>
          </View>

          {/* Floating Zoom Controls (+ / -) — Bottom Left */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={[styles.zoomButton, zoom >= 19 && styles.zoomButtonDisabled]}
              onPress={handleZoomIn}
              disabled={zoom >= 19}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={zoom >= 19 ? Colors.slate300 : Colors.slate800} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={[styles.zoomButton, zoom <= 12 && styles.zoomButtonDisabled]}
              onPress={handleZoomOut}
              disabled={zoom <= 12}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={zoom <= 12 ? Colors.slate300 : Colors.slate800} />
            </TouchableOpacity>
          </View>

          {/* Map Overlay: Left Bottom Distance Shift Badge */}
          <View
            style={[
              styles.mapDistanceOverlay,
              distanceShift > 0 ? styles.mapDistanceOverlayShifted : styles.mapDistanceOverlayOriginal,
            ]}
            pointerEvents="none"
          >
            <Ionicons
              name={distanceShift > 0 ? 'navigate' : 'checkmark-circle'}
              size={13}
              color={distanceShift > 0 ? '#b45309' : Colors.emerald700}
            />
            <Text
              style={[
                styles.mapDistanceText,
                distanceShift > 0 ? styles.mapDistanceTextShifted : styles.mapDistanceTextOriginal,
              ]}
            >
              {distanceShift === 0 ? 'Live GPS Match' : `Shifted ${distanceShift}m`}
            </Text>
          </View>

          {/* Map Overlay: Right Bottom Map Copyright / Attribution */}
          <View style={styles.mapAttributionOverlay} pointerEvents="none">
            <Text style={styles.mapAttributionText}>
              {mapLayer === 'satellite' ? '© Esri, Maxar' : '© OpenStreetMap'}
            </Text>
          </View>
        </View>

        {/* Bottom Action Card */}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Bottom Two Buttons: Live Location (Left) & Confirm Location (Right) */}
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity
              style={styles.liveLocationButton}
              onPress={handleRecaptureLiveGps}
              disabled={isAcquiringGps}
              activeOpacity={0.7}
            >
              {isAcquiringGps ? (
                <ActivityIndicator size="small" color={Colors.emerald700} />
              ) : (
                <>
                  <Ionicons name="locate" size={18} color={Colors.emerald700} style={{ marginRight: 6 }} />
                  <Text style={styles.liveLocationButtonText}>Live Location</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate900,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.greenPrimary,
    ...Shadows.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  mapViewport: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTargetRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTargetDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  pinWrapper: {
    position: 'absolute',
    bottom: '50%',
    alignItems: 'center',
  },
  pinBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dc2626', // Red-600
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#dc2626',
    marginTop: -1,
  },
  layerSwitcher: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.full,
    padding: 3,
    ...Shadows.md,
  },
  layerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  layerButtonActive: {
    backgroundColor: Colors.emerald600,
  },
  layerButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  layerButtonTextActive: {
    color: '#ffffff',
  },
  zoomControls: {
    position: 'absolute',
    left: Spacing.md,
    bottom: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.35,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: Colors.slate200,
  },
  mapDistanceOverlay: {
    position: 'absolute',
    left: Spacing.md,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  mapDistanceOverlayOriginal: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: Colors.emerald500,
  },
  mapDistanceOverlayShifted: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  mapDistanceText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
  },
  mapDistanceTextOriginal: {
    color: Colors.emerald700,
  },
  mapDistanceTextShifted: {
    color: '#b45309',
  },
  mapAttributionOverlay: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    ...Shadows.sm,
  },
  mapAttributionText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
    letterSpacing: 0.2,
  },
  bottomCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  liveLocationButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald50,
    borderWidth: 1.5,
    borderColor: Colors.emerald500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLocationButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  confirmButton: {
    flex: 1.3,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
  },
});
