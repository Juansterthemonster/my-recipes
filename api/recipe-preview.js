// Link previews for shared recipes. vercel.json sends ONLY link-preview crawlers (WhatsApp,
// iMessage, Facebook, Slack…) for /recipe/* here; everyone else gets the normal app.
// Returns a tiny HTML page whose <meta> tags carry the recipe's name, description and photo.
// Only PUBLIC recipes are read, so a private recipe never leaks into a preview.

const SITE = 'https://misazon.app'
const DEFAULT_IMAGE = `${SITE}/icons/icon-512.png`

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// "lemon-chicken-k7x2" | "k7x2" → short code; "slug/<uuid>" | "<uuid>" → id
export function parseRef(p) {
  const uuid = p.match(/(?:^|\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  if (uuid) return ['id', uuid[1].toLowerCase()]
  const code = !p.includes('/') && p.match(/(?:^|-)([a-z0-9]{4})$/i)
  if (code) return ['short_code', code[1].toLowerCase()]
  return null
}

// Use the 960px copy for the preview image (small file; WhatsApp drops big ones)
export function previewImage(url) {
  if (!url) return DEFAULT_IMAGE
  if (/\/mi-sazon\/.*\.(webp|png|jpe?g)$/i.test(url)) return url.replace(/\.(webp|png|jpe?g)$/i, '_960.webp')
  return url
}

export function renderPage({ title, description, image, url }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" type="image/png" sizes="192x192" href="${SITE}/icons/icon-192.png">
<link rel="apple-touch-icon" href="${SITE}/icons/icon-192.png">
<meta property="og:site_name" content="Mi Sazón">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
</head><body><p><a href="${esc(url)}">${esc(title)}</a></p></body></html>`
}

export default async function handler(req, res) {
  const p = String(req.query?.p || '').replace(/^\/+|\/+$/g, '')
  const ref = parseRef(p)
  const url = `${SITE}/recipe/${p}`
  let recipe = null

  try {
    if (ref && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      const q = `${process.env.VITE_SUPABASE_URL}/rest/v1/recipes?select=name,description,photo_url,photos`
        + `&is_public=eq.true&${ref[0]}=eq.${encodeURIComponent(ref[1])}&limit=1`
      const r = await fetch(q, { headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` } })
      if (r.ok) recipe = (await r.json())[0] || null
    }
  } catch (e) {
    console.error('recipe-preview lookup failed:', e)
  }

  const page = recipe
    ? {
        title: `${recipe.name} · Mi Sazón`,
        description: (recipe.description || '').trim().slice(0, 200) || 'A recipe on Mi Sazón.',
        image: previewImage(recipe.photo_url || (Array.isArray(recipe.photos) && recipe.photos[0]) || null),
        url,
      }
    : { title: 'Mi Sazón', description: 'Your personal and social recipe book.', image: DEFAULT_IMAGE, url }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(renderPage(page))
}
