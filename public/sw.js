const CACHE_NAME = 'capacity-connect-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/context/AppContext.jsx',
  '/src/lib/api.js',
  '/src/lib/supabaseClient.js',
  '/src/data/imdSeedData.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      const isNavigation = event.request.mode === 'navigate';
      try {
        const fresh = await fetch(event.request);
        if (fresh && fresh.status === 200 && (fresh.type === 'basic' || fresh.type === 'default')) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        } else {
          return fresh;
        }
        return fresh;
      } catch (err) {
        if (cached) return cached;
        if (isNavigation) {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});