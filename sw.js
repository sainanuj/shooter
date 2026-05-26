const CACHE_NAME = 'cosmic-defender-v2';
const FONT_CACHE_NAME = 'cosmic-defender-fonts-v1';

// Essential assets to cache immediately on installation
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'style/style.css',
  'scripts/main.js',
  'manifest.json',
  'assets/image/icon-192.png',
  'assets/image/icon-512.png',
  'assets/image/starfield.png',
  'assets/image/playerShip1_orange.png',
  'assets/image/laserRed16.png',
  'assets/image/meteorBrown_big1.png',
  'assets/image/meteorBrown_big2.png',
  'assets/image/meteorBrown_med1.png',
  'assets/image/meteorBrown_med3.png',
  'assets/image/meteorBrown_small1.png',
  'assets/image/meteorBrown_small2.png',
  'assets/image/meteorBrown_tiny1.png',
  'assets/sound/pew.wav',
  'assets/sound/expl6.wav',
  'assets/sound/tgfcoder-FrozenJam-SeamlessLoop.ogg'
];

// Install Event - Pre-cache all essential shell files and game resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching game assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Pre-cache completed successfully.');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Pre-cache failed:', error);
      })
  );
});

// Activate Event - Clean up stale caches and claim control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Now active and controlling clients.');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Dynamic caching and Offline-First delivery
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Handle Google Fonts requests separately using a dynamic cache-first strategy
  if (requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Fallback if offline and not cached
            return new Response('', { status: 408, statusText: 'Network error occurred while fetching fonts.' });
          });
        });
      })
    );
    return;
  }

  // Handle range requests for audio files if necessary
  // Chrome and Safari sometimes request media files with HTTP Range headers.
  // Standard caches don't support range requests fully, but a simple cache-first strategy 
  // without range support is often sufficient for full downloads (loaded via new Audio()).
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network and dynamically cache if it's a same-origin resource
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful requests of same origin to avoid bloat
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[Service Worker] Fetch failed offline for resource:', event.request.url, err);
        // Return a basic fallback response if the request was for index.html
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
