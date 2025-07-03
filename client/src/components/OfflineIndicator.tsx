import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineFeatures, setShowOfflineFeatures] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[PWA] Back online - syncing data...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[PWA] Gone offline - switching to offline mode...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check connection status by trying to fetch
    const checkConnection = async () => {
      try {
        const response = await fetch('/manifest.json', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        // Any response means we're online
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    // Check connection immediately and then every 30 seconds
    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium text-sm">
              🔄 Offline Mode - App working without internet
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30 text-xs"
              onClick={() => setShowOfflineFeatures(!showOfflineFeatures)}
            >
              {showOfflineFeatures ? 'Hide Details' : 'Show Features'}
            </Badge>
          </div>
        </div>
        
        {showOfflineFeatures && (
          <div className="mt-3 pb-1 text-sm space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg p-2">
                <div className="font-semibold text-xs mb-1">✅ Available Offline:</div>
                <ul className="text-xs space-y-0.5 opacity-90">
                  <li>• View cached household data</li>
                  <li>• Record waste collections</li>
                  <li>• Take photos and voice notes</li>
                  <li>• Navigate all app sections</li>
                </ul>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <div className="font-semibold text-xs mb-1">🔄 Auto-sync when online:</div>
                <ul className="text-xs space-y-0.5 opacity-90">
                  <li>• Upload new collections</li>
                  <li>• Sync photos to cloud</li>
                  <li>• Get latest announcements</li>
                  <li>• Update household status</li>
                </ul>
              </div>
            </div>
            <div className="text-center text-xs opacity-75 mt-2">
              All data is safely stored locally and will sync automatically when connection is restored
            </div>
          </div>
        )}
      </div>
    </div>
  );
}