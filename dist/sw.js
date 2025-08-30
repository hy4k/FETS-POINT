const CACHE_NAME = 'fets-point-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/fets-point-logo.png',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🗄️ Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log('🎯 Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        
        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch((error) => {
          console.error('🌐 Service Worker: Fetch failed', error);
          
          // Return offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          
          return new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Implement background sync logic here
      console.log('📝 Service Worker: Processing background sync')
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from FETS Point',
    icon: '/fets-point-logo.png',
    badge: '/fets-point-logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/fets-point-logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/fets-point-logo.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('FETS Point', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});