/**
 * Mi Sazón — paste-ingredients parser
 *
 * Turns a pasted block of text (one ingredient per line) into the shape the
 * recipe form edits: groups of { name, amount, optional }.
 *
 *   "2 cups flour"            → amount "2 cups",      name "flour"
 *   "3 cloves garlic, minced" → amount "3 cloves",    name "garlic, minced"
 *   "1 1/2 tsp salt"          → amount "1 1/2 tsp",   name "salt"
 *   "Salt to taste"           → amount "to taste",    name "Salt"
 *   "Juice of 1 lemon"        → amount "",            name "Juice of 1 lemon"
 *   "Sauce:"                  → starts a new group labelled "Sauce"
 *
 * Understands English, French and Spanish units. Anything it can't split
 * cleanly goes whole into `name` with an empty amount — the preview lets the
 * user fix it before it reaches the recipe.
 */

const VULGAR = '¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞'
// One number: mixed ("1 1/2", "1½"), fraction ("1/2"), decimal ("2.5", "2,5"), vulgar ("½")
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?\\s?[${VULGAR}]?|[${VULGAR}])`
const RANGE_WORD = '(?:-|–|—|to|à|a|al)'
const QTY_RE = new RegExp(`^(${NUM}(?:\\s*${RANGE_WORD}\\s*${NUM})?)`, 'i')

// Units — longest/multiword forms first so "cuillères à soupe" beats "cuillères"
const UNITS = [
  // multiword (fr / es)
  'cuill[eè]res? [àa] soupe', 'cuill[eè]res? [àa] caf[ée]', 'cuill[eè]res? [àa] th[ée]',
  'c\\. ?[àa] ?(?:soupe|s|caf[ée]|th[ée]|c)\\.?', 'cucharadas? soperas?', 'cucharaditas?', 'cucharadas?',
  'fl\\.? oz', 'fluid ounces?',
  // English
  'teaspoons?', 'tablespoons?', 'tsps?\\.?', 'tbsps?\\.?', 'tbs\\.?', 'cups?', 'ounces?', 'oz\\.?', 'pounds?', 'lbs?\\.?',
  'grams?', 'kilograms?', 'kgs?', 'milliliters?', 'millilitres?', 'liters?', 'litres?', 'mls?', 'gr?\\.?', 'l',
  'pinch(?:es)?', 'dash(?:es)?', 'cloves?', 'cans?', 'tins?', 'slices?', 'pieces?', 'bunch(?:es)?', 'sprigs?',
  'sticks?', 'packages?', 'pkgs?\\.?', 'packets?', 'handfuls?', 'heads?', 'stalks?', 'cubes?', 'jars?', 'bottles?',
  'c\\.?',
  // French
  'tasses?', 'gousses?', 'pinc[ée]es?', 'bo[iî]tes?', 'conserves?', 'tranches?', 'morceaux?', 'bottes?', 'brins?',
  'paquets?', 'poign[ée]es?', 'onces?', 'livres?', 'grammes?', 'litres?', 'cl', 'dl', 'filets?',
  // Spanish
  'tazas?', 'dientes?', 'pizcas?', 'latas?', 'rebanadas?', 'rodajas?', 'piezas?', 'manojos?', 'ramas?', 'ramitas?',
  'paquetes?', 'pu[ñn]ados?', 'onzas?', 'libras?', 'gramos?', 'kilos?', 'cabezas?', 'barras?', 'botellas?',
]
const UNIT_RE = new RegExp(`^\\s*(${UNITS.join('|')})(?=[\\s.,;:)/]|$)`, 'i')

const LEAD_BULLET_RE = /^\s*(?:[-*•▪◦·–—]+|\d+[.)])\s+/
const OF_RE = /^\s*(?:of|de|del|d['’])\s*/i
const PAREN_RE = /^\s*(\([^)]*\))/
const OPTIONAL_RE = /\s*[([]?\b(?:optional|optionnel(?:le)?|facultatif|facultative|opcional)\b[)\]]?\s*/i
const TO_TASTE_RE = /[,\s-]*\b(to taste|au go[uû]t|al gusto|as needed|selon le go[uû]t|seg[uú]n sea necesario)\b\.?\s*$/i
const LOOSE_QTY_RE = /^\s*(?:an?|une?|un|una|some|un peu de)\s+(pinch(?:es)?|dash(?:es)?|handful|splash|knob|pincée|pincee|poignée|poignee|pizca|puñado|punado|chorrito)\s*(?:of|de|d['’])?\s+/i

function clean(s) {
  return s.replace(/\s+/g, ' ').replace(/^[\s,;:.-]+/, '').replace(/[\s,;]+$/, '').trim()
}

/** Is this line a group heading such as "Sauce:" or "For the dough"? */
function groupLabel(line) {
  const m = line.match(/^\s*(?:for the |pour la |pour le |pour les |para la |para el |para )?([^:]{1,40}):\s*$/i)
  if (!m || /^\d/.test(line.trim())) return null
  return clean(line.trim().replace(/:\s*$/, ''))
}

export function parseIngredientLine(raw) {
  let line = raw.replace(LEAD_BULLET_RE, '').trim()
  if (!line) return null

  let optional = false
  if (OPTIONAL_RE.test(line)) { optional = true; line = clean(line.replace(OPTIONAL_RE, ' ')) }

  // "salt to taste", "poivre au goût"
  const taste = line.match(TO_TASTE_RE)
  if (taste && !QTY_RE.test(line)) {
    const name = clean(line.replace(TO_TASTE_RE, ''))
    return { name, amount: taste[1].toLowerCase(), optional }
  }

  // "a pinch of salt"
  const loose = line.match(LOOSE_QTY_RE)
  if (loose) {
    const name = clean(line.slice(loose[0].length))
    return { name, amount: clean(loose[0].replace(/\s*(?:of|de|d['’])\s*$/i, '')), optional }
  }

  const q = line.match(QTY_RE)
  if (!q) return { name: clean(line), amount: '', optional }

  let rest = line.slice(q[0].length)
  const parts = [clean(q[1])]

  // "1 (14 oz) can tomatoes"
  const paren = rest.match(PAREN_RE)
  if (paren) { parts.push(paren[1]); rest = rest.slice(paren[0].length) }

  // number must be followed by a space, unit or end ("2eggs" is unusual → treat as is)
  const unit = rest.match(UNIT_RE)
  if (unit) { parts.push(unit[1].trim()); rest = rest.slice(unit[0].length) }

  // glued quantity+unit with nothing else, e.g. "200g" handled by UNIT_RE (\s* prefix)
  rest = rest.replace(OF_RE, '')
  const name = clean(rest)
  if (!name) return { name: clean(line), amount: '', optional }   // number only → keep whole line as name
  return { name, amount: parts.join(' '), optional }
}

/** Parse a pasted block → [{ label, items: [{ name, amount, optional }] }] */
export function parseIngredientText(text) {
  const groups = []
  let current = null
  const start = label => { current = { label, items: [] }; groups.push(current) }

  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim()) continue
    const label = groupLabel(raw.replace(LEAD_BULLET_RE, ''))
    if (label) { start(label); continue }
    const item = parseIngredientLine(raw)
    if (!item) continue
    if (!current) start('')
    current.items.push(item)
  }
  return groups.filter(g => g.items.length > 0)
}
