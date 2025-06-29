
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
  "/manifest.json",
  "/index.html",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png"
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

// Install event - cache static assets and initialize DB
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[Service Worker] Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("[Service Worker] Failed to cache some assets:", error);
          return Promise.resolve();
        });
      }),
      initOfflineDB()
    ]).then(() => {
      console.log("[Service Worker] Installation complete");
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

// Fetch event - implement caching strategies and offline handling
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default fetch
  event.respondWith(fetch(request));
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
        } else {
          console.error(`[Service Worker] Failed to sync collection: ${collection.id}`, response.status);
        }

      } catch (error) {
        console.error(`[Service Worker] Error syncing collection ${collection.id}:`, error);
      }
    }

    console.log("[Service Worker] Offline collections sync completed");
  } catch (error) {
    console.error("[Service Worker] Background sync failed:", error);
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
        await syncOfflineCollections();
        event.ports[0].postMessage({ success: true });
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
