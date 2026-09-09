/**
 * QR Scanner Modal — Common Component
 *
 * Native camera QR scanner using expo-camera CameraView.
 * Works completely offline (local barcode decoding).
 * Accessible across all role dashboards (Collector, Field Worker, Manager, etc.).
 *
 * Handles QR payload formats:
 * 1. {"uid":"HH-VLG001-0042","type":"household"} — standard
 * 2. {"uid":"HH-VLG001-0042","type":"premapped"} — field worker mapped
 * 3. {"type":"attendance","token":"..."} — shift attendance
 * 4. Raw UID string fallback (e.g. "V001-HH0042" or "V001-QR0042")
 */
import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Modal } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export type ScanResult =
  | { kind: 'household'; uid: string }
  | { kind: 'attendance'; token: string }
  | { kind: 'invalid' };

export interface QRScannerModalProps {
  visible: boolean;
  onScan: (result: ScanResult) => void;
  onClose: () => void;
  scanMode?: 'household' | 'attendance' | 'all';
}

function parseScannedCode(rawString: string): ScanResult {
  try {
    const json = JSON.parse(rawString);

    // Attendance QR
    if (json.type === 'attendance' && json.token) {
      return { kind: 'attendance', token: json.token };
    }

    // Household QR (standard or premapped)
    if (json.uid && (json.type === 'household' || json.type === 'premapped')) {
      return { kind: 'household', uid: json.uid };
    }

    // Fallback JSON with UID
    if (json.uid) {
      return { kind: 'household', uid: json.uid };
    }
  } catch {
    // Raw string fallback (non-JSON QR containing UID directly)
    if (rawString.trim()) {
      return { kind: 'household', uid: rawString.trim() };
    }
  }

  return { kind: 'invalid' };
}

export function QRScannerModal({ visible, onScan, onClose, scanMode = 'all' }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const handleBarCodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanLockRef.current) return;
      scanLockRef.current = true;

      const parsed = parseScannedCode(result.data);

      // Filter by scan mode
      if (scanMode === 'household' && parsed.kind !== 'household') {
        scanLockRef.current = false;
        return;
      }
      if (scanMode === 'attendance' && parsed.kind !== 'attendance') {
        scanLockRef.current = false;
        return;
      }

      if (parsed.kind === 'invalid') {
        scanLockRef.current = false;
        return;
      }

      onScan(parsed);
      // Reset lock after a delay to prevent rapid re-fires
      setTimeout(() => { scanLockRef.current = false; }, 2000);
    },
    [onScan, scanMode],
  );

  const handleClose = () => {
    scanLockRef.current = false;
    onClose();
  };

  if (!visible) return null;

  // Permission not granted yet
  if (!permission?.granted) {
    const canAsk = permission?.canAskAgain !== false;
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={48} color={Colors.emerald600} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              {canAsk
                ? 'Camera access is needed to scan QR codes.'
                : 'Camera access was denied. Please enable it in your device Settings.'}
            </Text>
            {canAsk ? (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderArea}>
            <View style={styles.viewfinder}>
              {/* Corner decorations */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          {/* Bottom hint */}
          <View style={styles.hintArea}>
            <Text style={styles.hintText}>
              {scanMode === 'attendance'
                ? 'Point camera at the attendance QR code'
                : 'Point camera at QR code'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const VIEWFINDER_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  viewfinderArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.emerald600,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  hintArea: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hintText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.white,
    textAlign: 'center',
  },
  // Permission screen
  permissionContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    zIndex: 100,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilySemiBold,
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
  permissionButton: {
    width: '100%',
    height: 44,
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
});
