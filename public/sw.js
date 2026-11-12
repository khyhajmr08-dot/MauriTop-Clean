const CACHE_NAME = 'mauritop-static-v2';
const IMAGE_CACHE_NAME = 'mauritop-images-v2';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep current static cache and image cache, clean old version caches
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to determine if request is for a safe public image
function isImageRequest(request) {
  const url = request.url.toLowerCase();

  // PRIVACY PROTECTION: NEVER cache sensitive customer documents (receipts, KYC IDs, verifications)
  if (
    url.includes('/receipts/') || 
    url.includes('receipts%2f') || 
    url.includes('/kyc/') || 
    url.includes('kyc%2f') ||
    url.includes('verification')
  ) {
    return false;
  }

  const accept = request.headers.get('accept') || '';
  return (
    request.destination === 'image' ||
    accept.includes('image') ||
    url.match(/\.(png|jpg|jpeg|webp|svg|gif|avif)(\?.*)?$/) ||
    url.includes('/assets/') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('cloudinary.com') ||
    url.includes('imgur.com')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests, browser extensions, and API endpoints
  if (request.method !== 'GET' || !request.url.startsWith('http') || request.url.includes('/api/')) {
    return;
  }

  // Strategy for Images: Cache-First with Network Fallback and Stale-While-Revalidate
  if (isImageRequest(request)) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        // 1. Check cache first
        const cachedResponse = await cache.match(request);

        // Fetch in background or foreground
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Only cache valid responses (including opaque CORS responses)
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed or offline - cachedResponse will be returned
            return null;
          });

        if (cachedResponse) {
          // If we have a cached image, return it immediately and update in background
          fetchPromise.catch(() => {});
          return cachedResponse;
        }

        // If not in cache, wait for network
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // Both cache and network failed
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#111a2e"/></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      })
    );
    return;
  }

  // Strategy for Navigation / HTML: Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Strategy for other assets (JS, CSS, static files): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
