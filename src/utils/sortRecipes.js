// Sorting for the My Recipes and Explore lists.
// Modes: newest · oldest · az · za · random · opened (My Recipes only) · edited (My Recipes only)
export const MY_SORTS      = ['newest', 'oldest', 'az', 'za', 'random', 'opened', 'edited']
export const EXPLORE_SORTS = ['newest', 'oldest', 'az', 'za', 'random']

// Explore's choice and the shuffle seeds live here (not in React state) so going into a recipe
// and back keeps the same order; a page reload starts again from "newest".
export const sortSession = { explore: 'newest', exploreSeed: 1, mySeed: 1 }

function hash(str) {            // small deterministic string hash (for the shuffle)
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const time = v => (v ? new Date(v).getTime() : 0)

export function sortRecipes(list, mode, { dateOf, seed = 1, locale = 'en' } = {}) {
  const out = [...list]
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '', locale, { sensitivity: 'base' })
  switch (mode) {
    case 'oldest':  return out.sort((a, b) => dateOf(a) - dateOf(b))
    case 'az':      return out.sort(byName)
    case 'za':      return out.sort((a, b) => byName(b, a))
    case 'random':  return out.sort((a, b) => hash(a.id + seed) - hash(b.id + seed))
    // never opened → after the opened ones, newest first
    case 'opened':  return out.sort((a, b) => (time(b.last_opened_at) - time(a.last_opened_at)) || (dateOf(b) - dateOf(a)))
    case 'edited':  return out.sort((a, b) => (time(b.updated_at || b.created_at) - time(a.updated_at || a.created_at)))
    default:        return out.sort((a, b) => dateOf(b) - dateOf(a))   // newest
  }
}
