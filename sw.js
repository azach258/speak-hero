/**
 * SpeakHero - Service Worker
 * Ensures offline shell caching & smooth standalone PWA launch without 404.
 * Specially optimized for iOS Safari Range request media streaming.
 */

const CACHE_NAME = 'speakhero-v1.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/articles.js',
  './js/audio-pool.js',
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
  
  const url = event.request.url;

  // 1. Exclude Google Gemini API, Telegram API and backend endpoints
  if (url.includes('googleapis.com') || url.includes('telegram.org') || url.includes('/api/')) {
    return;
  }

  // 2. CRITICAL IOS FIX: Bypass Range requests and audio/video files
  // iOS Safari native AVPlayer will fail audio playback if Service Worker returns 200 instead of 206 Partial Content.
  if (
    url.includes('.mp3') || 
    url.includes('.mp4') || 
    url.includes('.webm') || 
    url.includes('.wav') || 
    url.includes('.aac') ||
    url.includes('.m4a') ||
    event.request.headers.get('range')
  ) {
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
