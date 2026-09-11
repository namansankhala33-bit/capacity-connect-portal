import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const CURRENT_CACHE = 'capacity-connect-v2';

async function purgeStaleCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter(key => key !== CURRENT_CACHE).map(key => caches.delete(key))
  );
}

async function removeStaleWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(reg => reg.update()));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await purgeStaleCaches();
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      } else {
        await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      }
      await removeStaleWorkers();
    } catch (err) {
      console.error('Service worker maintenance failed:', err);
    }
  });
}