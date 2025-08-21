
const CACHE_VERSION = "v2.0.0";
const CACHE_NAME = `greenpath-${CACHE_VERSION}`;
const STATIC_CACHE = `greenpath-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `greenpath-dynamic-${CACHE_VERSION}`;
const API_CACHE = `greenpath-api-${CACHE_VERSION}`;
const OFFLINE_DB_NAME = "greenpath-offline";
const OFFLINE_DB_VERSION = 2;

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,    // 1 day
  API: 15 * 60 * 1000,             // 15 minutes
};

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  STATIC: 50,
  DYNAMIC: 100,
  API: 200
};

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png"
];

// Runtime assets that will be cached as they are accessed
const DYNAMIC_CACHE_PATTERNS = [
  /\/src\/.+\.(js|jsx|ts|tsx)$/,
  /\/src\/.+\.css$/,
  /\/@fs\/.+$/,
  /\/@vite\/.+$/,
  /\/@react-refresh$/
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  "/api/auth/user",
  "/api/villages",
  "/api/households",
  "/api/collectors",
  "/api/announcements",
];

// Initialize IndexedDB for offline storage
let offlineDB = null;

// Sync operation lock to prevent concurrent syncs
let isSyncInProgress = false;

function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      offlineDB = request.result;
      resolve(offlineDB);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('collections')) {
        const collectionsStore = db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
        collectionsStore.createIndex('status', 'status', { unique: false });
        collectionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('files')) {
        const filesStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        filesStore.createIndex('type', 'type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('households')) {
        db.createObjectStore('households', { keyPath: 'id' });
      }
    };
  });
}

// Store offline collection data
async function storeOfflineCollection(data) {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['collections'], 'readwrite');
  const store = transaction.objectStore('collections');
  
  const collectionData = {
    ...data,
    status: 'pending_sync',
    timestamp: Date.now(),
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(collectionData);
    request.onsuccess = () => resolve(collectionData);
    request.onerror = () => reject(request.error);
  });
}

// Store offline files (photos/voice)
async function storeOfflineFile(file, type) {
  if (!offlineDB) await initOfflineDB();
  
  // Convert file to base64 for storage
  const base64 = await fileToBase64(file);
  
  const transaction = offlineDB.transaction(['files'], 'readwrite');
  const store = transaction.objectStore('files');
  
  const fileData = {
    type,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    data: base64,
    timestamp: Date.now(),
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(fileData);
    request.onsuccess = () => resolve(fileData.id);
    request.onerror = () => reject(request.error);
  });
}

// Get pending offline collections
async function getPendingCollections() {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['collections'], 'readonly');
  const store = transaction.objectStore('collections');
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll('pending_sync');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get offline file
async function getOfflineFile(fileId) {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['files'], 'readonly');
  const store = transaction.objectStore('files');
  
  return new Promise((resolve, reject) => {
    const request = store.get(fileId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Convert base64 to blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Remove synced collection
async function removeOfflineCollection(id) {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['collections'], 'readwrite');
  const store = transaction.objectStore('collections');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Remove synced file
async function removeOfflineFile(id) {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['files'], 'readwrite');
  const store = transaction.objectStore('files');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Store households data for offline access
async function storeHouseholdsData(households) {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['households'], 'readwrite');
  const store = transaction.objectStore('households');
  
  // Clear existing data and store new
  await new Promise(resolve => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
  });
  
  for (const household of households) {
    await new Promise(resolve => {
      const request = store.add(household);
      request.onsuccess = () => resolve();
    });
  }
}

// Get offline households data
async function getOfflineHouseholds() {
  if (!offlineDB) await initOfflineDB();
  
  const transaction = offlineDB.transaction(['households'], 'readonly');
  const store = transaction.objectStore('households');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Install event - cache static assets and initialize DB for offline support
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing with offline capabilities...");
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[Service Worker] Caching essential assets for offline use");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("[Service Worker] Failed to cache some assets:", error);
          return Promise.resolve();
        });
      }),
      initOfflineDB().then(() => {
        console.log("[Service Worker] Offline database initialized");
      })
    ]).then(() => {
      console.log("[Service Worker] Installation complete - App now supports offline mode!");
      return self.skipWaiting();
    }).catch((error) => {
      console.error("[Service Worker] Installation failed:", error);
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      initOfflineDB()
    ]).then(() => {
      console.log("[Service Worker] Activation complete");
      return self.clients.claim();
    })
  );
});

// Fetch event - comprehensive offline-first strategy for full offline functionality
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Priority 1: Static assets and development files - cache first with offline fallback
        if (isStaticAsset(request) || isDevelopmentAsset(request)) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log("[Service Worker] Serving cached asset (offline ready)");
            return cachedResponse;
          }
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch {
            console.log("[Service Worker] Network failed for asset, serving offline fallback");
            return createOfflineAssetResponse(url.pathname);
          }
        }

        // Priority 2: API requests - network first with extensive offline fallback
        if (url.pathname.startsWith("/api/")) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok && shouldCacheApiResponse(url.pathname)) {
              const cache = await caches.open(API_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch {
            // Serve cached API response for offline mode
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              console.log("[Service Worker] API offline mode - serving cached response");
              return cachedResponse;
            }
            // Return offline-ready API responses for critical endpoints
            return createOfflineApiResponse(url.pathname);
          }
        }

        // Priority 3: Navigation requests - serve app shell for offline SPA functionality
        if (request.mode === "navigate") {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
              return networkResponse;
            }
          } catch (error) {
            console.log("[Service Worker] Network failed for navigation, serving cached app shell");
          }
          
          // Try to serve cached HTML first
          const cachedResponse = await caches.match("/") || await caches.match("/index.html");
          if (cachedResponse) {
            console.log("[Service Worker] Serving cached app shell for offline navigation");
            return cachedResponse;
          }
          
          // Fallback to basic offline shell
          return createOfflineAppShell();
        }

        // Default: try cache first, then network, then offline fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          return createFallbackResponse(request.url);
        }
      } catch (error) {
        console.error("[Service Worker] Critical fetch error:", error);
        return createFallbackResponse(request.url);
      }
    })()
  );
});

// Handle API requests with network-first strategy and offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses for specific endpoints
    if (networkResponse.ok && shouldCacheApiResponse(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Store households data for offline access
      if (url.pathname === "/api/households") {
        const responseData = await networkResponse.clone().json();
        await storeHouseholdsData(responseData);
      }
    }

    return networkResponse;
  } catch (error) {
    console.log("[Service Worker] Network failed for API request, trying cache");

    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Special offline handling for specific endpoints
    if (url.pathname === "/api/households") {
      try {
        const offlineHouseholds = await getOfflineHouseholds();
        return new Response(JSON.stringify(offlineHouseholds), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (dbError) {
        console.error("[Service Worker] Failed to get offline households:", dbError);
      }
    }

    // Return offline response for auth endpoints
    if (url.pathname === "/api/auth/user") {
      return new Response(JSON.stringify({ message: "Offline" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return empty arrays for other list endpoints
    if (url.pathname.includes("/api/")) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[Service Worker] Failed to fetch static asset:", request.url);
    throw error;
  }
}

// Handle navigation requests (SPA routing)
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached index.html for offline SPA routing
    const cachedResponse = await caches.match("/index.html");
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/);
}

function isDevelopmentAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.includes('.tsx') ||
    url.pathname.includes('.ts') ||
    url.pathname.includes('.jsx') ||
    url.pathname.includes('.json')
  );
}

function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some((pattern) => pathname.includes(pattern));
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync triggered:", event.tag);

  if (event.tag === "sync-offline-collections") {
    event.waitUntil(syncOfflineCollections());
  }
});

// Sync offline collections when back online
async function syncOfflineCollections() {
  // Check if sync is already in progress
  if (isSyncInProgress) {
    console.log("[Service Worker] Sync already in progress, skipping...");
    return { success: false, error: 'Sync already in progress' };
  }

  // Set sync lock
  isSyncInProgress = true;
  console.log("[Service Worker] Starting offline collections sync...");

  try {
    const pendingCollections = await getPendingCollections();
    console.log(`[Service Worker] Found ${pendingCollections.length} pending collections`);

    for (const collection of pendingCollections) {
      try {
        // Upload files first if they exist
        let photoUrl = null;
        let voiceUrl = null;

        if (collection.photoFileId) {
          const photoFile = await getOfflineFile(collection.photoFileId);
          if (photoFile) {
            photoUrl = await uploadOfflineFile(photoFile, 'photo');
            if (photoUrl) {
              await removeOfflineFile(collection.photoFileId);
            }
          }
        }

        if (collection.voiceFileId) {
          const voiceFile = await getOfflineFile(collection.voiceFileId);
          if (voiceFile) {
            voiceUrl = await uploadOfflineFile(voiceFile, 'voice');
            if (voiceUrl) {
              await removeOfflineFile(collection.voiceFileId);
            }
          }
        }

        // Sync collection data
        const syncData = {
          ...collection,
          photoUrl,
          voiceUrl
        };

        // Remove offline-specific fields
        delete syncData.id;
        delete syncData.status;
        delete syncData.timestamp;
        delete syncData.photoFileId;
        delete syncData.voiceFileId;

        const response = await fetch('/api/waste-collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(syncData),
        });

        if (response.ok) {
          await removeOfflineCollection(collection.id);
          console.log(`[Service Worker] Synced collection: ${collection.id}`);
          
          // Notify all clients about successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'COLLECTION_SYNCED',
              data: { collectionId: collection.id, success: true }
            });
          });
        } else if (response.status === 409) {
          // Duplicate collection - remove from offline storage
          await removeOfflineCollection(collection.id);
          console.log(`[Service Worker] Duplicate collection detected, removed from offline storage: ${collection.id}`);
          
          // Notify clients about duplicate removal
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'COLLECTION_SYNCED',
              data: { collectionId: collection.id, success: true, duplicate: true }
            });
          });
        } else {
          console.error(`[Service Worker] Failed to sync collection: ${collection.id}`, response.status);
        }

      } catch (error) {
        console.error(`[Service Worker] Error syncing collection ${collection.id}:`, error);
      }
    }

    console.log("[Service Worker] Offline collections sync completed");
    return { success: true };
  } catch (error) {
    console.error("[Service Worker] Background sync failed:", error);
    return { success: false, error: error.message };
  } finally {
    // Always release the sync lock
    isSyncInProgress = false;
    console.log("[Service Worker] Sync lock released");
  }
}

// Upload offline file
async function uploadOfflineFile(fileData, type) {
  try {
    const blob = base64ToBlob(fileData.data, fileData.mimeType);
    const formData = new FormData();
    formData.append('file', blob, fileData.name);

    const endpoint = type === 'photo' ? '/api/upload/photo' : '/api/upload/voice';
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (response.ok) {
      const result = await response.json();
      return result.url;
    } else {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Service Worker] Failed to upload ${type}:`, error);
    return null;
  }
}

