import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'
import LegalPage from './components/LegalPage.jsx'

// If a sign-in attempt (e.g. Google) came back with an error, Supabase puts it in the URL.
// Keep the message for the sign-in screen and clean the address bar.
try {
  const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const qp = new URLSearchParams(window.location.search)
  // TEMPORARY sign-in diagnostics: remember which parameter NAMES (never values) came back
  const names = [...hp.keys(), ...qp.keys()]
  if (names.some(k => /token|code|error|provider/i.test(k))) {
    sessionStorage.setItem('sazon_auth_return', JSON.stringify({ hash: [...hp.keys()], query: [...qp.keys()] }))
  }
  const desc = hp.get('error_description') || qp.get('error_description')
  if (desc) {
    sessionStorage.setItem('sazon_auth_error', desc.replace(/\+/g, ' '))
    window.history.replaceState(null, '', window.location.pathname)
  }
} catch { /* ignore */ }

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
