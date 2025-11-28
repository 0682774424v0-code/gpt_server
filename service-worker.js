/**
 * Service Worker for offline support and caching
 */

const CACHE_NAME = 'stable-diffusion-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/canvas_editor.js',
    '/gallery.js',
    '/gdrive_sync.js',
    '/styles.css',
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Failed to cache some assets:', err);
                // Don't fail install if some assets are unavailable
            });
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For API requests, try network first then cache
    if (event.request.url.includes('/api/') || event.request.url.includes('/socket.io')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.status === 200) {
                        const cache = caches.open(CACHE_NAME).then(c => {
                            c.put(event.request, response.clone());
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response on network error
                    return caches.match(event.request).catch(() => {
                        // Return offline page if no cache
                        return new Response('Offline - Please check your connection', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
                })
        );
    } else {
        // For static assets, use cache first then network
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }

                    return fetch(event.request).then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
                })
                .catch(() => {
                    // Return a offline page
                    return new Response('Page not available offline', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                })
        );
    }
});

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-gallery') {
        event.waitUntil(syncGalleryOffline());
    }
});

async function syncGalleryOffline() {
    try {
        // Sync pending actions from offline
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        // Could implement queue of pending generations here
        console.log('Syncing offline data...');
    } catch (error) {
        console.error('Offline sync failed:', error);
    }
}

// Push notifications for generation complete
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Generation complete',
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'generation',
        requireInteraction: false,
    };

    event.waitUntil(
        self.registration.showNotification('Stable Diffusion', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Focus existing window if open
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
