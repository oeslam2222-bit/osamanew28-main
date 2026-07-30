import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

const handleGlobalError = (event: ErrorEvent) => {
  console.error('[GlobalError]', event.message, event.filename, event.lineno);
  event.preventDefault();
};

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('[UnhandledRejection]', event.reason);
  event.preventDefault();
};

window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ONLINE_CHECK_RESULT') {
      console.log('[SW] Online status from service worker:', event.data.online);
    }
  });
}
