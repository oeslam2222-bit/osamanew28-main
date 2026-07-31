import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFields = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

let app: ReturnType<typeof initializeApp> | null = null;
let messagingInstance: ReturnType<typeof getMessaging> | null = null;

if (missingFields.length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('[Firebase] Initialization failed:', e);
  }
} else {
  console.warn(
    `[Firebase] Missing config: ${missingFields.join(', ')}. Notifications will be disabled.`
  );
}

export const getMessagingInstance = () => {
  if (!app) return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn('[Firebase] Messaging not available:', e);
      return null;
    }
  }
  return messagingInstance;
};

export const getFCMServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (reg) return reg;
    const active = await navigator.serviceWorker.ready;
    return active;
  } catch (e) {
    console.warn('[Firebase] Could not get SW registration:', e);
    return null;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('[FCM] VAPID key not configured');
      return null;
    }

    const swReg = await getFCMServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg || undefined,
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('[FCM] No token obtained');
      return null;
    }
  } catch (err) {
    console.error('[FCM] Error getting token:', err);
    return null;
  }
};

export const onFCMForegroundMessage = (callback: (payload: any) => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return () => {};
  }
  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message:', payload);
    callback(payload);
  });
};
