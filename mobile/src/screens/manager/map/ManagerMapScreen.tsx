/**
 * GreenPath Village Manager Mobile — Tab 3: Village GIS Map Screen
 *
 * 100% Feature Parity with Web Application Mobile Dashboard:
 * - Unified date switcher (< Today / Date >)
 * - 100% Client-Side KML Map Export download with zero server load
 * - Interactive Leaflet Map (Street / Satellite)
 * - Boundaries (Village & Ward polygons) with dynamic coverage/segregation fills
 * - Roads network overlay with toggle
 * - Household GPS markers with touch inspection
 * - Layer Switcher: Collection Status, Ward Coverage, Segregation Quality
 * - Dynamic Layer Legend & Stats Strip
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { useAuth } from '../../../auth/AuthProvider';
import {
  fetchManagerDailySummary,
  fetchVillageBoundaries,
  fetchVillageRoads,
} from '../../../api/manager.api';
import {
  getCachedCollectionsSummary,
  saveCachedCollectionsSummary,
  isTodayDate,
  getTodayDateStr,
} from '../../../services/manager-cache';
import { exportAndShareKML } from '../../../services/map-kml-export.service';
import { ReportsDateSwitcher } from '../reports/ReportsDateSwitcher';
import { MapWebViewContainer } from './MapWebViewContainer';
import { MapStatsStrip } from './MapStatsStrip';
import { MapLayerPicker } from './MapLayerPicker';
import { MapLegend } from './MapLegend';
import type {
  ManagerVillageData,
  VillageBoundary,
  VillageRoad,
  ManagerDailyCollectionSummary,
  ManagerCollectionHousehold,
  MapLayerType,
} from '../../../types/manager';

const { height: screenHeight } = Dimensions.get('window');
// Generous GIS viewport height matching the web dashboard's 70vh
const MAP_VIEW_HEIGHT = Math.max(520, Math.round(screenHeight * 0.65));

interface ManagerMapScreenProps {
  villageData: ManagerVillageData | null;
}

export function ManagerMapScreen({ villageData }: ManagerMapScreenProps) {
  const { user } = useAuth();
  const effectiveVillageId = (villageData?.id || user?.villageId || '').trim();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('collection-status');
  const [showRoads, setShowRoads] = useState<boolean>(true);

  // Data states
  const [dailySummary, setDailySummary] = useState<ManagerDailyCollectionSummary | null>(() => {
    return getCachedCollectionsSummary(effectiveVillageId, getTodayDateStr());
  });
  const [boundaries, setBoundaries] = useState<VillageBoundary[]>([]);
  const [roads, setRoads] = useState<VillageRoad[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Inspect selected household from map marker tap
  const [inspectedHousehold, setInspectedHousehold] = useState<ManagerCollectionHousehold | null>(
    null
  );

  // Map vertical scroll lock state — prevents parent ScrollView from stealing vertical pan gestures
  const [isMapInteracting, setIsMapInteracting] = useState<boolean>(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapTouchStart = useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
    setIsMapInteracting(true);
  }, []);

  const handleMapTouchEnd = useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    // 120ms debounce allows Leaflet inertial panning to complete before restoring page scroll
    interactionTimeoutRef.current = setTimeout(() => {
      setIsMapInteracting(false);
    }, 120);
  }, []);

  // Load daily summary by date
  const loadDailySummary = useCallback(
    async (dateStr: string) => {
      if (!effectiveVillageId) return;

      const cached = getCachedCollectionsSummary(effectiveVillageId, dateStr);
      if (cached) {
        setDailySummary(cached);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await fetchManagerDailySummary(dateStr);
        if (data) {
          setDailySummary(data);
          if (isTodayDate(dateStr)) {
            saveCachedCollectionsSummary(effectiveVillageId, dateStr, data);
          }
        }
      } catch (err) {
        console.warn('[ManagerMapScreen] Error loading daily summary:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveVillageId]
  );

  // Load static GIS layers (boundaries and roads) once
  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchVillageBoundaries(), fetchVillageRoads()])
      .then(([bList, rList]) => {
        if (isMounted) {
          if (Array.isArray(bList)) setBoundaries(bList);
          if (Array.isArray(rList)) setRoads(rList);
        }
      })
      .catch((err) => {
        console.warn('[ManagerMapScreen] Error loading GIS layers:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveVillageId]);

  // Load collections when date changes
  useEffect(() => {
    loadDailySummary(selectedDate);
  }, [selectedDate, loadDailySummary]);

  // Compute Ward Coverage (% collected per ward)
  const wardCoverage = useMemo(() => {
    const list = dailySummary?.households || [];
    const map = new Map<string, { total: number; collected: number }>();
    list.forEach((h) => {
      const w = (h.ward || '').trim();
      if (!w) return;
      const cur = map.get(w) || { total: 0, collected: 0 };
      cur.total++;
      if (h.collected) cur.collected++;
      map.set(w, cur);
    });
    return map;
  }, [dailySummary]);

  // Compute Ward Segregation Quality (avg stars per ward)
  const wardSegregation = useMemo(() => {
    const list = dailySummary?.households || [];
    const map = new Map<string, { sum: number; count: number }>();
    list.forEach((h) => {
      const w = (h.ward || '').trim();
      if (!w || !h.collected || h.segregationRating === null || h.segregationRating === undefined)
        return;
      const cur = map.get(w) || { sum: 0, count: 0 };
      cur.sum += h.segregationRating;
      cur.count++;
      map.set(w, cur);
    });
    return map;
  }, [dailySummary]);

  // Aggregate stats
  const stats = useMemo(() => {
    const hh = dailySummary?.households || [];
    const total = hh.length;
    const collected = hh.filter((h) => h.collected).length;
    const pending = total - collected;
    const withGps = hh.filter((h) => h.latitude && h.longitude).length;
    const ratings = hh
      .filter((h) => h.segregationRating !== null && h.segregationRating !== undefined)
      .map((h) => h.segregationRating!);
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '—';

    return {
      total,
      collected,
      pending,
      withGps,
      avgRating,
      ratingCount: ratings.length,
    };
  }, [dailySummary]);

  // Client-Side KML Export Download
  const handleDownloadKml = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExporting(true);

    try {
      const success = await exportAndShareKML({
        villageName: villageData?.name || 'GreenPath Village',
        dateStr: selectedDate,
        boundaries,
        roads,
        households: dailySummary?.households || [],
        showRoads,
        showHouseholds: activeLayer === 'collection-status',
      });

      if (!success) {
        Alert.alert('Export Notice', 'Unable to share KML file on this device.');
      }
    } catch {
      Alert.alert('Export Error', 'Failed to generate KML file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Top header download button
  const downloadButton = (
    <TouchableOpacity
      style={styles.downloadBtn}
      onPress={handleDownloadKml}
      disabled={isExporting}
      activeOpacity={0.7}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={Colors.emerald700} />
      ) : (
        <Ionicons name="download-outline" size={19} color={Colors.emerald700} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 1. Date Switcher with KML Export Download Button */}
      <ReportsDateSwitcher
        date={selectedDate}
        onChangeDate={setSelectedDate}
        rightAction={downloadButton}
      />

      <ScrollView
        scrollEnabled={!isMapInteracting}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Full-Bleed Edge-to-Edge Interactive Map Viewport */}
        <View
          style={styles.mapCard}
          onStartShouldSetResponderCapture={() => {
            handleMapTouchStart();
            return false;
          }}
          onTouchStart={handleMapTouchStart}
          onTouchEnd={handleMapTouchEnd}
          onTouchCancel={handleMapTouchEnd}
        >
          <MapWebViewContainer
            boundaries={boundaries}
            roads={roads}
            households={dailySummary?.households || []}
            activeLayer={activeLayer}
            showRoads={showRoads}
            wardCoverage={wardCoverage}
            wardSegregation={wardSegregation}
            onMarkerSelect={(h) => setInspectedHousehold(h)}
            onInteractionChange={(interacting) => {
              if (interacting) {
                handleMapTouchStart();
              } else {
                handleMapTouchEnd();
              }
            }}
          />

          {/* Active Layer Badge Pill */}
          <View style={styles.activeLayerBadge} pointerEvents="none">
            <Ionicons name="layers" size={12} color={Colors.emerald700} />
            <Text style={styles.activeLayerBadgeText}>
              {activeLayer === 'collection-status'
                ? 'Collection Status'
                : activeLayer === 'ward-coverage'
                  ? 'Ward Coverage'
                  : 'Segregation Quality'}
            </Text>
          </View>
        </View>

        {/* Lower Controls & Legend Section (Padded) */}
        <View style={styles.controlsSection}>
          {/* 3. 3-Stat Summary Strip */}
          <MapStatsStrip
            collected={stats.collected}
            pending={stats.pending}
            total={stats.total}
          />

          {/* 4. Layer Picker & Roads Overlay Toggle */}
          <MapLayerPicker
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
            showRoads={showRoads}
            onToggleRoads={() => setShowRoads((prev) => !prev)}
          />

          {/* 5. Dynamic Layer Legend */}
          <MapLegend
            activeLayer={activeLayer}
            totalHouseholds={stats.total}
            householdsWithGps={stats.withGps}
            wardCoverage={wardCoverage}
            wardSegregation={wardSegregation}
            avgRating={stats.avgRating}
            totalRated={stats.ratingCount}
          />
        </View>
      </ScrollView>

      {/* Household Callout Inspection Modal */}
      {inspectedHousehold && (
        <Modal
          visible={Boolean(inspectedHousehold)}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectedHousehold(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setInspectedHousehold(null)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleGroup}>
                  <Text style={styles.modalHeadName}>{inspectedHousehold.headName}</Text>
                  <Text style={styles.modalMeta}>
                    House #{inspectedHousehold.houseNumber} • {inspectedHousehold.ward}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setInspectedHousehold(null)}
                >
                  <Ionicons name="close" size={18} color={Colors.slate600} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View
                    style={[
                      styles.modalStatusPill,
                      inspectedHousehold.collected
                        ? styles.modalStatusPillCollected
                        : styles.modalStatusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        inspectedHousehold.collected
                          ? styles.modalStatusTextCollected
                          : styles.modalStatusTextPending,
                      ]}
                    >
                      {inspectedHousehold.collected ? 'Collected' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {inspectedHousehold.collected && inspectedHousehold.segregationRating && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Segregation Rating</Text>
                    <Text style={styles.modalRatingText}>
                      ★ {inspectedHousehold.segregationRating} / 5
                    </Text>
                  </View>
                )}

                {inspectedHousehold.collectorName ? (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Collector</Text>
                    <Text style={styles.modalValue}>{inspectedHousehold.collectorName}</Text>
                  </View>
                ) : null}

                {inspectedHousehold.phone ? (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Phone</Text>
                    <Text style={styles.modalValue}>{inspectedHousehold.phone}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  downloadBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl + 20,
  },
  mapCard: {
    width: '100%',
    height: MAP_VIEW_HEIGHT,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  controlsSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  activeLayerBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Shadows.sm,
  },
  activeLayerBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleGroup: {
    flex: 1,
  },
  modalHeadName: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  modalMeta: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  modalValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  modalRatingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: '#ca8a04',
  },
  modalStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  modalStatusPillCollected: {
    backgroundColor: '#dcfce7',
  },
  modalStatusPillPending: {
    backgroundColor: '#f1f5f9',
  },
  modalStatusText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
  },
  modalStatusTextCollected: {
    color: '#15803d',
  },
  modalStatusTextPending: {
    color: '#64748b',
  },
});
