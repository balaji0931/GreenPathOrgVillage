/**
 * Upload API for GreenPath Mobile
 *
 * Uses native FileSystem.uploadAsync for reliable binary streaming
 * (avoids React Native FormData issues).
 *
 * Design principles:
 * - Proactively refresh token before upload if expired.
 * - Distinguish network errors from server errors.
 * - Never trigger a logout from upload failures — let the auth layer handle that.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { NetworkError } from './client';

type TokenProvider = {
  getAccessToken: () => string | null;
  refreshTokens?: () => Promise<boolean>;
};

let tokenProvider: TokenProvider | null = null;

export function setUploadTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

/**
 * Retrieve an existing access token, or proactively refresh if expired/null.
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
      // Network error during refresh — proceed without token.
      // The upload will fail and be retried by the sync engine.
    }
  }
  return token;
}

/**
 * Set auth headers on the given headers object.
 */
function setAuthHeaders(headers: Record<string, string>, token: string): void {
  headers['Authorization'] = `Bearer ${token}`;
  headers['X-Mobile-Token'] = token;
}

/**
 * Wrapper around FileSystem.uploadAsync that converts network-level errors
 * into NetworkError for consistent error handling.
 */
async function safeUpload(
  url: string,
  uri: string,
  options: FileSystem.FileSystemUploadOptions,
): Promise<FileSystem.FileSystemUploadResult> {
  try {
    return await FileSystem.uploadAsync(url, uri, options);
  } catch (err: any) {
    throw new NetworkError(
      err?.message || 'Upload failed — check your internet connection'
    );
  }
}

/**
 * Upload a photo file to the server.
 * @param uri - Local file URI (from camera or image picker)
 * @returns The uploaded photo URL
 */
export async function uploadPhoto(uri: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = await getOrRefreshToken();
  if (token) {
    setAuthHeaders(headers, token);
  }

  const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.uploadPhoto}`;
  const uploadOptions: FileSystem.FileSystemUploadOptions = {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers,
    mimeType: 'image/jpeg',
  };

  let response = await safeUpload(uploadUrl, uri, uploadOptions);

  // If 401, refresh token and retry once
  if (response.status === 401 && tokenProvider?.refreshTokens) {
    const refreshed = await tokenProvider.refreshTokens().catch(() => false);
    if (refreshed) {
      const newToken = tokenProvider.getAccessToken();
      if (newToken) {
        setAuthHeaders(headers, newToken);
      }
      response = await safeUpload(uploadUrl, uri, uploadOptions);
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
 * @param uri - Local file URI (from audio recorder)
 * @returns The uploaded voice URL
 */
export async function uploadVoice(uri: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = await getOrRefreshToken();
  if (token) {
    setAuthHeaders(headers, token);
  }

  const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.uploadVoice}`;
  const uploadOptions: FileSystem.FileSystemUploadOptions = {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers,
    mimeType: 'audio/m4a',
  };

  let response = await safeUpload(uploadUrl, uri, uploadOptions);

  // If 401, refresh token and retry once
  if (response.status === 401 && tokenProvider?.refreshTokens) {
    const refreshed = await tokenProvider.refreshTokens().catch(() => false);
    if (refreshed) {
      const newToken = tokenProvider.getAccessToken();
      if (newToken) {
        setAuthHeaders(headers, newToken);
      }
      response = await safeUpload(uploadUrl, uri, uploadOptions);
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
