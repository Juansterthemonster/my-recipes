import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'
import LegalPage from './components/LegalPage.jsx'

// Public legal pages are served before the app (no sign-in needed).
const legalPath = window.location.pathname.replace(/\/+$/, '')
const legalKind = legalPath === '/privacy' ? 'privacy' : legalPath === '/terms' ? 'terms' : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {legalKind ? (
      <LegalPage kind={legalKind} />
    ) : (
      <I18nProvider>
        <App />
      </I18nProvider>
    )}
  </StrictMode>,
)

// Register the service worker (app-shell caching, see public/sw.js).
// Registered after 'load' so it never competes with the initial render.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  })
}
