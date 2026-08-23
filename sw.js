const CACHE_NAME = 'futbol-cache-v1';
const RECURSOS = ['./', './index.html', './styles.css', './app.js', './manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(RECURSOS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
