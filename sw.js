const CACHE_NAME = 'kids-v14';
const ASSETS = [
  './',
  './index.html',
  './shared/tickets.js',
  './shared/sound.js',
  './shared/app-boot.js',
  './shared/progress.js',
  './shared/emoji.js',
  './games/pyoko/',
  './games/pyoko/index.html',
  './games/daruma/',
  './games/daruma/index.html',
  './games/pitatto/',
  './games/pitatto/index.html',
  './study/numakasten/',
  './study/numakasten/index.html',
  './study/tsuginani/',
  './study/tsuginani/index.html',
  './study/yajirushi/',
  './study/yajirushi/index.html',
  // @new-app:assets (tools/new_app.py がここにエントリを挿入する。消さないこと)
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      // キャッシュ優先で即応答しつつ、裏でネットワークから更新しておく
      const fetched = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
