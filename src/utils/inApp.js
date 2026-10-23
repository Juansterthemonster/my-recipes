// True when the site is running inside the Android app shell (Capacitor WebView), as opposed to a
// normal browser. Used to hide Google sign-in (Google blocks embedded WebViews), enable
// pull-to-refresh, and use the native share sheet.
export const IN_APP_WEBVIEW = typeof window !== 'undefined' && (
  !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  || /;\s*wv\)/.test(navigator.userAgent)
)

// The native Share plugin, when the app shell provides it (Android app only).
export function getNativeShare() {
  try {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) || null
  } catch { return null }
}
