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

if (missingFields.length > 0) {
  console.warn(
    `[Firebase] Missing config: ${missingFields.join(', ')}. Notifications will be disabled.`
  );
}

const app = initializeApp(firebaseConfig);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

export const getMessagingInstance = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
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

    const token = await getToken(getMessagingInstance(), {
      vapidKey,
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
  return onMessage(getMessagingInstance(), (payload) => {
    console.log('[FCM] Foreground message:', payload);
    callback(payload);
  });
};
