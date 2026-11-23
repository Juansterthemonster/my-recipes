// Vercel serverless function: reads a recipe from a web page link.
//   POST /api/import-recipe   { url }   Authorization: Bearer <the signed-in user's Supabase access token>
//   200 { recipe: {...}, source: { url, host } }
//   4xx/5xx { error: <code> }   codes: unauthorized · invalid_url · rate_limited · no_recipe · fetch_failed
//                                      blocked_address · not_html · too_large · timeout · http_<status>
// Only signed-in users can call it (the token is checked with Supabase), and each user gets a small
// allowance, so it can't be used as an open proxy. The page is fetched with the guards in _lib/safeFetch.js.

import { fetchPage, FetchError } from './_lib/safeFetch.js'
import { extractRecipe } from './_lib/recipeFromHtml.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Best-effort allowance per user: 15 imports per 10 minutes (per server instance)
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 15
const hits = new Map()
function allowed(userId) {
  const now = Date.now()
  const recent = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) { hits.set(userId, recent); return false }
  recent.push(now); hits.set(userId, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k)
  return true
}

async function userIdFor(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } })
    if (!r.ok) return null
    return (await r.json())?.id || null
  } catch { return null }
}

const STATUS = { unauthorized: 401, invalid_url: 400, blocked_address: 400, rate_limited: 429, no_recipe: 422 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const fail = code => res.status(STATUS[code] || 502).json({ error: code })

  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }) }

  const userId = await userIdFor(req)
  if (!userId) return fail('unauthorized')
  if (!allowed(userId)) return fail('rate_limited')

  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (!url || url.length > 2000) return fail('invalid_url')

  try {
    const page = await fetchPage(url)
    const recipe = extractRecipe(page.html)
    if (!recipe) return fail('no_recipe')
    const host = new URL(page.url).hostname.replace(/^www\./, '')
    return res.status(200).json({ recipe, source: { url: page.url, host } })
  } catch (e) {
    return fail(e instanceof FetchError ? e.code : 'fetch_failed')
  }
}
