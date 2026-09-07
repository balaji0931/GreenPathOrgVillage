import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';

type TokenProvider = {
  getAccessToken: () => string | null;
  refreshTokens?: () => Promise<boolean>;
};

let tokenProvider: TokenProvider | null = null;

export function setUploadTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

/**
 * Retrieve an existing access token, or proactively refresh if null
 * (e.g. app launched offline and then regained network).
 */
async function getOrRefreshToken(): Promise<string | null> {
  if (!tokenProvider) return null;
  let token = tokenProvider.getAccessToken();
  if (!token && tokenProvider.refreshTokens) {
    try {
      const refreshed = await tokenProvider.refreshTokens();
      if (refreshed) {
        token = tokenProvider.getAccessToken();
      }
    } catch {
      // Ignore network errors during refresh attempt
    }
  }
  return token;
}

/**
 * Upload a photo file to the server.
 * Uses native FileSystem.uploadAsync instead of fetch + FormData to prevent
 * "Unsupported FormDataPart implementation" errors on modern React Native / Android.
 * @param uri - Local file URI (from camera or image picker)
 * @returns The uploaded photo URL
 */
export async function uploadPhoto(uri: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = await getOrRefreshToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.uploadPhoto}`;
  let response = await FileSystem.uploadAsync(uploadUrl, uri, {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers,
    mimeType: 'image/jpeg',
  });

  // If 401 and refresh is available, refresh and retry upload once
  if (response.status === 401 && tokenProvider?.refreshTokens) {
    const refreshed = await tokenProvider.refreshTokens().catch(() => false);
    if (refreshed) {
      const newToken = tokenProvider.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      response = await FileSystem.uploadAsync(uploadUrl, uri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers,
        mimeType: 'image/jpeg',
      });
    }
  }

  if (response.status < 200 || response.status >= 300) {
    let errorMsg = `Upload failed (status ${response.status})`;
    try {
      const parsed = JSON.parse(response.body);
      if (parsed.message) {
        errorMsg = parsed.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  const result = JSON.parse(response.body);
  return result.url;
}

/**
 * Upload a voice recording to the server.
 * Uses native FileSystem.uploadAsync for reliable native binary streaming.
 * @param uri - Local file URI (from audio recorder)
 * @returns The uploaded voice URL
 */
export async function uploadVoice(uri: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = await getOrRefreshToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.uploadVoice}`;
  let response = await FileSystem.uploadAsync(uploadUrl, uri, {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers,
    mimeType: 'audio/m4a',
  });

  // If 401 and refresh is available, refresh and retry upload once
  if (response.status === 401 && tokenProvider?.refreshTokens) {
    const refreshed = await tokenProvider.refreshTokens().catch(() => false);
    if (refreshed) {
      const newToken = tokenProvider.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      response = await FileSystem.uploadAsync(uploadUrl, uri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers,
        mimeType: 'audio/m4a',
      });
    }
  }

  if (response.status < 200 || response.status >= 300) {
    let errorMsg = `Voice upload failed (status ${response.status})`;
    try {
      const parsed = JSON.parse(response.body);
      if (parsed.message) {
        errorMsg = parsed.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  const result = JSON.parse(response.body);
  return result.url;
}

