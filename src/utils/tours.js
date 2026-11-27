/* Spotlight tours — which ones this device has already seen.
   Most tours are shown once, ever (per device/browser). Closing one any way counts as seen.
   A few are "counted" (see COUNTED): they can show a limited number of times, on chosen visits, and
   stop for good once "Got it" is clicked. Stored in localStorage so signed-out visitors get tours too;
   if storage is blocked we remember for the rest of the session so it can't nag on every recipe. */

export const TOURS = [
  { id: 'photo-expand', label: 'Tap a photo to see all of it (recipe page, phones & tablets)' },
  { id: 'servings', label: 'Servings − / + (recipe page): shows on the first recipe opened and again around the 4th, twice at most. "Got it" or using the stepper stops it for good.' },
  { id: 'share-guest', label: 'Share button for signed-out visitors (public recipe page): friends don’t need the app or an account' },
  { id: 'share-first', label: 'Share, after someone creates or saves their first recipe. Points at the ⋯ menu while the recipe is private, at the share button once it is public. Reset arms it for the next recipe you open.' },
]

// Tours that can show more than once. max = most times it is shown; repeatAt = the recipe-open count
// (per device) from which the next showing is allowed.
const COUNTED = { servings: { max: 2, repeatAt: 4 } }
// Tours that wait to be switched on by something the user did (see armTour).
const ARMED = new Set(['share-first'])

const memory = new Set()
const stateMem = {}
const armedMem = new Set()
const key = id => `sazon:tour:${id}`
const nkey = id => `sazon:tourn:${id}`
const akey = id => `sazon:tour-armed:${id}`

function readState(id) {
  if (stateMem[id]) return stateMem[id]
  try {
    const raw = localStorage.getItem(nkey(id))
    if (raw) return (stateMem[id] = { opens: 0, shown: 0, done: false, ...JSON.parse(raw) })
  } catch { /* ignore */ }
  return (stateMem[id] = { opens: 0, shown: 0, done: false })
}
function writeState(id, st) {
  stateMem[id] = st
  try { localStorage.setItem(nkey(id), JSON.stringify(st)) } catch { /* memory still holds */ }
}

export function tourSeen(id) {
  const cfg = COUNTED[id]
  if (cfg) { const st = readState(id); return st.done || st.shown >= cfg.max }
  if (memory.has(id)) return true
  try { return localStorage.getItem(key(id)) === '1' } catch { return false }
}
export function markTourSeen(id) {
  memory.add(id)
  try { localStorage.setItem(key(id), '1') } catch { /* blocked storage — memory still holds */ }
}

/* Counted tours ─ one call per recipe open; the visit token makes repeats of the same open count once. */
const lastCounted = {}
export function countVisit(id, visit) {
  const st = readState(id)
  if (lastCounted[id] === visit) return st
  lastCounted[id] = visit
  const next = { ...st, opens: st.opens + 1 }
  writeState(id, next)
  return next
}
// Is a showing due right now? First showing on the first open; the second from the repeatAt-th open on.
export function countedDue(id) {
  const cfg = COUNTED[id], st = readState(id)
  if (!cfg || st.done || st.shown >= cfg.max) return false
  return st.shown === 0 || st.opens >= cfg.repeatAt
}
export function markTourShown(id) { const st = readState(id); writeState(id, { ...st, shown: st.shown + 1 }) }
export function markTourDone(id) { const st = readState(id); writeState(id, { ...st, done: true }) }

/* Armed tours ─ switched on by something the user did, e.g. saving a first recipe. */
export function armTour(id) {
  armedMem.add(id)
  try { localStorage.setItem(akey(id), '1') } catch { /* memory still holds */ }
}
export function tourArmed(id) {
  if (armedMem.has(id)) return true
  try { return localStorage.getItem(akey(id)) === '1' } catch { return false }
}

/* Only one tour per recipe visit, so opening a recipe never stacks several spotlights.
   Pass the same token for one visit; the first tour to claim it wins, the rest wait for a later visit. */
let lastVisit = null
export function claimTourSlot(visit) {
  if (lastVisit === visit) return false
  lastVisit = visit
  return true
}

export function resetTour(id) {
  memory.delete(id)
  delete stateMem[id]
  armedMem.delete(id)
  try { localStorage.removeItem(key(id)); localStorage.removeItem(nkey(id)); localStorage.removeItem(akey(id)) } catch { /* ignore */ }
  if (ARMED.has(id)) armTour(id)   // so "reset" lets you see it on the next recipe you open
}

// One line for the admin screen.
export function tourInfo(id) {
  const cfg = COUNTED[id]
  if (cfg) {
    const st = readState(id)
    return `This device: shown ${st.shown} of ${cfg.max}, ${st.opens} recipe${st.opens === 1 ? '' : 's'} opened${st.done ? ', stopped ("Got it")' : ''}`
  }
  if (tourSeen(id)) return 'This device: already seen'
  if (ARMED.has(id)) return tourArmed(id) ? 'This device: waiting for the next recipe you open' : 'This device: not triggered yet (arms after a first recipe is created or saved)'
  return 'This device: not seen yet'
}
