const CACHE_NAME = 'chinese-vocab-v1'
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`

// Cache essential app shell files
const STATIC_FILES = [
  '/',
  '/upload',
  '/vocabulary',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
]

// Files to cache on first visit
const RUNTIME_CACHE = [
  '/api/upload',
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_FILES.map(url => 
          new Request(url, { cache: 'reload' })
        ))
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName.startsWith(CACHE_NAME) && 
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only cache GET requests from same origin
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Handle app shell with cache-first strategy
  if (STATIC_FILES.some(file => url.pathname === file || url.pathname.startsWith('/_next/static/'))) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Handle pages with stale-while-revalidate
  event.respondWith(staleWhileRevalidateStrategy(request))
})

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Cache-first strategy failed:', error)
    throw error
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Stale-while-revalidate for pages
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}

// Background sync for failed uploads (when available)
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-retry') {
    event.waitUntil(retryFailedUploads())
  }
})

async function retryFailedUploads() {
  // Implementation would depend on how failed uploads are stored
  console.log('Retrying failed uploads...')
}

// Show offline notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_CONNECTION') {
    event.ports[0].postMessage({
      type: 'CONNECTION_STATUS',
      online: navigator.onLine
    })
  }
})