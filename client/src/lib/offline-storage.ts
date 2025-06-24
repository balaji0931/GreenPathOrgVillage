
// Offline storage utilities for handling data when offline
import React from 'react';

export interface OfflineCollection {
  id?: string;
  householdUid: string;
  status: string;
  segregationRating: number;
  plasticRating: number;
  observations: string[];
  remarks: string;
  photoFileId?: string;
  voiceFileId?: string;
  missedReason?: string;
  collectionDate: string;
  collectionTime: string;
  timestamp?: number;
}

export interface OfflineFile {
  id?: string;
  type: 'photo' | 'voice';
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64
  timestamp: number;
}

class OfflineStorageManager {
  private serviceWorkerReady: Promise<ServiceWorkerRegistration>;

  constructor() {
    this.serviceWorkerReady = navigator.serviceWorker.ready;
  }

  // Store collection data offline
  async storeOfflineCollection(collectionData: OfflineCollection): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const registration = await this.serviceWorkerReady;
      if (!registration.active) {
        throw new Error('Service worker not active');
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        registration.active.postMessage(
          { type: 'STORE_OFFLINE_COLLECTION', data: collectionData },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to store offline collection:', error);
      return { success: false, error: error.message };
    }
  }

  // Store file offline
  async storeOfflineFile(file: File, type: 'photo' | 'voice'): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const registration = await this.serviceWorkerReady;
      if (!registration.active) {
        throw new Error('Service worker not active');
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        registration.active.postMessage(
          { type: 'STORE_OFFLINE_FILE', data: { file, type } },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to store offline file:', error);
      return { success: false, error: error.message };
    }
  }

  // Get pending collections count
  async getPendingCollections(): Promise<{ success: boolean; data?: OfflineCollection[]; error?: string }> {
    try {
      const registration = await this.serviceWorkerReady;
      if (!registration.active) {
        return { success: true, data: [] };
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        registration.active.postMessage(
          { type: 'GET_PENDING_COLLECTIONS' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to get pending collections:', error);
      return { success: false, error: error.message };
    }
  }

  // Force sync when back online
  async forceSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const registration = await this.serviceWorkerReady;
      if (!registration.active) {
        throw new Error('Service worker not active');
      }

      // Try background sync first
      if ('sync' in registration) {
        await registration.sync.register('sync-offline-collections');
      }

      // Also force immediate sync
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        registration.active.postMessage(
          { type: 'FORCE_SYNC' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to force sync:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen for sync events
  listenForSyncEvents(callback: (event: { type: string; data: any }) => void) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'COLLECTION_SYNCED') {
          callback(event.data);
        }
      });
    }
  }
}

export const offlineStorage = new OfflineStorageManager();

// Hook for React components
export function useOfflineStorage() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [pendingCount, setPendingCount] = React.useState(0);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Force sync when back online
      offlineStorage.forceSync();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events
    offlineStorage.listenForSyncEvents((event) => {
      if (event.type === 'COLLECTION_SYNCED') {
        updatePendingCount();
      }
    });

    // Initial pending count check
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const result = await offlineStorage.getPendingCollections();
    if (result.success && result.data) {
      setPendingCount(result.data.length);
    }
  };

  const storeCollectionOffline = async (collectionData: OfflineCollection) => {
    const result = await offlineStorage.storeOfflineCollection(collectionData);
    if (result.success) {
      updatePendingCount();
    }
    return result;
  };

  const storeFileOffline = async (file: File, type: 'photo' | 'voice') => {
    return await offlineStorage.storeOfflineFile(file, type);
  };

  const syncPendingData = async () => {
    const result = await offlineStorage.forceSync();
    if (result.success) {
      updatePendingCount();
    }
    return result;
  };

  return {
    isOnline,
    pendingCount,
    storeCollectionOffline,
    storeFileOffline,
    syncPendingData,
    updatePendingCount
  };
}
