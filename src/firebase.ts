import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyDNuhL_OpNMq2HSFJ6Pz871mSkXCXYwFXA',
  authDomain: 'symmetric-setup-kcf5x.firebaseapp.com',
  projectId: 'symmetric-setup-kcf5x',
  storageBucket: 'symmetric-setup-kcf5x.firebasestorage.app',
  messagingSenderId: '963124202476',
  appId: '1:963124202476:web:6342dc6bb0696b81fa8ec9',
};

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

    const token = await getToken(getMessagingInstance(), {
      vapidKey: 'BN1RdGpPkYc3zBE7QxJKfGyHZmSnG5x-IyrJ9gQRmGW0RqHqPPpPgI6nQj6I9T9Q9W9Q9W9Q9W9Q9W9Q9W9Q9W9',
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
