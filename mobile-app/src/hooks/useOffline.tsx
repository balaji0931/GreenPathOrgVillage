import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '@/services/ApiService';
import { OfflineCollection, OfflineFile, CollectionForm } from '@/types';

interface OfflineContextType {
  isOnline: boolean;
  pendingCollections: OfflineCollection[];
  pendingFiles: OfflineFile[];
  storeOfflineCollection: (data: CollectionForm) => Promise<void>;
  storeOfflineFile: (uri: string, type: 'photo' | 'voice') => Promise<string>;
  syncOfflineData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCollections, setPendingCollections] = useState<OfflineCollection[]>([]);
  const [pendingFiles, setPendingFiles] = useState<OfflineFile[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        syncOfflineData();
      }
    });

    loadOfflineData();

    return () => unsubscribe();
  }, []);

  const loadOfflineData = async () => {
    try {
      const [collectionsData, filesData] = await Promise.all([
        AsyncStorage.getItem('offlineCollections'),
        AsyncStorage.getItem('offlineFiles'),
      ]);

      if (collectionsData) {
        setPendingCollections(JSON.parse(collectionsData));
      }
      if (filesData) {
        setPendingFiles(JSON.parse(filesData));
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const storeOfflineCollection = async (data: CollectionForm) => {
    try {
      const collection: OfflineCollection = {
        id: `offline_${Date.now()}`,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      const updated = [...pendingCollections, collection];
      setPendingCollections(updated);
      await AsyncStorage.setItem('offlineCollections', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store offline collection:', error);
      throw error;
    }
  };

  const storeOfflineFile = async (uri: string, type: 'photo' | 'voice'): Promise<string> => {
    try {
      const file: OfflineFile = {
        id: `offline_file_${Date.now()}`,
        uri,
        type,
        timestamp: Date.now(),
        synced: false,
      };

      const updated = [...pendingFiles, file];
      setPendingFiles(updated);
      await AsyncStorage.setItem('offlineFiles', JSON.stringify(updated));
      
      return file.id;
    } catch (error) {
      console.error('Failed to store offline file:', error);
      throw error;
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline) return;

    try {
      // Sync collections
      const collectionsToSync = pendingCollections.filter(c => !c.synced);
      for (const collection of collectionsToSync) {
        try {
          const response = await apiService.createCollection(collection.data);
          if (response.success) {
            // Mark as synced
            const updated = pendingCollections.map(c =>
              c.id === collection.id ? { ...c, synced: true } : c
            );
            setPendingCollections(updated);
            await AsyncStorage.setItem('offlineCollections', JSON.stringify(updated));
          }
        } catch (error) {
          console.error('Failed to sync collection:', collection.id, error);
        }
      }

      // Sync files
      const filesToSync = pendingFiles.filter(f => !f.synced);
      for (const file of filesToSync) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            type: file.type === 'photo' ? 'image/jpeg' : 'audio/m4a',
            name: `${file.type}_${file.id}`,
          } as any);
          formData.append('type', file.type);

          const response = await apiService.uploadCollectionFile(formData);
          if (response.success) {
            // Mark as synced
            const updated = pendingFiles.map(f =>
              f.id === file.id ? { ...f, synced: true } : f
            );
            setPendingFiles(updated);
            await AsyncStorage.setItem('offlineFiles', JSON.stringify(updated));
          }
        } catch (error) {
          console.error('Failed to sync file:', file.id, error);
        }
      }

      // Clean up synced items older than 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const filteredCollections = pendingCollections.filter(
        c => !c.synced || c.timestamp > cutoff
      );
      const filteredFiles = pendingFiles.filter(
        f => !f.synced || f.timestamp > cutoff
      );

      if (filteredCollections.length !== pendingCollections.length) {
        setPendingCollections(filteredCollections);
        await AsyncStorage.setItem('offlineCollections', JSON.stringify(filteredCollections));
      }

      if (filteredFiles.length !== pendingFiles.length) {
        setPendingFiles(filteredFiles);
        await AsyncStorage.setItem('offlineFiles', JSON.stringify(filteredFiles));
      }
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  };

  const clearOfflineData = async () => {
    try {
      setPendingCollections([]);
      setPendingFiles([]);
      await AsyncStorage.multiRemove(['offlineCollections', 'offlineFiles']);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const value: OfflineContextType = {
    isOnline,
    pendingCollections,
    pendingFiles,
    storeOfflineCollection,
    storeOfflineFile,
    syncOfflineData,
    clearOfflineData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};