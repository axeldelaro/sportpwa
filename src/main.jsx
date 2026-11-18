import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Enregistrement & pré-cache immédiat sur le Web (ignoré dans l'APK natif Capacitor où tout est déjà embarqué)
const isNativeApk =
  typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

if (!isNativeApk && 'serviceWorker' in navigator && import.meta.env.PROD) {
  const hadControllerInitially = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadControllerInitially && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  const registerServiceWorker = () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => reg.update())
      .catch((err) => console.warn('Service Worker non enregistré :', err));
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
