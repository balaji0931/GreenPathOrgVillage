/**
 * Photo Capture Component
 * Native camera capture matching web collector form:
 * - Dashed border card container
 * - Captured state: green dashed border, "Photo Taken", preview thumbnail + retake button
 * - Required state: light red dashed border with warning
 * - Optional state: clean gray dashed card with camera icon
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { uploadPhoto } from '../../api/upload.api';
import { CameraCaptureModal } from './CameraCaptureModal';

interface PhotoCaptureProps {
  photoUrl: string;
  onPhotoCapture: (url: string) => void;
  required?: boolean;
  /** When true, returns local camera URI (no upload). Upload handled by sync engine. */
  localOnly?: boolean;
}

export function PhotoCapture({
  photoUrl,
  onPhotoCapture,
  required = false,
  localOnly = false,
}: PhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(photoUrl || null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  React.useEffect(() => {
    setLocalUri(photoUrl || null);
  }, [photoUrl]);

  const handlePhotoCaptured = async (uri: string) => {
    setLocalUri(uri);
    setShowCameraModal(false);

    if (localOnly) {
      onPhotoCapture(uri);
    } else {
      setIsUploading(true);
      try {
        const url = await uploadPhoto(uri);
        onPhotoCapture(url);
      } catch {
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
        setLocalUri(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOpenCapture = () => {
    setShowCameraModal(true);
  };

  const displayUri = localUri || photoUrl;

  return (
    <View style={styles.container}>
      {displayUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: displayUri }} style={styles.image} />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={Colors.white} />
              <Text style={styles.uploadText}>Uploading...</Text>
            </View>
          )}
          <View style={styles.capturedBar}>
            <View style={styles.capturedLeft}>
              <Ionicons name="checkmark-circle" size={18} color="#15803d" />
              <Text style={styles.capturedText}>Photo Taken</Text>
            </View>
            {!isUploading && (
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={handleOpenCapture}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={14} color="#047857" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.captureBox,
            required ? styles.captureBoxRequired : styles.captureBoxOptional,
          ]}
          onPress={handleOpenCapture}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.cameraIconCircle,
              required ? styles.cameraIconCircleRequired : styles.cameraIconCircleOptional,
            ]}
          >
            <Ionicons
              name="camera"
              size={24}
              color={required ? '#ef4444' : '#64748b'}
            />
          </View>
          <Text
            style={[
              styles.captureText,
              required ? styles.captureTextRequired : styles.captureTextOptional,
            ]}
          >
            {required ? 'Take Photo (Required)' : 'Take Photo'}
          </Text>
          {required && (
            <Text style={styles.requiredHint}>Required for low segregation score or village policy</Text>
          )}
        </TouchableOpacity>
      )}

      <CameraCaptureModal
        visible={showCameraModal}
        onCapture={handlePhotoCaptured}
        onClose={() => setShowCameraModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  captureBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.xl,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  captureBoxOptional: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  captureBoxRequired: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
  },
  cameraIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconCircleOptional: {
    backgroundColor: '#f1f5f9',
  },
  cameraIconCircleRequired: {
    backgroundColor: '#fee2e2',
  },
  captureText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
  },
  captureTextOptional: {
    color: '#475569',
  },
  captureTextRequired: {
    color: '#b91c1c',
  },
  requiredHint: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 2,
  },
  previewContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.xl,
    padding: 10,
    gap: 8,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.lg,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    height: 160,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.white,
  },
  capturedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  capturedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capturedText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: '#15803d',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  retakeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: '#047857',
  },
});
