/**
 * GreenPath Village Manager — Public File Storage Service
 *
 * Saves exported documents (PDFs, KML, CSV) directly to the user's
 * publicly accessible device storage:
 * - Android: Uses Storage Access Framework (SAF) to save straight into
 *   the public Downloads folder. Prompts once for folder selection, then
 *   automatically writes all future exports without extra clicks.
 * - iOS: Relies on UIFileSharingEnabled / LSSupportsOpeningDocumentsInPlace
 *   in app.json, which makes FileSystem.documentDirectory directly visible
 *   in the native iOS Files app (under "On My iPhone > GreenPath").
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const SAF_STORAGE_KEY = 'greenpath_saf_downloads_dir_uri';

export interface PublicSaveResult {
  success: boolean;
  publicUri?: string;
  savedToDownloads?: boolean;
  message?: string;
}

/**
 * Reset the saved Downloads folder permission (if user wants to change destination).
 */
export async function resetPublicFolderPermission(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SAF_STORAGE_KEY);
  } catch (err) {
    console.warn('[PublicStorage] Failed to reset folder permission:', err);
  }
}

/**
 * Save a locally generated file into public device storage.
 */
export async function saveFileToPublicDeviceStorage(options: {
  localUri: string;
  fileName: string;
  mimeType?: string;
}): Promise<PublicSaveResult> {
  const { localUri, fileName, mimeType = 'application/pdf' } = options;

  // ── iOS: Files app automatic visibility ───────────────────────
  if (Platform.OS === 'ios') {
    // With UIFileSharingEnabled: true and LSSupportsOpeningDocumentsInPlace: true in app.json,
    // any file in FileSystem.documentDirectory is automatically visible in the Files app.
    return {
      success: true,
      publicUri: localUri,
      savedToDownloads: true,
      message: 'Visible in iOS Files app under "On My iPhone > GreenPath"',
    };
  }

  // ── Android: Storage Access Framework (SAF) ───────────────────
  if (Platform.OS === 'android') {
    try {
      const { StorageAccessFramework } = FileSystem;
      if (!StorageAccessFramework) {
        return { success: false, message: 'SAF not available on this device' };
      }

      let directoryUri = await SecureStore.getItemAsync(SAF_STORAGE_KEY);

      // If no directory saved, request permission once
      if (!directoryUri) {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted || !permission.directoryUri) {
          return {
            success: false,
            message: 'Permission not granted to save to Downloads',
          };
        }
        directoryUri = permission.directoryUri;
        await SecureStore.setItemAsync(SAF_STORAGE_KEY, directoryUri);
      }

      // Read source file as base64
      const base64Data = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create file in the selected directory
      let publicFileUri: string;
      try {
        publicFileUri = await StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          mimeType
        );
      } catch (createErr) {
        // If directory permission became stale/revoked, ask once again
        console.warn('[PublicStorage] Stale directory URI, re-requesting permission:', createErr);
        const retryPermission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!retryPermission.granted || !retryPermission.directoryUri) {
          return {
            success: false,
            message: 'Permission not granted to save to Downloads',
          };
        }
        directoryUri = retryPermission.directoryUri;
        await SecureStore.setItemAsync(SAF_STORAGE_KEY, directoryUri);
        publicFileUri = await StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          mimeType
        );
      }

      // Write content
      await StorageAccessFramework.writeAsStringAsync(publicFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        success: true,
        publicUri: publicFileUri,
        savedToDownloads: true,
      };
    } catch (err: any) {
      console.warn('[PublicStorage] Failed to save to Android public storage:', err);
      return {
        success: false,
        message: err?.message || 'Failed to save file to public storage',
      };
    }
  }

  return { success: true, publicUri: localUri };
}
