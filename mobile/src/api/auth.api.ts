/**
 * Common Authentication API for GreenPath Mobile
 *
 * Auth actions that can be performed by any logged-in user
 * across all roles (Collector, Field Worker, Manager, etc.)
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Change the logged-in user's password.
 * Works for any role (calls POST /api/auth/change-password with Bearer token).
 */
export async function changePassword(newPassword: string): Promise<void> {
  return apiRequest(API_ENDPOINTS.changePassword, {
    method: 'POST',
    body: { newPassword },
  });
}
