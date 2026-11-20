/* Spotlight tours — which ones this device has already seen.
   A tour is shown once, ever (per device/browser). Closing it any way counts as seen.
   Stored in localStorage so signed-out visitors get tours too; if storage is blocked we
   remember for the rest of the session so it can't nag on every recipe. */

export const TOURS = [
  { id: 'photo-expand', label: 'Tap a photo to see all of it (recipe page, phones & tablets)' },
]

const memory = new Set()
const key = id => `sazon:tour:${id}`

export function tourSeen(id) {
  if (memory.has(id)) return true
  try { return localStorage.getItem(key(id)) === '1' } catch { return false }
}
export function markTourSeen(id) {
  memory.add(id)
  try { localStorage.setItem(key(id), '1') } catch { /* blocked storage — memory still holds */ }
}
export function resetTour(id) {
  memory.delete(id)
  try { localStorage.removeItem(key(id)) } catch { /* ignore */ }
}
