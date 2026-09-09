/**
 * Common Subscription API for GreenPath Mobile
 *
 * Checks active subscription status for a village.
 * Used by all role dashboards (Collector, Field Worker, Manager, etc.)
 * to determine service tiers, grace periods, and read-only blocks.
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';

export type SubscriptionState =
  | 'active'
  | 'warning_30'
  | 'warning_15'
  | 'warning_10'
  | 'warning_7'
  | 'grace'
  | 'expired'
  | 'loading'
  | 'no_subscription';

export interface ActiveSubscriptionResponse {
  id: number;
  villageId: string;
  startDate: string;
  endDate: string;
  gracePeriodDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchActiveSubscription(villageId: string): Promise<ActiveSubscriptionResponse | null> {
  try {
    return await apiRequest<ActiveSubscriptionResponse>(API_ENDPOINTS.activeSubscription(villageId));
  } catch (err: any) {
    if (err?.status === 404) {
      return null;
    }
    throw err;
  }
}
