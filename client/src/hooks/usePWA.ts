import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // Also check for iOS standalone mode
    if ('standalone' in window.navigator && (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Force set installable to true for testing on mobile devices
    // This ensures the button shows even if beforeinstallprompt hasn't fired yet
    setTimeout(() => {
      if (!isInstalled) {
        setIsInstallable(true);
      }
    }, 1000);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // Show instructions for manual installation
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let message = 'To install this app:\n';
      if (isIOS) {
        message += '1. Tap the Share button in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm';
      } else if (isAndroid) {
        message += '1. Tap the menu (⋮) in your browser\n2. Tap "Add to Home screen" or "Install app"\n3. Tap "Add" to confirm';
      } else {
        message += '1. Look for an install icon in your browser address bar\n2. Or check your browser menu for "Install" option';
      }
      
      alert(message);
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp
  };
}

// Service Worker registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Unregister any existing service workers first
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, refresh to update
              if (confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        });

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

      } catch (error) {
        // Try to register from different path as fallback
        try {
          const fallbackRegistration = await navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
          });
        } catch (fallbackError) {
        }
      }
    });
  }
}

// Push notification helpers
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    });
  }
}