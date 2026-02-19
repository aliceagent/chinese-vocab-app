'use client'

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('SW registered:', registration)
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Show update available notification
                showUpdateNotification()
              }
            })
          }
        })

        // Handle SW messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'CONNECTION_STATUS') {
            handleConnectionStatus(event.data.online)
          }
        })

      } catch (error) {
        console.error('SW registration failed:', error)
      }
    })
  }
}

function showUpdateNotification() {
  // You could implement a toast notification here
  console.log('App update available! Please refresh.')
}

function handleConnectionStatus(online: boolean) {
  // Handle offline/online status
  const statusElement = document.getElementById('connection-status')
  if (statusElement) {
    statusElement.textContent = online ? 'Online' : 'Offline'
    statusElement.className = online ? 'text-green-600' : 'text-red-600'
  }
}

export function checkConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(navigator.onLine)
      return
    }

    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => {
      resolve(event.data.online)
    }

    navigator.serviceWorker.controller.postMessage(
      { type: 'CHECK_CONNECTION' },
      [channel.port2]
    )
  })
}