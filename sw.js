/**
 * SpeakHero - Service Worker
 * Ensures offline shell caching & smooth standalone PWA launch without 404.
 */

const CACHE_NAME = 'speakhero-v1.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/articles.js',
  './js/audio-fx.js',
  './js/media.js',
  './js/ai-coach.js',
  './js/milestone.js',
  './js/telegram.js',
  './js/obsidian-sync.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Exclude Google Gemini API and Telegram API requests from cache
  const url = event.request.url;
  if (url.includes('googleapis.com') || url.includes('telegram.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
