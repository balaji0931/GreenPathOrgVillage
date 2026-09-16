/**
 * GreenPath Village Manager Mobile — Issue Media Viewer Modal
 *
 * Full-screen photo inspector for citizen evidence photos and manager resolution proof images.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

interface IssueMediaModalProps {
  visible: boolean;
  photoUrl: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function IssueMediaModal({
  visible,
  photoUrl,
  title = 'Photo Attachment',
  subtitle,
  onClose,
}: IssueMediaModalProps) {
  const insets = useSafeAreaInsets();

  if (!photoUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.titleGroup}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Full Image Container */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(9, 13, 22, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  titleGroup: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    flex: 1,
    width,
    height: height - 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
