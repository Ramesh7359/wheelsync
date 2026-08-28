const CACHE_NAME = 'wheelsync-v2';
const STATIC_ASSETS = [
    '/', '/index.html', '/css/style.css', '/js/app.js', '/manifest.json',
    '/icons/favicon.svg',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls - network only
    if (url.pathname.startsWith('/api')) {
        event.respondWith(fetch(request).catch(() =>
            new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' }, status: 503 })
        ));
        return;
    }

    // App files - network first so updates show immediately
    const isAppFile = url.pathname === '/' || url.pathname.endsWith('.html') ||
                      url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
    if (isAppFile) {
        event.respondWith(
            fetch(request).then(resp => {
                if (resp.status === 200) { const cl = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(request, cl)); }
                return resp;
            }).catch(() => caches.match(request).then(c => c || caches.match('/index.html')))
        );
        return;
    }

    // Static assets - cache first
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(resp => {
        if (resp.status === 200) { const cl = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(request, cl)); }
        return resp;
    }).catch(() => request.mode === 'navigate' ? caches.match('/index.html') : undefined)));
});
