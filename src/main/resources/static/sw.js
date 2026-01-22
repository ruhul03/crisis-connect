const CACHE_NAME = 'crisis-connect-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/offline-icons.css',
    '/js/app.js',
    '/js/sockjs.min.js',
    '/js/stomp.min.js',
    '/js/qrcode.min.js',
    '/manifest.json'
];

// Install Event - Cache Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Caching assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests (like POST API calls)
    if (event.request.method !== 'GET') return;

    // Skip API calls from caching (always fresh or offline queue handled by app.js)
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return cachedResponse || fetchPromise;
            });
        })
    );
});
