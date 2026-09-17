/**
 * GreenPath Village Manager — Sticker Card Preview Modal
 *
 * Provides a high-fidelity, real-time preview of the physical sticker card
 * before printing or sharing, matching the exact A4 cut dimensions.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { LOGO_BASE64 } from '../../../constants/logo-base64';
import {
  generateQrSvg,
  getScannableUid,
  getDisplayUid,
  resolveUnitLabel,
} from '../../../utils/qr-matrix';

interface QrCardPreviewModalProps {
  visible: boolean;
  uid: string;
  batchId?: string;
  unitType?: string;
  onClose: () => void;
  onShareBatch?: () => void;
  isSharing?: boolean;
}

export function QrCardPreviewModal({
  visible,
  uid,
  batchId,
  unitType,
  onClose,
  onShareBatch,
  isSharing = false,
}: QrCardPreviewModalProps) {
  if (!visible || !uid) return null;

  const unitLabel = resolveUnitLabel(unitType);
  const scannableUid = getScannableUid(uid);
  const displayUid = getDisplayUid(uid);

  // Generate clean scalable vector QR SVG
  const qrSvg = generateQrSvg(scannableUid, {
    margin: 1,
    cellSize: 5,
    errorCorrection: 'H',
    scalable: true,
  });

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 10px;
        }
        .card {
          width: 100%;
          max-width: 260px;
          height: 360px;
          background: #ffffff;
          border: 1.5px dashed #94a3b8;
          border-radius: 12px;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .logo-box {
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-img {
          max-height: 34px;
          max-width: 150px;
          object-fit: contain;
        }
        .subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .qr-box {
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0;
        }
        .qr-box svg {
          width: 150px;
          height: 150px;
          display: block;
        }
        .uid-tag {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 2px;
        }
        .uid-bold {
          font-weight: 900;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #047857;
        }
        .footer-note {
          font-size: 10px;
          color: #64748b;
        }
        .footer-url {
          font-size: 12px;
          font-weight: 800;
          color: #059669;
          letter-spacing: 0.4px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-box">
          <img src="${LOGO_BASE64}" class="logo-img" alt="GreenPath" />
        </div>
        <div class="subtitle">Waste Management System</div>
        <div class="qr-box">
          ${qrSvg}
        </div>
        <div class="uid-tag">${unitLabel} UID: <span class="uid-bold">${displayUid}</span></div>
        <div class="footer-note">Login & manage at:</div>
        <div class="footer-url">www.greenpathindia.in</div>
      </div>
    </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Physical Sticker Preview</Text>
              {batchId && (
                <Text style={styles.headerSubtitle}>
                  Batch {batchId} • Standard A4 (3×3 Grid)
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={Colors.slate600} />
            </TouchableOpacity>
          </View>

          {/* Sticker Preview Container */}
          <View style={styles.previewContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={styles.webView}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* Sticker Guide Callout */}
          <View style={styles.guideBox}>
            <Ionicons name="cut-outline" size={16} color={Colors.emerald700} />
            <Text style={styles.guideText}>
              Stickers print 9 per A4 sheet with dashed scissor cut guides. Compatible with pre-cut thermal labels and adhesive sheets.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.secondaryButton}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Close Preview</Text>
            </TouchableOpacity>

            {onShareBatch && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onShareBatch();
                }}
                disabled={isSharing}
                style={[styles.primaryButton, isSharing && styles.primaryButtonDisabled]}
                activeOpacity={0.8}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={16} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Share Sheet</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: '100%',
    height: 380,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  guideBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  guideText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.emerald700,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  primaryButton: {
    flex: 1.5,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.emerald600,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});