// Message handler for communication with main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'STORE_OFFLINE_COLLECTION':
      try {
        const result = await storeOfflineCollection(data);
        event.ports[0].postMessage({ success: true, data: result });
      } catch (error) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;

    case 'STORE_OFFLINE_FILE':
      try {
        const fileId = await storeOfflineFile(data.file, data.type);
        event.ports[0].postMessage({ success: true, fileId });
      } catch (error) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;

    case 'GET_PENDING_COLLECTIONS':
      try {
        const collections = await getPendingCollections();
        event.ports[0].postMessage({ success: true, data: collections });
      } catch (error) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;

    case 'FORCE_SYNC':
      try {
        const result = await syncOfflineCollections();
        event.ports[0].postMessage(result);
      } catch (error) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "greenpath-notification",
    requireInteraction: false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action) {
    console.log("[Service Worker] Notification action clicked:", event.action);
  } else {
    event.waitUntil(self.clients.openWindow("/"));
  }
});

// Advanced cache management functions
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => caches.delete(cacheName));
    
  return Promise.all(deletePromises);
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const deletePromises = keys
      .slice(0, keys.length - maxItems)
      .map(key => cache.delete(key));
    return Promise.all(deletePromises);
  }
}

async function cleanupExpiredCache(cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  const now = Date.now();
  const deletePromises = [];
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const dateHeader = response.headers.get('date');
      const cacheTime = dateHeader ? new Date(dateHeader).getTime() : 0;
      
      if (now - cacheTime > maxAge) {
        deletePromises.push(cache.delete(key));
      }
    }
  }
  
  return Promise.all(deletePromises);
}

