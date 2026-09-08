/**
 * Waste Log Screen
 * Collector's personal waste log with CRUD.
 * - Grouped by date with daily totals and entry counts
 * - Exact UI matching design specifications
 * - Collectors can only enter/edit logs for today; date is auto-fetched
 * - Delete requires explicit confirmation
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { fetchWasteLogs, createWasteLog, updateWasteLog, deleteWasteLog } from '../../api/collector.api';
import type { WasteLog, WasteLogFormData } from '../../types/collector';
import {
  enqueueWasteLog,
  getQueuedWasteLogs,
  deleteQueuedWasteLog,
  syncSingleWasteLog,
  syncAllQueuedWasteLogs,
  type QueuedWasteLog,
} from '../../services/offline-queue';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

function queuedToWasteLog(q: QueuedWasteLog): WasteLog {
  const wet = parseFloat(q.wetWasteKg) || 0;
  const dry = parseFloat(q.dryWasteKg) || 0;
  const sanitary = parseFloat(q.sanitaryWasteKg) || 0;
  const special = parseFloat(q.specialCareWasteKg) || 0;
  const mixed = parseFloat(q.mixedWasteKg) || 0;

  return {
    id: -q.id,
    date: q.date,
    wetWasteKg: q.wetWasteKg,
    dryWasteKg: q.dryWasteKg,
    sanitaryWasteKg: q.sanitaryWasteKg,
    specialCareWasteKg: q.specialCareWasteKg,
    mixedWasteKg: q.mixedWasteKg,
    wetKg: wet,
    dryKg: dry,
    sanitaryKg: sanitary,
    specialCareKg: special,
    mixedKg: mixed,
    remarks: q.remarks,
    notes: q.remarks,
    createdAt: q.createdAt,
    isOffline: true,
    queuedId: q.id,
    syncStatus: q.syncStatus,
    syncError: q.syncError,
  };
}

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateHeader(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).toUpperCase();
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  } catch {
    return dateStr.toUpperCase();
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function WasteLogScreen() {
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<WasteLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Form state
  const todayStr = useMemo(() => getTodayStr(), []);
  const [wetKg, setWetKg] = useState('');
  const [dryKg, setDryKg] = useState('');
  const [sanitaryKg, setSanitaryKg] = useState('');
  const [specialCareKg, setSpecialCareKg] = useState('');
  const [mixedKg, setMixedKg] = useState('');
  const [notes, setNotes] = useState('');

  // Value access helpers
  const getWet = (log: WasteLog): number => parseFloat(String(log.wetWasteKg ?? log.wetKg ?? 0)) || 0;
  const getDry = (log: WasteLog): number => parseFloat(String(log.dryWasteKg ?? log.dryKg ?? 0)) || 0;
  const getSanitary = (log: WasteLog): number => parseFloat(String(log.sanitaryWasteKg ?? log.sanitaryKg ?? 0)) || 0;
  const getSpecial = (log: WasteLog): number => parseFloat(String(log.specialCareWasteKg ?? log.specialCareKg ?? 0)) || 0;
  const getMixed = (log: WasteLog): number => parseFloat(String(log.mixedWasteKg ?? log.mixedKg ?? 0)) || 0;
  const getRemarks = (log: WasteLog): string => String(log.remarks ?? log.notes ?? '');
  const getItemTotal = (log: WasteLog): number =>
    getWet(log) + getDry(log) + getSanitary(log) + getSpecial(log) + getMixed(log);

  const loadData = useCallback(async () => {
    try {
      let serverData: WasteLog[] | null = null;
      try {
        const data = await fetchWasteLogs();
        if (Array.isArray(data)) {
          serverData = data;
        }
      } catch {
        // Network failure / offline: retain existing in-memory server logs
      }

      const queued = getQueuedWasteLogs();
      const offlineLogs = queued.map(queuedToWasteLog);

      setLogs((prev) => {
        const currentServerLogs = serverData !== null
          ? serverData
          : prev.filter((l) => !l.isOffline);
        return [...offlineLogs, ...currentServerLogs];
      });
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncAllQueuedWasteLogs();
    } catch {
      // silent
    }
    await loadData();
  };

  const handleSyncSingle = async (queuedId: number) => {
    setSyncingId(queuedId);
    try {
      const ok = await syncSingleWasteLog(queuedId);
      if (ok) {
        await loadData();
      } else {
        Alert.alert(
          'Sync Failed',
          'Could not upload this waste log. Please check your internet connection and try again.'
        );
      }
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to sync waste log.'));
    } finally {
      setSyncingId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setWetKg('');
    setDryKg('');
    setSanitaryKg('');
    setSpecialCareKg('');
    setMixedKg('');
    setNotes('');
    setEditingLog(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (log: WasteLog) => {
    const logDateStr = log.date ? log.date.split('T')[0] : '';
    if (logDateStr !== todayStr) {
      Alert.alert(
        'Action Not Allowed',
        "Collectors are only permitted to edit logs recorded today. Logs from previous days cannot be modified."
      );
      return;
    }

    setEditingLog(log);
    setWetKg(getWet(log) > 0 ? String(getWet(log)) : '');
    setDryKg(getDry(log) > 0 ? String(getDry(log)) : '');
    setSanitaryKg(getSanitary(log) > 0 ? String(getSanitary(log)) : '');
    setSpecialCareKg(getSpecial(log) > 0 ? String(getSpecial(log)) : '');
    setMixedKg(getMixed(log) > 0 ? String(getMixed(log)) : '');
    setNotes(getRemarks(log));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const totalInput =
      (parseFloat(wetKg) || 0) +
      (parseFloat(dryKg) || 0) +
      (parseFloat(sanitaryKg) || 0) +
      (parseFloat(specialCareKg) || 0) +
      (parseFloat(mixedKg) || 0);

    if (totalInput <= 0) {
      Alert.alert('Missing Weight', 'Please enter a waste weight greater than 0 kg in at least one category.');
      return;
    }

    setIsSubmitting(true);
    const data: WasteLogFormData = {
      date: todayStr,
      wetWasteKg: wetKg || '0',
      dryWasteKg: dryKg || '0',
      sanitaryWasteKg: sanitaryKg || '0',
      specialCareWasteKg: specialCareKg || '0',
      mixedWasteKg: mixedKg || '0',
      remarks: notes,
      wetKg: wetKg || '0',
      dryKg: dryKg || '0',
      sanitaryKg: sanitaryKg || '0',
      specialCareKg: specialCareKg || '0',
      mixedKg: mixedKg || '0',
      notes,
    };

    try {
      if (editingLog) {
        if (editingLog.isOffline && editingLog.queuedId) {
          deleteQueuedWasteLog(editingLog.queuedId);
          enqueueWasteLog(data);
        } else {
          await updateWasteLog(editingLog.id, data);
        }
      } else {
        try {
          await createWasteLog(data);
        } catch {
          // Offline / network failure: enqueue into SQLite waste_log_queue!
          enqueueWasteLog(data);
        }
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to save waste log.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWithConfirm = (log: WasteLog) => {
    const logDateStr = log.date ? log.date.split('T')[0] : '';
    if (logDateStr !== todayStr) {
      Alert.alert(
        'Action Not Allowed',
        "Collectors are only permitted to delete logs recorded today. Logs from previous days cannot be deleted."
      );
      return;
    }

    Alert.alert(
      'Delete Waste Log',
      'Are you sure you want to delete this log entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (log.isOffline && log.queuedId) {
                deleteQueuedWasteLog(log.queuedId);
                loadData();
              } else {
                await deleteWasteLog(log.id);
                loadData();
              }
            } catch (err: any) {
              Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to delete waste log.'));
            }
          },
        },
      ]
    );
  };

  // Group logs by date
  interface DateGroup {
    date: string;
    formattedDate: string;
    totalKg: number;
    count: number;
    logs: WasteLog[];
  }

  const dateGroups: DateGroup[] = useMemo(() => {
    const map: { [key: string]: WasteLog[] } = {};
    for (const item of logs) {
      const key = item.date ? item.date.split('T')[0] : 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((dateKey) => {
      const items = map[dateKey];
      const totalKg = items.reduce((sum, it) => sum + getItemTotal(it), 0);
      return {
        date: dateKey,
        formattedDate: formatDateHeader(dateKey),
        totalKg,
        count: items.length,
        logs: items,
      };
    });
  }, [logs]);

  if (isLoading) return <LoadingState message="Loading waste logs..." />;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Waste Log</Text>
          <Text style={styles.subtitle}>Daily bulk collection records</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.addButtonText}>Log Waste</Text>
        </TouchableOpacity>
      </View>

      {/* Grouped Logs List */}
      <FlatList
        style={styles.flatList}
        data={dateGroups}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.emerald600]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No waste logs recorded"
            subtitle="Tap Log Waste above to record today's bulk collection"
          />
        }
        renderItem={({ item: group }) => (
          <View style={styles.dateGroupContainer}>
            {/* Section Header: e.g. "SUN, SEP 6" and "64.0 kg total · 2" */}
            <View style={styles.dateHeaderRow}>
              <Text style={styles.dateHeaderText}>{group.formattedDate}</Text>
              <View style={styles.dateTotalBadge}>
                <Text style={styles.dateTotalBadgeText}>
                  {group.totalKg.toFixed(1)} kg total · {group.count}
                </Text>
              </View>
            </View>

            {/* Individual Cards for this date */}
            {group.logs.map((log) => {
              const wet = getWet(log);
              const dry = getDry(log);
              const sanitary = getSanitary(log);
              const special = getSpecial(log);
              const mixed = getMixed(log);
              const remarks = getRemarks(log);
              const totalKg = getItemTotal(log);
              const isEditable = group.date === todayStr;

              return (
                <View key={log.id} style={[styles.logCard, log.isOffline && styles.logCardOffline]}>
                  {/* Top Row: Total kg on left, Edit & Delete buttons on right */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTotalWeight}>{totalKg.toFixed(1)} kg</Text>
                    <View style={styles.cardActions}>
                      {isEditable && (
                        <>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => openEdit(log)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="create-outline" size={18} color={Colors.slate600} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, styles.iconButtonDelete]}
                            onPress={() => handleDeleteWithConfirm(log)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Category Chips: only show categories with weight > 0 */}
                  <View style={styles.chipsRow}>
                    {wet > 0 && (
                      <View style={[styles.chip, styles.chipWet]}>
                        <Text style={[styles.chipText, styles.chipTextWet]}>
                          Wet: {wet.toFixed(2)}kg
                        </Text>
                      </View>
                    )}
                    {dry > 0 && (
                      <View style={[styles.chip, styles.chipDry]}>
                        <Text style={[styles.chipText, styles.chipTextDry]}>
                          Dry: {dry.toFixed(2)}kg
                        </Text>
                      </View>
                    )}
                    {sanitary > 0 && (
                      <View style={[styles.chip, styles.chipSanitary]}>
                        <Text style={[styles.chipText, styles.chipTextSanitary]}>
                          Sanitary: {sanitary.toFixed(2)}kg
                        </Text>
                      </View>
                    )}
                    {special > 0 && (
                      <View style={[styles.chip, styles.chipSpecial]}>
                        <Text style={[styles.chipText, styles.chipTextSpecial]}>
                          Special Care: {special.toFixed(2)}kg
                        </Text>
                      </View>
                    )}
                    {mixed > 0 && (
                      <View style={[styles.chip, styles.chipMixed]}>
                        <Text style={[styles.chipText, styles.chipTextMixed]}>
                          Mixed: {mixed.toFixed(2)}kg
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Optional Remarks Note */}
                  {remarks ? (
                    <Text style={styles.cardRemarks} numberOfLines={2}>
                      "{remarks}"
                    </Text>
                  ) : null}

                  {/* Offline Status Badge & Sync Button */}
                  {log.isOffline && (
                    <View style={styles.offlineFooter}>
                      <View style={styles.notSyncedBadge}>
                        <Ionicons name="cloud-offline-outline" size={13} color="#D97706" style={{ marginRight: 4 }} />
                        <Text style={styles.notSyncedText}>Not Synced</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.syncItemButton, syncingId === log.queuedId && styles.syncItemButtonDisabled]}
                        onPress={() => log.queuedId && handleSyncSingle(log.queuedId)}
                        disabled={syncingId === log.queuedId}
                        activeOpacity={0.8}
                      >
                        {syncingId === log.queuedId ? (
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
                        ) : (
                          <Ionicons name="sync" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        )}
                        <Text style={styles.syncItemButtonText}>
                          {syncingId === log.queuedId ? 'Syncing...' : 'Sync'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      />

      {/* Add / Edit Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => {
          setShowForm(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingLog ? 'Edit Waste Log' : 'New Waste Log Entry'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.slate600} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Auto-Fetched Date Box (Non-editable as collectors cannot modify log date) */}
            <View style={styles.dateBox}>
              <View style={styles.dateBoxLeft}>
                <View style={styles.calendarIconCircle}>
                  <Ionicons name="calendar" size={18} color={Colors.emerald700} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.dateBoxLabel}>LOGGING DATE (TODAY)</Text>
                  <Text style={styles.dateBoxValue}>{formatDisplayDate(todayStr)}</Text>
                </View>
              </View>
              <View style={styles.autoFetchedBadge}>
                <Ionicons name="lock-closed" size={11} color={Colors.emerald700} style={{ marginRight: 3 }} />
                <Text style={styles.autoFetchedText}>Auto-fetched</Text>
              </View>
            </View>

            {/* Waste Breakdown Inputs */}
            {[
              { label: 'Wet Waste (kg)', value: wetKg, setter: setWetKg, color: '#047857' },
              { label: 'Dry Waste (kg)', value: dryKg, setter: setDryKg, color: '#1D4ED8' },
              { label: 'Sanitary Waste (kg)', value: sanitaryKg, setter: setSanitaryKg, color: '#BE123C' },
              { label: 'Special Care Waste (kg)', value: specialCareKg, setter: setSpecialCareKg, color: '#7E22CE' },
              { label: 'Mixed Waste (kg)', value: mixedKg, setter: setMixedKg, color: '#B45309' },
            ].map(({ label, value, setter, color }) => (
              <View key={label} style={styles.formSection}>
                <View style={styles.fieldHeader}>
                  <View style={[styles.fieldIndicator, { backgroundColor: color }]} />
                  <Text style={styles.formLabel}>{label.toUpperCase()}</Text>
                </View>
                <TextInput
                  style={styles.formInput}
                  value={value}
                  onChangeText={setter}
                  placeholder="0.0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>OPTIONAL REMARKS / NOTES</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Facility name, batch ID, vehicle number..."
                placeholderTextColor={Colors.slate400}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Submit Footer */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={20} color={Colors.white} />
                  <Text style={styles.submitText}>
                    {editingLog ? 'Update Entry' : 'Save Waste Log'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  flatList: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald600,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    ...Shadows.emeraldGlow,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
  },
  dateGroupContainer: {
    marginBottom: Spacing.xs,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dateHeaderText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateTotalBadge: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  dateTotalBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  logCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.emerald500,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  logCardOffline: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFDF7',
  },
  offlineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs + 4,
    paddingTop: Spacing.xs + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  notSyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  notSyncedText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: '#B45309',
  },
  syncItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald600,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  syncItemButtonDisabled: {
    opacity: 0.6,
  },
  syncItemButtonText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTotalWeight: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDelete: {
    backgroundColor: Colors.destructiveLight,
    borderColor: '#fecaca',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs + 2,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
  },
  chipWet: { backgroundColor: Colors.emerald50, borderColor: Colors.emerald100 },
  chipTextWet: { color: Colors.emerald700 },
  chipDry: { backgroundColor: Colors.blue50, borderColor: Colors.blue100 },
  chipTextDry: { color: Colors.blue600 },
  chipSanitary: { backgroundColor: Colors.destructiveLight, borderColor: '#fecaca' },
  chipTextSanitary: { color: Colors.destructive },
  chipSpecial: { backgroundColor: Colors.purple50, borderColor: Colors.purple100 },
  chipTextSpecial: { color: Colors.purple600 },
  chipMixed: { backgroundColor: Colors.warningLight, borderColor: '#fde68a' },
  chipTextMixed: { color: '#92400e' },
  cardRemarks: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    fontStyle: 'italic',
    marginTop: Spacing.xs + 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate300,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 110,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.emerald50,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  dateBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.emerald100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBoxLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.5,
  },
  dateBoxValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
    marginTop: 2,
  },
  autoFetchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald100,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  autoFetchedText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  formSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  formLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.5,
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    backgroundColor: Colors.slate50,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Shadows.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    ...Shadows.emeraldGlow,
  },
  submitText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
