import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Force firebase initialization to no-op
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
let app = null;
let messagingInstance = null;

export const initializeApp = () => {
  console.warn('[Firebase] Initialization skipped by code');
};

export const getMessagingInstance = () => {
  console.warn('[Firebase] Messaging instance requested but disabled');
  return messagingInstance;
};

export const getFCMServiceWorkerRegistration = async () => {
  console.warn('[Firebase] Service worker registration skipped');
  return null;
};

export const getFCMToken = async () => {
  console.warn('[Firebase] Token request skipped');
  return null;
};

export const onFCMForegroundMessage = (callback) => {
  console.warn('[Firebase] Foreground message listener skipped');
  return () => {};
};

// Firebase config variables remain for possible future use
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const missingFields = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