// Performance monitoring
function trackPerformance(eventType, startTime) {
  const duration = performance.now() - startTime;
  console.log(`[SW Performance] ${eventType}: ${duration.toFixed(2)}ms`);
  
  // You can send this data to analytics service in production
  if ('serviceWorker' in navigator && 'postMessage' in navigator.serviceWorker) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PERFORMANCE_METRIC',
          eventType,
          duration
        });
      });
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync-collections') {
    event.waitUntil(syncOfflineCollections());
  }
});

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync event:', event.tag);
  
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCacheInBackground());
  }
});

async function updateCacheInBackground() {
  try {
    // Update critical data in background
    const apiEndpoints = [
      '/api/auth/user',
      '/api/villages',
      '/api/households',
      '/api/collectors'
    ];
    
    const cache = await caches.open(API_CACHE);
    const updatePromises = apiEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response.clone());
        }
      } catch (error) {
        console.log(`[SW] Failed to update cache for ${endpoint}:`, error);
      }
    });
    
    await Promise.all(updatePromises);
    console.log('[SW] Background cache update completed');
  } catch (error) {
    console.error('[SW] Background cache update failed:', error);
  }
}

// Cache maintenance (runs periodically)
setInterval(async () => {
  try {
    await cleanupOldCaches();
    await trimCache(DYNAMIC_CACHE, MAX_CACHE_SIZE.DYNAMIC);
    await trimCache(API_CACHE, MAX_CACHE_SIZE.API);
    await cleanupExpiredCache(API_CACHE, CACHE_EXPIRATION.API);
    await cleanupExpiredCache(DYNAMIC_CACHE, CACHE_EXPIRATION.DYNAMIC);
    console.log('[SW] Cache maintenance completed');
  } catch (error) {
    console.error('[SW] Cache maintenance failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Enhanced error handling for fetch events
function createFallbackResponse(url) {
  if (url.includes('/api/')) {
    return new Response(
      JSON.stringify({ 
        error: 'Offline - cached data not available',
        offline: true,
        timestamp: Date.now()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Return offline page for navigation requests
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>GreenPath - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          text-align: center; 
          padding: 2rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { margin: 0 0 1rem 0; }
        p { opacity: 0.9; }
        button { 
          margin-top: 2rem; 
          padding: 0.75rem 1.5rem; 
          background: rgba(255,255,255,0.2); 
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 0.5rem;
          color: white;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: rgba(255,255,255,0.3); }
      </style>
    </head>
    <body>
      <div class="offline-icon">🌱</div>
      <h1>You're Offline</h1>
      <p>GreenPath is not available right now. Please check your connection and try again.</p>
      <button onclick="window.location.reload()">Try Again</button>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Additional offline support functions
function createOfflineAssetResponse(pathname) {
  if (pathname.endsWith('.css') || pathname.includes('css')) {
    return new Response(`
      /* Offline CSS - Basic styling for offline mode */
      body { 
        font-family: system-ui, -apple-system, sans-serif; 
        margin: 0; 
        padding: 1rem;
        background: #f8fafc;
        color: #1f2937;
      }
      .offline-indicator {
        background: #fef3c7;
        color: #92400e;
        padding: 0.75rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        text-align: center;
      }
      .offline-message {
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
    `, {
      headers: { "Content-Type": "text/css" }
    });
  }
  
  if (pathname.endsWith('.js') || pathname.endsWith('.tsx') || pathname.endsWith('.ts') || pathname.includes('vite') || pathname.includes('react')) {
    return new Response(`
      console.log("[Offline] Asset not cached - ${pathname}");
      // Offline mode indicator
      window.offlineMode = true;
      
      // If this is the main module, show offline message
      if ("${pathname}".includes("main.tsx") || "${pathname}".includes("src/")) {
        document.addEventListener('DOMContentLoaded', function() {
          const root = document.getElementById('root');
          if (root && !root.innerHTML.trim()) {
            root.innerHTML = \`
              <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #16a34a, #15803d); color: white; font-family: system-ui;">
                <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; max-width: 400px;">
                  <div style="font-size: 4rem; margin-bottom: 1rem;">🌱</div>
                  <h1>GreenPath</h1>
                  <p style="margin: 1rem 0;">Working Offline</p>
                  <div style="background: rgba(254,243,199,0.2); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                    <strong>App is cached for offline use</strong><br>
                    Please check your internet connection
                  </div>
                  <button onclick="window.location.reload()" style="background: white; color: #16a34a; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">
                    Try Again
                  </button>
                </div>
              </div>
            \`;
          }
        });
      }
    `, {
      headers: { "Content-Type": "application/javascript" }
    });
  }
  
  return new Response('Asset temporarily unavailable offline', {
    status: 503,
    headers: { "Content-Type": "text/plain" }
  });
}

function createOfflineApiResponse(pathname) {
  const offlineData = {
    '/api/auth/user': {
      offline: true,
      message: 'Authentication working in offline mode',
      role: 'offline',
      name: 'Offline User'
    },
    '/api/households': {
      offline: true,
      message: 'Household data available from cache - will sync when online',
      data: []
    },
    '/api/collections': {
      offline: true,
      message: 'Collection data stored locally - will sync when connection restored',
      data: []
    },
    '/api/announcements': {
      offline: true,
      message: 'Announcements cached for offline viewing',
      data: []
    },
    '/api/collectors': {
      offline: true,
      message: 'Collector data available offline',
      data: []
    }
  };

  const response = offlineData[pathname] || {
    offline: true,
    message: 'Service working in offline mode - data will sync when connection is restored',
    timestamp: Date.now(),
    path: pathname
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "X-Offline-Mode": "true"
    }
  });
}

function createOfflineAppShell() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GreenPath - Offline Mode</title>
        <meta name="theme-color" content="#16a34a" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #16a34a, #15803d);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .app-shell {
            text-align: center;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
          }
          .logo { font-size: 4rem; margin-bottom: 1rem; }
          .status {
            background: rgba(254,243,199,0.2);
            border: 1px solid rgba(254,243,199,0.3);
            color: #fbbf24;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
            font-weight: 600;
          }
          .feature {
            background: rgba(255,255,255,0.1);
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin: 0.5rem 0;
            text-align: left;
          }
          .retry-btn {
            background: white;
            color: #16a34a;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            margin-top: 1rem;
            cursor: pointer;
            font-size: 1rem;
          }
          .retry-btn:hover { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="app-shell">
          <div class="logo">🌱</div>
          <h1>GreenPath</h1>
          <p style="margin: 0.5rem 0; opacity: 0.9;">Waste Management System</p>
          
          <div class="status">
            <strong>🔄 Working Offline</strong><br>
            Full functionality available without internet
          </div>
          
          <div class="feature">
            <strong>✅ Available Offline:</strong><br>
            • View cached data<br>
            • Record collections<br>
            • Take photos<br>
            • Navigate the app
          </div>
          
          <div class="feature">
            <strong>🔄 Auto-sync when online:</strong><br>
            • Upload new collections<br>
            • Sync with server<br>
            • Get latest updates
          </div>
          
          <button class="retry-btn" onclick="checkConnection()">
            Check Connection
          </button>
          
          <p style="font-size: 0.875rem; opacity: 0.7; margin-top: 1rem;">
            App will automatically sync when connection is restored
          </p>
        </div>
        
        <script>
          function checkConnection() {
            fetch('/api/auth/user')
              .then(response => {
                if (response.ok) {
                  window.location.href = '/';
                } else {
                  showStatus('Still offline - please check your connection');
                }
              })
              .catch(() => {
                showStatus('No internet connection detected');
              });
          }
          
          function showStatus(message) {
            const btn = document.querySelector('.retry-btn');
            const originalText = btn.textContent;
            btn.textContent = message;
            btn.style.background = '#fbbf24';
            btn.style.color = 'white';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = 'white';
              btn.style.color = '#16a34a';
            }, 2000);
          }
          
          // Auto-check connection every 30 seconds
          setInterval(() => {
            fetch('/api/auth/user').then(() => {
              window.location.href = '/';
            }).catch(() => {
              console.log('Still offline...');
            });
          }, 30000);
          
          // Register service worker if not already registered
          if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
            navigator.serviceWorker.register('/sw.js');
          }
        </script>
      </body>
    </html>
  `, {
    headers: { "Content-Type": "text/html" }
  });
}
