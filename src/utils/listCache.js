// In-memory copy of the Browse lists (my recipes, public recipes, collections) so coming back
// from a recipe doesn't re-download everything. Any write to the database (recipes, likes,
// collections, usernames…) marks it stale, and it expires after a couple of minutes so other
// people's new recipes still show up. Cleared by a page reload (e.g. pull-to-refresh).
const MAX_AGE_MS = 2 * 60 * 1000
let cache = null
let dirty = false

export const markListDirty = () => { dirty = true }
export const beginListFetch = () => { dirty = false }

export function setListCache(userId, data) {
  cache = { userId, at: Date.now(), ...data }
}

export function getListCache(userId) {
  if (!cache || cache.userId !== userId || dirty) return null
  if (Date.now() - cache.at > MAX_AGE_MS) return null
  return cache
}
