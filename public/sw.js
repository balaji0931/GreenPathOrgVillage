// GreenPath Service Worker
// Rules:
//   1. Network-first everywhere — always prefer live data
//   2. Single versioned cache — keyed by build ID from build-meta.json
//   3. On deploy: new build ID = delete ALL old caches (login cookies untouched)
//   4. cache.put() replaces by URL (never duplicates)
//   5. Strict cap — cache never grows past MAX_ENTRIES
//   6. Only cache what's truly needed: app shell + static assets + collector API data
//   7. Role-aware offline: collectors get app shell, everyone else gets branded offline page

const MAX_ENTRIES = 150;
const OFFLINE_DB_NAME = "greenpath-offline";
const OFFLINE_DB_VERSION = 2;
const BUILD_META_KEY = "greenpath-build-id";

let currentCacheName = "greenpath-app"; // updated on activate from build-meta.json
let offlineDB = null;
let isSyncInProgress = false;

// -- Build ID management ------------------------------------------------

async function fetchBuildId() {
  try {
    const resp = await fetch("/build-meta.json", { cache: "no-store" });
    if (resp.ok) {
      const meta = await resp.json();
      return meta.buildId || null;
    }
  } catch { }
  return null;
}

async function getStoredBuildId() {
  try {
    // Use a tiny dedicated cache to persist the build ID
    const cache = await caches.open("greenpath-meta");
    const resp = await cache.match(BUILD_META_KEY);
    if (resp) return await resp.text();
  } catch { }
  return null;
}

async function setStoredBuildId(buildId) {
  try {
    const cache = await caches.open("greenpath-meta");
    await cache.put(BUILD_META_KEY, new Response(buildId));
  } catch { }
}

// -- IndexedDB for offline collections ----------------------------------

function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { offlineDB = request.result; resolve(offlineDB); };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('collections')) {
        const store = db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('households')) {
        db.createObjectStore('households', { keyPath: 'id' });
      }
    };
  });
}

// -- Install: pre-cache minimal app shell --------------------------------

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/logos/logo-full.svg",
  "/logos/png/logo-192x192.png",
  "/logos/png/logo-64x64.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(currentCacheName).then((cache) =>
        cache.addAll(APP_SHELL).catch(() => { })
      ),
      initOfflineDB(),
    ]).then(() => self.skipWaiting())
  );
});

// -- Activate: check build ID, nuke old caches if deploy changed ---------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const newBuildId = await fetchBuildId();
      const storedBuildId = await getStoredBuildId();

      // If build ID changed (or first install), delete ALL app caches
      if (newBuildId && newBuildId !== storedBuildId) {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => name !== "greenpath-meta") // keep meta cache
            .map((name) => caches.delete(name))
        );
        // Update cache name and re-precache app shell
        currentCacheName = `greenpath-${newBuildId}`;
        const cache = await caches.open(currentCacheName);
        await cache.addAll(APP_SHELL).catch(() => { });
        await setStoredBuildId(newBuildId);
      } else if (newBuildId) {
        currentCacheName = `greenpath-${newBuildId}`;
      }

      // Delete any other app caches (from old versions)
      const allNames = await caches.keys();
      await Promise.all(
        allNames
          .filter((name) => name !== currentCacheName && name !== "greenpath-meta")
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// -- Fetch: network-first, cache only essentials -------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle our own origin, GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API: only cache /api/auth/user and /api/households (collector needs these offline)
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/auth/user" || url.pathname === "/api/households") {
      event.respondWith(networkFirstStrict(request));
    }
    // All other API: network only, no caching
    return;
  }

  // Navigation: network first, offline fallback is role-aware
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) cacheReplace(request, response.clone());
          return response;
        })
        .catch(() => handleOfflineNavigation())
    );
    return;
  }

  // Static assets (.js, .css, images, fonts) — network first, cache for offline
  if (isStaticAsset(url.pathname)) {
    event.respondWith(networkFirstStrict(request));
    return;
  }

  // Everything else: just fetch, no caching
});

// -- Helpers -------------------------------------------------------------

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|webp)$/.test(pathname);
}

