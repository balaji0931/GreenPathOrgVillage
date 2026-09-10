/**
 * Interactive Map Picker Modal — Field Worker
 *
 * Allows field workers to view their satellite GPS position and interactively
 * tap anywhere on the map or drag to mark the exact household location.
 *
 * Features:
 * - 100% pure React Native + Slippy Map tiles (Zero native map modules required)
 * - Satellite (Esri World Imagery) and Street (OpenStreetMap) toggle on top-right
 * - Tap anywhere on map to instantly place pin on that spot
 * - Smooth drag pan responder
 * - Zoom controls (+ / -) positioned on bottom-left of map
 * - Real-time distance shift badge (Live GPS Match vs Shifted Xm)
 * - Two bottom buttons:
 *    1. "Live Location" (Left): re-captures satellite GPS with high accuracy
 *    2. "Confirm Location" (Right): locks the selected coordinates
 * - Consistent GreenPath header with safe-area status bar
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StatusBar,
  Image,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
  LayoutChangeEvent,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface InteractiveMapPickerModalProps {
  visible: boolean;
  initialLocation: { latitude: number; longitude: number } | null;
  onConfirm: (location: { latitude: number; longitude: number; distanceShiftMeters: number }) => void;
  onClose: () => void;
}

// Slippy Map Math Helpers
const TILE_SIZE = 256;

function toWorld(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n * TILE_SIZE;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2) * n * TILE_SIZE;
  return { x, y };
}

function toLatLng(worldX: number, worldY: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lng = (worldX / (TILE_SIZE * n)) * 360 - 180;
  const yNorm = 1 - (2 * worldY) / (TILE_SIZE * n);
  const latRad = 2 * Math.atan(Math.exp(yNorm * Math.PI)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
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

  // Selected & live coordinates
  const [currentLat, setCurrentLat] = useState<number>(initialLocation?.latitude || 12.9716);
  const [currentLng, setCurrentLng] = useState<number>(initialLocation?.longitude || 77.5946);
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ latitude: number; longitude: number } | null>(initialLocation);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [zoom, setZoom] = useState<number>(18); // Default to high-detail roof/street level
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street'>('satellite');

  // Viewport size & screen bounds measurement
  const [viewport, setViewport] = useState({ width: 360, height: 400 });
  const viewportRef = useRef<View>(null);
  const viewportBoundsRef = useRef({
    pageX: 0,
    pageY: insets.top + 52,
    width: 360,
    height: 400,
  });

  // Keep live mutable refs so PanResponder callbacks never suffer from stale closures
  const coordsRef = useRef({ lat: currentLat, lng: currentLng });
  coordsRef.current = { lat: currentLat, lng: currentLng };

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const panStartRef = useRef({ lat: currentLat, lng: currentLng });

  const handleViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewport({ width, height });
      viewportBoundsRef.current.width = width;
      viewportBoundsRef.current.height = height;
    }
    viewportRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        viewportBoundsRef.current = { pageX: x, pageY: y, width: w, height: h };
      }
    });
  };

  // Re-capture high-accuracy satellite GPS
  const handleRecaptureLiveGps = async () => {
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
      panStartRef.current = { lat: newLat, lng: newLng };
      coordsRef.current = { lat: newLat, lng: newLng };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not acquire high-accuracy satellite GPS signal.');
    } finally {
      setIsAcquiringGps(false);
    }
  };

  // Sync state when initialLocation changes or modal opens
  useEffect(() => {
    if (visible) {
      // Re-measure exact viewport bounds on screen after modal presentation
      setTimeout(() => {
        viewportRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            viewportBoundsRef.current = { pageX: x, pageY: y, width: w, height: h };
          }
        });
      }, 150);

      if (initialLocation) {
        setCurrentLat(initialLocation.latitude);
        setCurrentLng(initialLocation.longitude);
        setLiveGpsCoords(initialLocation);
        panStartRef.current = { lat: initialLocation.latitude, lng: initialLocation.longitude };
        coordsRef.current = { lat: initialLocation.latitude, lng: initialLocation.longitude };
      } else {
        // Auto-capture live GPS if no initial coordinates were passed
        handleRecaptureLiveGps();
      }
    }
  }, [visible, initialLocation]);

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

  // PanResponder with drag and accurate tap-to-point support
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
        },
        onPanResponderGrant: () => {
          // Always read latest live coordinates from ref to prevent stale closures
          panStartRef.current = { lat: coordsRef.current.lat, lng: coordsRef.current.lng };
        },
        onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
          const currentZoom = zoomRef.current;
          const startWorld = toWorld(panStartRef.current.lat, panStartRef.current.lng, currentZoom);
          const next = toLatLng(
            startWorld.x - gestureState.dx,
            startWorld.y - gestureState.dy,
            currentZoom
          );
          setCurrentLat(next.lat);
          setCurrentLng(next.lng);
        },
        onPanResponderRelease: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const isDrag = Math.abs(gestureState.dx) >= 6 || Math.abs(gestureState.dy) >= 6;
          const currentZoom = zoomRef.current;

          if (isDrag) {
            const startWorld = toWorld(panStartRef.current.lat, panStartRef.current.lng, currentZoom);
            const final = toLatLng(
              startWorld.x - gestureState.dx,
              startWorld.y - gestureState.dy,
              currentZoom
            );
            setCurrentLat(final.lat);
            setCurrentLng(final.lng);
            panStartRef.current = { lat: final.lat, lng: final.lng };
          } else {
            // Tap to point on map: calculate exact touch offset from screen coordinates
            const { pageX, pageY } = e.nativeEvent;
            const bounds = viewportBoundsRef.current;

            if (pageX != null && pageY != null && bounds.width > 0 && bounds.height > 0) {
              const touchX = pageX - bounds.pageX;
              const touchY = pageY - bounds.pageY;
              const deltaX = touchX - bounds.width / 2;
              const deltaY = touchY - bounds.height / 2;

              const centerWorld = toWorld(panStartRef.current.lat, panStartRef.current.lng, currentZoom);
              const tappedWorld = { x: centerWorld.x + deltaX, y: centerWorld.y + deltaY };
              const next = toLatLng(tappedWorld.x, tappedWorld.y, currentZoom);

              setCurrentLat(next.lat);
              setCurrentLng(next.lng);
              panStartRef.current = { lat: next.lat, lng: next.lng };
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }
        },
      }),
    []
  );

  // Zoom controls
  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoom((z) => Math.min(19, z + 1));
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoom((z) => Math.max(15, z - 1));
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

  // Render 5x5 tile grid around current coordinates
  const renderTileGrid = () => {
    const centerWorld = toWorld(currentLat, currentLng, zoom);
    const centerTileX = Math.floor(centerWorld.x / TILE_SIZE);
    const centerTileY = Math.floor(centerWorld.y / TILE_SIZE);

    const tileOffsetX = centerWorld.x % TILE_SIZE;
    const tileOffsetY = centerWorld.y % TILE_SIZE;

    const baseOriginX = viewport.width / 2 - tileOffsetX;
    const baseOriginY = viewport.height / 2 - tileOffsetY;

    const tiles: React.ReactNode[] = [];
    const maxTile = Math.pow(2, zoom) - 1;

    // 5x5 tile grid ensures no gray edges during pans
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;

        if (tx < 0 || tx > maxTile || ty < 0 || ty > maxTile) continue;

        const posX = baseOriginX + dx * TILE_SIZE;
        const posY = baseOriginY + dy * TILE_SIZE;

        const tileUrl =
          mapLayer === 'satellite'
            ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
            : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;

        tiles.push(
          <Image
            key={`${zoom}-${tx}-${ty}-${mapLayer}`}
            source={{ uri: tileUrl }}
            style={[
              styles.tileImage,
              {
                left: posX,
                top: posY,
              },
            ]}
            fadeDuration={0}
          />
        );
      }
    }

    return tiles;
  };

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
        <View
          ref={viewportRef}
          style={styles.mapViewport}
          onLayout={handleViewportLayout}
        >
          {/* Main Gesture Catchment Area for dragging & tapping the map */}
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
            {/* Tiles Layer - pointerEvents="none" guarantees images never hijack touch targets */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {renderTileGrid()}
            </View>

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
          </View>

          {/* Layer Switcher (Satellite vs Street) — Top Right */}
          <View style={styles.layerSwitcher}>
            <TouchableOpacity
              style={[styles.layerButton, mapLayer === 'satellite' && styles.layerButtonActive]}
              onPress={() => setMapLayer('satellite')}
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
              onPress={() => setMapLayer('street')}
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
              style={[styles.zoomButton, zoom <= 15 && styles.zoomButtonDisabled]}
              onPress={handleZoomOut}
              disabled={zoom <= 15}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={zoom <= 15 ? Colors.slate300 : Colors.slate800} />
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
              name={distanceShift > 0 ? "navigate" : "checkmark-circle"}
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
              {mapLayer === 'satellite' ? '© Esri, Maxar' : '© Esri'}
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
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
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
