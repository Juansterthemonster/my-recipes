// Light / Dark / Auto (follow the system). Stored on this device only; "auto" removes the attribute so the
// CSS media query decides. index.html applies the saved choice before first paint (no flash).
const KEY = 'sazon:theme'
const BAR = { light: '#0C3D4E', dark: '#151A1C' }   // browser top-bar colour per theme

export function getThemePref() {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto' } catch { return 'auto' }
}

export function applyTheme(pref) {
  const root = document.documentElement
  if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref)
  else root.removeAttribute('data-theme')
  // theme-color: one tag per scheme; when forced, both show the chosen colour
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const scheme = /dark/.test(m.getAttribute('media') || '') ? 'dark' : 'light'
    m.setAttribute('content', BAR[pref === 'light' || pref === 'dark' ? pref : scheme])
  })
}

export function setThemePref(pref) {
  try { if (pref === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref) } catch { /* private mode */ }
  applyTheme(pref)
}
