/**
 * Date Picker Modal Component
 *
 * Clean, lightweight calendar modal for selecting any date (including past months).
 * Built with pure React Native components (no external native calendar dependencies).
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  maxDate?: Date;
  minDate?: Date;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DatePickerModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  maxDate = new Date(),
  minDate,
}: DatePickerModalProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Sync viewed month with selectedDate when modal opens
  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateString(today), [today]);
  const maxDateStr = useMemo(() => toDateString(maxDate), [maxDate]);
  const minDateStr = useMemo(() => (minDate ? toDateString(minDate) : null), [minDate]);

  const canGoNext = useMemo(() => {
    return (
      viewYear < maxDate.getFullYear() ||
      (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth())
    );
  }, [viewYear, viewMonth, maxDate]);

  const canGoPrev = useMemo(() => {
    if (!minDate) return true;
    return (
      viewYear > minDate.getFullYear() ||
      (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth())
    );
  }, [viewYear, viewMonth, minDate]);

  const goToPrevMonth = () => {
    if (!canGoPrev) return;
    Haptics.selectionAsync().catch(() => {});
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    Haptics.selectionAsync().catch(() => {});
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const target = new Date(viewYear, viewMonth, day);
    const targetStr = toDateString(target);
    if (targetStr > maxDateStr) return;
    if (minDateStr && targetStr < minDateStr) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(target);
    onClose();
  };

  const handleSelectToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(new Date());
    onClose();
  };

  // Calendar grid calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const leadingSlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const daySlots = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
              onPress={goToPrevMonth}
              disabled={!canGoPrev}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoPrev ? Colors.slate700 : Colors.slate300}
              />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
              onPress={goToNextMonth}
              disabled={!canGoNext}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoNext ? Colors.slate700 : Colors.slate300}
              />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.weekHeader}>
            {DAY_LABELS.map((label, idx) => (
              <View key={idx} style={styles.weekCell}>
                <Text style={styles.weekLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {leadingSlots.map((slot) => (
              <View key={`leading-${slot}`} style={styles.dayCell} />
            ))}

            {daySlots.map((day) => {
              const dateObj = new Date(viewYear, viewMonth, day);
              const dateStr = toDateString(dateObj);
              const isSelected = isSameDay(dateObj, selectedDate);
              const isCurrentDay = dateStr === todayStr;
              const isDisabled = dateStr > maxDateStr || (minDateStr ? dateStr < minDateStr : false);

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={styles.dayCell}
                  onPress={() => handleSelectDay(day)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayBubble,
                      isSelected && styles.dayBubbleSelected,
                      isCurrentDay && !isSelected && styles.dayBubbleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isDisabled && styles.dayTextDisabled,
                        isCurrentDay && !isSelected && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleSelectToday}
              activeOpacity={0.7}
            >
              <Ionicons name="today-outline" size={16} color={Colors.emerald700} style={{ marginRight: 6 }} />
              <Text style={styles.todayButtonText}>Go to Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
  },
  navButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  titleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingBottom: 6,
  },
  weekCell: {
    width: '14.28%',
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate400,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: Colors.emerald600,
  },
  dayBubbleToday: {
    borderWidth: 1.5,
    borderColor: Colors.emerald600,
    backgroundColor: '#ecfdf5',
  },
  dayText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate800,
  },
  dayTextDisabled: {
    color: Colors.slate300,
  },
  dayTextToday: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilyBold,
  },
  dayTextSelected: {
    color: Colors.white,
    fontFamily: Typography.fontFamilyBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  todayButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  closeButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate600,
  },
});
