/**
 * Camera Capture Modal Component
 *
 * Full-screen in-app camera for collectors to take waste collection photos:
 * - Clear top bar with Close button, Title ("Capture Waste Photo"), and Flash toggle
 * - Framing guides and instructional text ("Position waste clearly in the frame")
 * - Bottom controls with large Shutter button and Camera Flip
 */
import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

interface CameraCaptureModalProps {
  visible: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export function CameraCaptureModal({ visible, onCapture, onClose }: CameraCaptureModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        shutterSound: false,
      });

      if (photo?.uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCapture(photo.uri);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Capture Failed', getFriendlyErrorMessage(err, 'Could not take photo. Please try again.'));
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  // Permission fallback view
  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionTopBar}>
            <TouchableOpacity style={styles.iconCircle} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={Colors.slate700} />
            </TouchableOpacity>
          </View>

          <View style={styles.permissionContent}>
            <View style={styles.permissionIconBox}>
              <Ionicons name="camera" size={48} color={Colors.emerald600} />
            </View>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Camera access is needed to photograph waste collection at the household.
            </Text>

            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={async () => {
                const res = await requestPermission();
                if (!res.granted && !res.canAskAgain) {
                  Linking.openSettings();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionBtnText}>Enable Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.permissionCancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.permissionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Active Camera View */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          enableTorch={flash === 'on'}
          animateShutter={false}
          mute={true}
        />

        {/* Top Control Bar */}
        <SafeAreaView style={styles.topSafeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.topBarTitle}>Capture Waste Photo</Text>
              <Text style={styles.topBarSubtitle}>Household Collection</Text>
            </View>

            <TouchableOpacity
              style={[styles.topBarBtn, flash === 'on' && styles.topBarBtnActive]}
              onPress={toggleFlash}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={20}
                color={flash === 'on' ? '#facc15' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Viewfinder Center Guide */}
        <View style={styles.viewfinderArea} pointerEvents="none">
          <View style={styles.viewfinderFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Guide Text Banner */}
          <View style={styles.guideBadge}>
            <Ionicons name="scan-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.guideText}>Position waste or doorstep in frame</Text>
          </View>
        </View>

        {/* Bottom Shutter and Actions Bar */}
        <SafeAreaView style={styles.bottomSafeArea}>
          <View style={styles.bottomBar}>
            {/* Placeholder to balance Flip button and keep Shutter centered */}
            <View style={styles.sideActionBtn} />

            {/* Main Shutter Button */}
            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleTakePhoto}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInner}>
                {isCapturing ? (
                  <ActivityIndicator color={Colors.emerald600} />
                ) : (
                  <View style={styles.shutterDot} />
                )}
              </View>
            </TouchableOpacity>

            {/* Flip Camera */}
            <TouchableOpacity
              style={styles.sideActionBtn}
              onPress={toggleFacing}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={26} color="#ffffff" />
              <Text style={styles.sideActionText}>Flip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topSafeArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 12,
    paddingBottom: 12,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBtnActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderWidth: 1.5,
    borderColor: '#facc15',
  },
  titleContainer: {
    alignItems: 'center',
    gap: 2,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topBarSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  viewfinderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  viewfinderFrame: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 320,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#ffffff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 10,
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  guideText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: '#ffffff',
  },
  bottomSafeArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
  },
  sideActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    gap: 4,
  },
  sideActionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
  },
  // Permission styles
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionTopBar: {
    padding: Spacing.lg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  permissionIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    height: 48,
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  permissionBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
  permissionCancelBtn: {
    paddingVertical: 10,
  },
  permissionCancelText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
});
