// Ezz Ride Hailing PWA Service Worker (v3)
const CACHE_NAME = 'ezz-ride-v3';
const ASSETS = [
  '/',
  '/index.html'
];

let currentDriverId = null;
let supabaseUrl = 'https://your-project-id.supabase.co';
let supabaseKey = '';
let backgroundPollingInterval = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => console.log("Cache error during SW install:", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      allClients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', online: navigator.onLine });
      });
    })()
  );
});

// Background online/offline detection: notify when connectivity changes
function showOfflineNotification() {
  self.registration.showNotification('📡 أنت غير متصل بالإنترنت', {
    body: 'لا يمكنك إرسال طلبات الرحلات أو استلام التحديثات حالياً.',
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📡</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📡</text></svg>',
    tag: 'ezz-offline-alert',
    renotify: true,
    requireInteraction: true,
    silent: false,
    sound: 'default',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  });
}

function showOnlineNotification() {
  self.registration.showNotification('✅ تم استعادة الاتصال', {
    body: 'أنت متصل الآن. يمكنك استئناف استخدام التطبيق.',
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✅</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✅</text></svg>',
    tag: 'ezz-online-alert',
    renotify: true,
    requireInteraction: true,
    silent: false,
    sound: 'default',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  });
}

let lastKnownOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
self.addEventListener('online', () => {
  if (lastKnownOnline) return;
  lastKnownOnline = true;
  showOnlineNotification();
});

self.addEventListener('offline', () => {
  if (!lastKnownOnline) return;
  lastKnownOnline = false;
  showOfflineNotification();
});

// Helper: show a driver ride request notification and auto-close after 7 seconds
function showDriverRideRequestNotification(title, body, rideId) {
  const tag = `ride-request-${rideId || 'new'}`;
  
  // Close any existing ride request notification before showing a new one
  self.registration.getNotifications({ tag }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });

  const options = {
    body: body || 'طلب مشوار جديد متاح للكابتن حالاً!',
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚖</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚖</text></svg>',
    tag: tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    sound: 'default',
    vibrate: [300, 100, 300, 100, 400],
    data: {
      url: '/?screen=DRIVER_DASHBOARD',
      rideId: rideId || null,
    },
    actions: [
      { action: 'open_app', title: 'عرض المشوار 🚖' },
      { action: 'dismiss', title: 'إغلاق ✖' }
    ]
  };

  self.registration.showNotification(title || '🚖 طلب مشوار جديد!', options).then(() => {
    // Auto-close the notification after 7 seconds
    setTimeout(() => {
      self.registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });
    }, 7000);
  });
}

// Background polling: check Supabase for new ride requests every 30 seconds
async function pollForNewRideRequests() {
  if (!currentDriverId || !supabaseUrl || !supabaseKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/ezz_active_trip?driver_id=eq.${encodeURIComponent(currentDriverId)}&status=eq.SEARCHING&select=id,rider_name,pickup_name,dropoff_name,fare,status`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) return;

    const trips = await response.json();
    
    if (Array.isArray(trips) && trips.length > 0) {
      const trip = trips[0];
      const rideId = trip.id;
      
      // Show notification for the new ride request
      showDriverRideRequestNotification(
        '🚖 طلب مشوار جديد!',
        `من ${trip.rider_name || 'راكب'} | ${trip.fare || ''} ج.م`,
        rideId
      );
    }
  } catch (err) {
    console.log('[SW] Background poll error:', err);
  }
}

function startBackgroundPolling() {
  if (backgroundPollingInterval) return;
  
  // Poll every 30 seconds
  backgroundPollingInterval = setInterval(() => {
    pollForNewRideRequests();
  }, 30000);
  
  // Also poll immediately
  pollForNewRideRequests();
}

function stopBackgroundPolling() {
  if (backgroundPollingInterval) {
    clearInterval(backgroundPollingInterval);
    backgroundPollingInterval = null;
  }
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data) {
    // Driver login: start background polling
    if (event.data.type === 'DRIVER_LOGIN' && event.data.driverId) {
      currentDriverId = event.data.driverId;
      if (event.data.supabaseUrl) supabaseUrl = event.data.supabaseUrl;
      if (event.data.supabaseKey) supabaseKey = event.data.supabaseKey;
      startBackgroundPolling();
    }
    
    // Driver logout: stop polling
    if (event.data.type === 'DRIVER_LOGOUT') {
      currentDriverId = null;
      stopBackgroundPolling();
    }
    
    // Handle background notification requests sent from client application via postMessage
    if (event.data.type === 'SHOW_BACKGROUND_NOTIFICATION' || event.data.type === 'DRIVER_TRIP_ALERT') {
      const { title, body, icon, tag, data, vibrate } = event.data;
      const iconDataUrl = icon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚖</text></svg>';
      
      const notificationTag = tag || 'ezz-driver-alert';
      
      // Close any existing notification with the same tag
      self.registration.getNotifications({ tag: notificationTag }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });

      const options = {
        body: body || 'طلب مشوار جديد متاح للكابتن حالاً!',
        icon: iconDataUrl,
        badge: iconDataUrl,
        tag: notificationTag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        sound: 'default',
        vibrate: vibrate || [300, 100, 300, 100, 400],
        data: data || { url: '/?screen=DRIVER_DASHBOARD' },
        actions: [
          { action: 'open_app', title: 'عرض المشوار 🚖' },
          { action: 'dismiss', title: 'إغلاق ✖' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(title || 'تنبيه كابتن عز 🚖', options).then(() => {
          // Auto-close after 7 seconds
          setTimeout(() => {
            self.registration.getNotifications({ tag: notificationTag }).then((notifications) => {
              notifications.forEach((n) => n.close());
            });
          }, 7000);
        })
      );
    }

    if (event.data.type === 'FORCE_ONLINE_CHECK') {
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({ type: 'ONLINE_CHECK_RESULT', online: navigator.onLine });
          });
        })
      );
    }
  }
});

// Listen to incoming Web Push API events (FCM)
self.addEventListener('push', (event) => {
  let data = { title: 'تطبيق عز 🚖', body: 'تحديث جديد لرحلتك حالاً!' };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      // FCM wraps message in .data property, direct push may use root
      data = parsed.data || parsed;
    } catch (e) {
      data = { title: 'تطبيق عز 🚖', body: event.data.text() };
    }
  }

  const iconDataUrl = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚖</text></svg>';
  const tag = data.tag || data.rideId || 'ezz-push-alert';

  // Close any existing notification with the same tag
  self.registration.getNotifications({ tag }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });

  const options = {
    body: data.body || data.message || 'تحديث جديد',
    icon: iconDataUrl,
    badge: iconDataUrl,
    tag: tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    sound: 'default',
    vibrate: data.vibrate || [300, 100, 300, 100, 400],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
      rideId: data.rideId || null,
    },
    actions: data.actions || [
      { action: 'open_app', title: 'عرض المشوار 🚖' },
      { action: 'dismiss', title: 'إغلاق ✖' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'تطبيق عز 🚖', options).then(() => {
      // Auto-close after 7 seconds
      setTimeout(() => {
        self.registration.getNotifications({ tag }).then((notifications) => {
          notifications.forEach((n) => n.close());
        });
      }, 7000);
    })
  );
});

// Handle notification click to focus application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/?screen=DRIVER_DASHBOARD');
      }
    })
  );
});
