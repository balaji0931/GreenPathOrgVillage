/**
 * Subscription Banner for GreenPath Mobile
 *
 * Displays a dynamic multi-stage subscription notification banner
 * directly beneath the top header navigation:
 * - warning_30 (yellow)
 * - warning_15 (orange)
 * - warning_7 (red)
 * - grace (red)
 * - expired (dark slate read-only)
 * - no_subscription (dark slate read-only)
 *
 * Single-line with horizontal scrolling and a small dismiss [✕] button.
 * Common component used across Collector, Field Worker, and other role dashboards.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, type SubscriptionState } from '../../hooks/useSubscription';
import { Typography, Spacing } from '../../constants/theme';

interface BannerConfig {
  bgColor: string;
  borderColor: string;
  textColor: string;
  closeColor: string;
  icon: string;
}

export function SubscriptionBanner() {
  const { subscription, state, daysRemaining, isLoading } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal if state or daysRemaining changes
  useEffect(() => {
    setIsDismissed(false);
  }, [state, daysRemaining]);

  if (isLoading || isDismissed) return null;
  if (state === 'active') return null;

  // Build dynamic titles and actions matching web app
  let title = subscription
    ? `Subscription expires in ${daysRemaining} days.`
    : 'No Active Subscription';

  if (subscription && daysRemaining === 1) {
    title = 'Subscription expires tomorrow.';
  } else if (subscription && daysRemaining === 0) {
    title = 'Subscription expires today.';
  }

  let subtitle = '';
  let actionText = 'Please contact your supervisor.';

  let config: BannerConfig = {
    bgColor: '#fef9c3',
    borderColor: '#fde047',
    textColor: '#854d0e',
    closeColor: '#854d0e',
    icon: '⚠️',
  };

  switch (state) {
    case 'warning_30':
      config = {
        bgColor: '#fef9c3',
        borderColor: '#fde047',
        textColor: '#854d0e',
        closeColor: '#854d0e',
        icon: '⚠️',
      };
      actionText = 'Please inform your supervisor to ensure uninterrupted GreenPath services.';
      break;

    case 'warning_10':
    case 'warning_15':
      config = {
        bgColor: '#ffedd5',
        borderColor: '#fed7aa',
        textColor: '#9a3412',
        closeColor: '#9a3412',
        icon: '⚠️',
      };
      actionText = 'Please inform your supervisor.';
      break;

    case 'warning_7':
      config = {
        bgColor: '#fee2e2',
        borderColor: '#fecaca',
        textColor: '#991b1b',
        closeColor: '#991b1b',
        icon: '⚠️',
      };
      actionText = 'Please contact your supervisor.';
      break;

    case 'grace':
      config = {
        bgColor: '#fee2e2',
        borderColor: '#fecaca',
        textColor: '#991b1b',
        closeColor: '#991b1b',
        icon: '⚠️',
      };
      title = 'Subscription has expired.';
      subtitle = 'GreenPath is currently operating in the grace period.';
      actionText = 'Please contact your supervisor.';
      break;

    case 'expired':
      config = {
        bgColor: '#1e293b',
        borderColor: '#0f172a',
        textColor: '#f8fafc',
        closeColor: '#94a3b8',
        icon: '⚠️',
      };
      title = 'Subscription Expired.';
      subtitle = 'GreenPath is currently in Read-Only Mode. New collection entries cannot be recorded.';
      actionText = 'Please inform your supervisor or Panchayat secretary.';
      break;

    case 'no_subscription':
      config = {
        bgColor: '#1e293b',
        borderColor: '#0f172a',
        textColor: '#f8fafc',
        closeColor: '#94a3b8',
        icon: '⚠️',
      };
      title = 'No Active Subscription.';
      subtitle = 'GreenPath is currently in Read-Only Mode. New operational updates cannot be recorded.';
      actionText = 'Please inform your supervisor or Panchayat secretary.';
      break;

    default:
      return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderBottomColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <Text style={styles.icon}>{config.icon}</Text>

        {/* Single-line horizontally scrolling message */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <Text
            style={[styles.bannerText, { color: config.textColor }]}
            numberOfLines={1}
          >
            <Text style={styles.boldTitle}>{title} </Text>
            {subtitle ? `${subtitle} ` : ''}
            {actionText}
          </Text>
        </ScrollView>

        {/* Dismiss Button */}
        <TouchableOpacity
          onPress={() => setIsDismissed(true)}
          style={styles.dismissBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={config.closeColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 13,
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
    marginRight: 6,
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 6,
  },
  bannerText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    fontWeight: '500',
  },
  boldTitle: {
    fontWeight: '700',
    fontFamily: Typography.fontFamilyBold,
  },
  dismissBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
