// Pulls a recipe out of a web page's schema.org/Recipe data (the JSON-LD block almost every recipe
// site includes for Google). Pure functions, no network: unit-tested by scripts/test-import-recipe.mjs.
// Returns raw strings only; the app turns ingredient lines into { name, amount } with its own parser.

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', eacute: 'é',
  egrave: 'è', agrave: 'à', ccedil: 'ç', ntilde: 'ñ', times: '×' }

export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      try { return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : m } catch { return m }
    }
    return NAMED[e.toLowerCase()] ?? m
  })
}

const oneLine = s => decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

// "<br>", "</p>" and "</li>" are line breaks; every other tag is dropped
function toLines(s) {
  return decodeEntities(String(s ?? '').replace(/<\s*br\s*\/?>|<\/\s*(p|li|div)\s*>/gi, '\n').replace(/<[^>]*>/g, ' '))
    .split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** ISO 8601 duration ("PT1H30M", "P0DT45M") → minutes, or null */
export function parseDuration(v) {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
  if (!m) return null
  const mins = (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) + Math.round((+m[4] || 0) / 60)
  return mins > 0 ? mins : null
}

function firstInt(v) {
  for (const x of [].concat(v ?? [])) {
    if (typeof x === 'number' && x > 0) return Math.round(x)
    const m = String(x ?? '').match(/\d+/)
    if (m && +m[0] > 0) return +m[0]
  }
  return null
}

const typeList = n => [].concat(n?.['@type'] ?? []).map(String)

// Every JSON-LD block on the page, parsed (a malformed block is skipped, never fatal)
function jsonLdNodes(html) {
  const nodes = []
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html))) {
    let txt = m[1].trim().replace(/^<!--/, '').replace(/-->$/, '').trim()
    if (txt.startsWith('<![CDATA[')) txt = txt.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
    let data
    try { data = JSON.parse(txt) } catch {
      try { data = JSON.parse([...txt].map(ch => (ch.charCodeAt(0) < 32 ? ' ' : ch)).join('')) } catch { continue }
    }
    const walk = n => {
      if (!n || typeof n !== 'object') return
      if (Array.isArray(n)) { n.forEach(walk); return }
      nodes.push(n)
      if (n['@graph']) walk(n['@graph'])
      if (n.mainEntity) walk(n.mainEntity)
      if (n.mainEntityOfPage && typeof n.mainEntityOfPage === 'object') walk(n.mainEntityOfPage)
    }
    walk(data)
  }
  return nodes
}

function instructionSteps(ri) {
  const out = []
  const walk = n => {
    if (n == null) return
    if (typeof n === 'string') { out.push(...toLines(n)); return }
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object') {
      if (n.itemListElement) { walk(n.itemListElement); return }          // HowToSection: take its steps
      const text = n.text || n.description || n.name
      if (text) out.push(...toLines(text))
    }
  }
  walk(ri)
  return out
}

function metaContent(html, prop) {
  const re = new RegExp(`<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag ? oneLine(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? '') : ''
}

/**
 * @returns {null | { name, description, ingredients: string[], steps: string[], serves, activeMins, totalMins,
 *                    cuisine, siteName }}
 */
export function extractRecipe(html) {
  const node = jsonLdNodes(String(html ?? '')).find(n => typeList(n).includes('Recipe'))
  if (!node) return null

  const ingredients = [].concat(node.recipeIngredient ?? node.recipeIngredients ?? [])
    .flatMap(i => (typeof i === 'string' ? toLines(i) : []))
  const steps = instructionSteps(node.recipeInstructions)
  if (!ingredients.length && !steps.length) return null

  const prep = parseDuration(node.prepTime)
  const cook = parseDuration(node.cookTime)
  const total = parseDuration(node.totalTime) ?? ((prep || cook) ? (prep || 0) + (cook || 0) : null)

  let description = oneLine(node.description)
  if (description.length > 500) description = description.slice(0, 500).replace(/\s+\S*$/, '') + '…'

  return {
    name: oneLine(typeof node.name === 'string' ? node.name : '') || metaContent(html, 'og:title'),
    description,
    ingredients,
    steps,
    serves: firstInt(node.recipeYield),
    activeMins: prep,
    totalMins: total,
    cuisine: oneLine([].concat(node.recipeCuisine ?? [])[0] ?? ''),
    siteName: metaContent(html, 'og:site_name'),
  }
}
