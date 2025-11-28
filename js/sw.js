const CACHE_NAME = 'cybersit-v1';

// Use relative paths so the SW works whether the app is served from root or a subpath.
const urlsToCache = [
	'./',
	'index.html',
	'css/styles.css',
	'js/app.js',
	'js/db.js',
	'js/ui.js',
	'js/avatar.js',
	'js/charts.js',
	'js/export.js',
	'manifest.json',
	'js/vendor/chart.min.js'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch(() => Promise.resolve()))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))))
	);
	return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached;
			return fetch(event.request.clone())
				.then((res) => {
					if (!res || res.status !== 200) return res;
					if (res.type === 'basic' || res.type === 'cors') {
						const resClone = res.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
					}
					return res;
				})
				.catch(() => caches.match('index.html'));
		})
	);
});