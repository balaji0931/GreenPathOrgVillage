/**
 * GreenPath Village Manager — Reports Tab: Sticky Date Switcher
 *
 * Provides:
 * - Previous/Next day navigation arrows with haptic feedback
 * - Center date pill showing Day-of-week / TODAY + formatted date
 * - Quick 'Today' snap chip when viewing historical dates
 * - Pure React Native DatePickerModal integration
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DatePickerModal } from '../../../components/common/DatePickerModal';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

interface ReportsDateSwitcherProps {
  date: string; // 'YYYY-MM-DD'
  onChangeDate: (newDateStr: string) => void;
  rightAction?: React.ReactNode;
}

export function ReportsDateSwitcher({
  date,
  onChangeDate,
  rightAction,
}: ReportsDateSwitcherProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Parse YYYY-MM-DD in local time
  const [year, month, day] = date.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);

  const today = new Date();
  const isToday =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getDate() === today.getDate();

  const dayOfWeek = isToday
    ? 'TODAY'
    : currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formatDateToString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const handleAdjustDate = (offsetDays: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = new Date(currentDate);
    target.setDate(target.getDate() + offsetDays);
    onChangeDate(formatDateToString(target));
  };

  const handleSelectModalDate = (selectedDate: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChangeDate(formatDateToString(selectedDate));
  };

  const handleResetToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChangeDate(formatDateToString(new Date()));
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.innerBar}>
          {/* Previous Day Arrow */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => handleAdjustDate(-1)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.slate700} />
          </TouchableOpacity>

          {/* Center Date Trigger: Date on Left, Day on Right */}
          <TouchableOpacity
            style={styles.dateCenterTrigger}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsCalendarOpen(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dateHorizontalRow}>
              {/* Date on Left */}
              <View style={styles.dateLeftGroup}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={isToday ? Colors.emerald700 : Colors.slate600}
                />
                <Text style={styles.dateValue}>{formattedDate}</Text>
              </View>

              {/* Day Badge on Right */}
              <View
                style={[
                  styles.dayBadge,
                  isToday ? styles.dayBadgeToday : styles.dayBadgeRegular,
                ]}
              >
                <Text
                  style={[
                    styles.dayBadgeText,
                    isToday && styles.dayBadgeTextToday,
                  ]}
                >
                  {dayOfWeek}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Next Day Arrow */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => handleAdjustDate(1)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.slate700} />
          </TouchableOpacity>

          {/* Optional Right Action (e.g. Collections Filter Button) */}
          {rightAction ? (
            <View style={styles.rightActionWrapper}>{rightAction}</View>
          ) : null}
        </View>
      </View>

      {/* Reusable Calendar Date Picker Modal */}
      <DatePickerModal
        visible={isCalendarOpen}
        selectedDate={currentDate}
        onSelectDate={handleSelectModalDate}
        onClose={() => setIsCalendarOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    ...Shadows.sm,
  },
  innerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenterTrigger: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate50,
    marginHorizontal: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  dateHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dayBadgeToday: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  dayBadgeRegular: {
    backgroundColor: Colors.slate200,
  },
  dayBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
    letterSpacing: 0.5,
  },
  dayBadgeTextToday: {
    color: Colors.emerald700,
  },
  todaySnapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: Colors.emerald100,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  todaySnapText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  rightActionWrapper: {
    marginLeft: 6,
  },
});
