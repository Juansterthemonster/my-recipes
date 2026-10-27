import { createClient } from '@supabase/supabase-js'
import { markListDirty } from './utils/listCache'

// Any write (insert/update/delete) to the data tables marks the cached Browse lists stale, so a
// cached copy is never shown after something changed. Reads, RPC calls and bookkeeping updates
// (Explore "last seen", language) don't count.
function trackingFetch(input, init) {
  try {
    const method = String((init && init.method) || 'GET').toUpperCase()
    const url = String(typeof input === 'string' ? input : (input && input.url) || '')
    if (method !== 'GET' && method !== 'HEAD' && url.includes('/rest/v1/') && !url.includes('/rest/v1/rpc/')) {
      const body = typeof (init && init.body) === 'string' ? init.body : ''
      if (!/explore_seen_at|"language"/.test(body)) markListDirty()
    }
  } catch { /* never block a request */ }
  return fetch(input, init)
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { global: { fetch: trackingFetch } }
)
