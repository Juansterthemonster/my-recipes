// Remembers (in this browser only) when the admin last opened the dashboard,
// so recipes added since then can be flagged NEW. Storage can be blocked, so
// every access is wrapped.
const KEY = 'sazon_admin_last_seen'

export function getLastSeen() {
  try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 }
}
export function markSeen() {
  try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
}
