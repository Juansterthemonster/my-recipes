import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'
import LegalPage from './components/LegalPage.jsx'
import PullToRefresh from './components/PullToRefresh.jsx'

// If a sign-in attempt (e.g. Google) came back with an error, Supabase puts it in the URL.
// Keep the message for the sign-in screen and clean the address bar.
try {
  const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const qp = new URLSearchParams(window.location.search)
  const desc = hp.get('error_description') || qp.get('error_description')
  if (desc) {
    sessionStorage.setItem('sazon_auth_error', desc.replace(/\+/g, ' '))
    window.history.replaceState(null, '', window.location.pathname)
  }
} catch { /* ignore */ }

// Android app: when a shared recipe link is opened with the app (Android App Links), the app starts
// on the home page and hands us the link. Go to that recipe. Does nothing in a normal browser.
try {
  const capApp = window.Capacitor?.Plugins?.App
  if (capApp) {
    const openLink = (url) => {
      try {
        const u = new URL(url)
        if (u.hostname !== window.location.hostname || !u.pathname.startsWith('/recipe/')) return
        if (u.pathname === window.location.pathname) return
        window.location.replace(u.pathname + u.search)
      } catch { /* ignore */ }
    }
    capApp.getLaunchUrl?.().then((r) => { if (r?.url) openLink(r.url) }).catch(() => {})
    capApp.addListener?.('appUrlOpen', (e) => openLink(e.url))
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
        <PullToRefresh />
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
