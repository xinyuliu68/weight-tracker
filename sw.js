/* ==========================================
   sw.js — Service Worker 离线缓存
   ========================================== */

const CACHE_NAME = 'weight-tracker-v1';

const STATIC_FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/utils.js',
  'js/store.js',
  'js/chart.js',
  'js/calendar.js',
  'js/app.js',
  'manifest.json',
];

// 安装
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// 激活
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
