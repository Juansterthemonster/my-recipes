// True when the site is running inside the Android app shell (Capacitor WebView), as opposed to a
// normal browser. Used to hide Google sign-in (Google blocks embedded WebViews), enable
// pull-to-refresh, and use the native share sheet.
export const IN_APP_WEBVIEW = typeof window !== 'undefined' && (
  !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  || /;\s*wv\)/.test(navigator.userAgent)
)

// True only inside OUR Capacitor app (not other apps' embedded browsers such as Instagram's, which
// are also WebViews). Used to hide the store badges: people in an Instagram link should still see them.
export const IN_NATIVE_APP = typeof window !== 'undefined'
  && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())

// Public identifier of the Google "Web application" OAuth client (not a secret). The Android app's
// native Google sign-in uses it as the token audience; Supabase's Google provider uses the same one.
export const GOOGLE_WEB_CLIENT_ID = '458456195039-htan7t8e1ci65qvilbgeevvqjopvod6i.apps.googleusercontent.com'

// The native Google sign-in plugin (@capgo/capacitor-social-login), when the app shell includes it.
// Older builds of the Android app don't have it, so the Google button stays hidden there.
export function getNativeSocialLogin() {
  try {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin) || null
  } catch { return null }
}

// The native Share plugin, when the app shell provides it (Android app only).
export function getNativeShare() {
  try {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) || null
  } catch { return null }
}