/** Network-first: try network, REPLACE cache entry, fall back to cache */
async function networkFirstStrict(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await cacheReplace(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

/** Put into cache, REPLACING any existing entry. Enforce cap. */
async function cacheReplace(request, response) {
  const cache = await caches.open(currentCacheName);
  await cache.put(request, response); // replaces by URL — never duplicates
  await enforceCapIfNeeded(cache);
}

/** If cache exceeds MAX_ENTRIES, delete oldest non-shell entries */
async function enforceCapIfNeeded(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) {
    const toDelete = keys.length - MAX_ENTRIES;
    let deleted = 0;
    for (const key of keys) {
      if (deleted >= toDelete) break;
      const keyUrl = new URL(key.url);
      if (!APP_SHELL.includes(keyUrl.pathname)) {
        await cache.delete(key);
        deleted++;
      }
    }
  }
}

/** Role-aware offline navigation handler */
async function handleOfflineNavigation() {
  // Check cached /api/auth/user to determine role
  const userResp = await caches.match("/api/auth/user");
  if (userResp) {
    try {
      const userData = await userResp.clone().json();
      if (userData && (userData.role === "collector" || userData.role === "generator")) {
        // Collector/Generator: serve the app shell so React handles offline UI
        const cachedIndex = await caches.match("/");
        if (cachedIndex) return cachedIndex;
      }
    } catch { }
  }

  // Fallback: if we have a cached index at all, serve it (better than offline page for any logged-in user)
  const cachedIndex = await caches.match("/");
  if (cachedIndex && userResp) return cachedIndex;

  // Truly no cached content — show branded offline page
  return offlinePage();
}

/** Branded offline page for non-collector users */
function offlinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GreenPath — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f8fafc 100%);
      color: #334155;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1.5rem;
    }
    .container {
      max-width: 420px;
      width: 100%;
    }
    .logo-wrap {
      margin-bottom: 2rem;
    }
    .logo-wrap svg {
      width: 56px;
      height: 56px;
    }
    .brand {
      font-size: 1.25rem;
      font-weight: 700;
      color: #059669;
      margin-top: 0.5rem;
      letter-spacing: -0.01em;
    }
    .offline-icon {
      width: 80px;
      height: 80px;
      background: #fee2e2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .offline-icon svg {
      width: 36px;
      height: 36px;
      color: #dc2626;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }
    .message {
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 340px;
      margin-left: auto;
      margin-right: auto;
    }
    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 2rem;
      background: #059669;
      color: #fff;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      box-shadow: 0 4px 12px rgba(5,150,105,0.25);
    }
    .retry-btn:hover { background: #047857; }
    .retry-btn:active { transform: scale(0.97); }
    .hint {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-wrap">
      <img src="/logos/logo-full.svg" alt="GreenPath Logo" style="width: 240px; height: auto; margin-bottom: 0.5rem;">
    </div>

    <div class="offline-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    </div>

    <h1>You're currently offline</h1>
    <p class="message">
      It looks like your internet connection dropped.
      Please check your Wi-Fi or mobile data and try again.
    </p>

    <button class="retry-btn" onclick="location.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Try Again
    </button>

    <p class="hint">Your session is saved — you'll pick up right where you left off.</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

// -- IndexedDB operations (for offline collections) ----------------------

async function storeOfflineCollection(data) {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['collections'], 'readwrite');
  const store = tx.objectStore('collections');
  const item = {
    ...data,
    status: 'pending_sync',
    timestamp: Date.now(),
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  return new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function storeOfflineFile(file, type) {
  if (!offlineDB) await initOfflineDB();
  const base64 = await fileToBase64(file);
  const tx = offlineDB.transaction(['files'], 'readwrite');
  const store = tx.objectStore('files');
  const item = {
    type, name: file.name, size: file.size, mimeType: file.type,
    data: base64, timestamp: Date.now(),
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  return new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve(item.id);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingCollections() {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['collections'], 'readonly');
  const index = tx.objectStore('collections').index('status');
  return new Promise((resolve, reject) => {
    const req = index.getAll('pending_sync');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOfflineFile(fileId) {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['files'], 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore('files').get(fileId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeOfflineCollection(id) {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['collections'], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore('collections').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeOfflineFile(id) {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['files'], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore('files').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function storeHouseholdsData(households) {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['households'], 'readwrite');
  const store = tx.objectStore('households');
  await new Promise(r => { store.clear().onsuccess = r; });
  for (const h of households) {
    await new Promise(r => { store.add(h).onsuccess = r; });
  }
}

async function getOfflineHouseholds() {
  if (!offlineDB) await initOfflineDB();
  const tx = offlineDB.transaction(['households'], 'readonly');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore('households').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

function base64ToBlob(base64, mimeType) {
  const bytes = atob(base64.split(',')[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

// -- Background sync -----------------------------------------------------

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-collections") {
    event.waitUntil(syncOfflineCollections());
  }
});

async function syncOfflineCollections() {
  if (isSyncInProgress) return { success: false, error: 'Sync already in progress' };
  isSyncInProgress = true;

  try {
    // Fetch a fresh CSRF token before syncing (GET — no CSRF check needed)
    let csrfToken = null;
    try {
      const csrfResp = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      if (csrfResp.ok) {
        const csrfData = await csrfResp.json();
        csrfToken = csrfData.csrfToken || null;
      }
    } catch { }

    const pending = await getPendingCollections();
    for (const collection of pending) {
      try {
        let photoUrl = null, voiceUrl = null;

        if (collection.photoFileId) {
          const f = await getOfflineFile(collection.photoFileId);
          if (f) { photoUrl = await uploadFile(f, 'photo', csrfToken); if (photoUrl) await removeOfflineFile(collection.photoFileId); }
        }
        if (collection.voiceFileId) {
          const f = await getOfflineFile(collection.voiceFileId);
          if (f) { voiceUrl = await uploadFile(f, 'voice', csrfToken); if (voiceUrl) await removeOfflineFile(collection.voiceFileId); }
        }

        const syncData = { ...collection, photoUrl, voiceUrl };
        delete syncData.id; delete syncData.status; delete syncData.timestamp;
        delete syncData.photoFileId; delete syncData.voiceFileId;

        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const resp = await fetch('/api/waste-collections', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(syncData),
        });

        if (resp.ok || resp.status === 409) {
          await removeOfflineCollection(collection.id);
          notifyClients({ type: 'COLLECTION_SYNCED', data: { collectionId: collection.id, success: true } });
        }
      } catch (err) {
        console.error(`[SW] Failed to sync ${collection.id}:`, err);
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    isSyncInProgress = false;
  }
}

async function uploadFile(fileData, type, csrfToken) {
  try {
    const blob = base64ToBlob(fileData.data, fileData.mimeType);
    const fd = new FormData();
    fd.append('file', blob, fileData.name);
    const headers = {};
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    const resp = await fetch(type === 'photo' ? '/api/upload/photo' : '/api/upload/voice', {
      method: 'POST', body: fd, credentials: 'include', headers
    });
    if (resp.ok) return (await resp.json()).url;
  } catch { }
  return null;
}

function notifyClients(msg) {
  self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage(msg)));
}

// -- Message handler -----------------------------------------------------

self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'STORE_OFFLINE_COLLECTION': {
      try {
        const result = await storeOfflineCollection(data);
        event.ports[0]?.postMessage({ success: true, data: result });
      } catch (e) {
        event.ports[0]?.postMessage({ success: false, error: e.message });
      }
      break;
    }
    case 'STORE_OFFLINE_FILE': {
      try {
        const fileId = await storeOfflineFile(data.file, data.type);
        event.ports[0]?.postMessage({ success: true, fileId });
      } catch (e) {
        event.ports[0]?.postMessage({ success: false, error: e.message });
      }
      break;
    }
    case 'GET_PENDING_COLLECTIONS': {
      try {
        const collections = await getPendingCollections();
        event.ports[0]?.postMessage({ success: true, data: collections });
      } catch (e) {
        event.ports[0]?.postMessage({ success: false, error: e.message });
      }
      break;
    }
    case 'FORCE_SYNC': {
      try {
        const result = await syncOfflineCollections();
        event.ports[0]?.postMessage(result);
      } catch (e) {
        event.ports[0]?.postMessage({ success: false, error: e.message });
      }
      break;
    }
    case 'CLEAR_ALL_CACHES': {
      // Called on logout — nuke everything
      try {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
        if (offlineDB) { offlineDB.close(); offlineDB = null; }
        indexedDB.deleteDatabase(OFFLINE_DB_NAME);
        event.ports[0]?.postMessage({ success: true });
      } catch (e) {
        event.ports[0]?.postMessage({ success: false, error: e.message });
      }
      break;
    }
  }
});

// -- Push notifications --------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/logos/png/logo-192x192.png",
      badge: data.badge || "/logos/png/logo-64x64.png",
      tag: data.tag || "greenpath-notification",
      renotify: true,                // Replace old notification with same tag
      requireInteraction: false,     // Auto-dismiss — battery friendly
      vibrate: [200],                // Single short vibration — not spammy
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
