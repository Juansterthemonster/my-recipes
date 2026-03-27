/**
 * Mi Sazón — ingredient scaling utility
 *
 * Parses a free-text ingredient amount string, scales it by the given factor,
 * and returns a clean display string using common cooking fractions.
 *
 * Returns { result: string, unscalable: boolean }
 *   result      – scaled display string (or original if we couldn't parse it)
 *   unscalable  – true when no leading numeric token was found (e.g. "to taste", "a pinch")
 */

// Vulgar fraction characters → decimal values
const VULGAR = {
  '½': 0.5,   '⅓': 1 / 3, '⅔': 2 / 3,
  '¼': 0.25,  '¾': 0.75,
  '⅕': 0.2,   '⅖': 0.4,  '⅗': 0.6,  '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

// Fractional part → display string, sorted by value for clean iteration
const FRAC_DISPLAY = [
  [0.125, '⅛'],  [0.25, '¼'],   [1 / 3, '⅓'],  [0.375, '⅜'],
  [0.5,   '½'],  [0.625, '⅝'],  [2 / 3, '⅔'],  [0.75, '¾'],
  [0.875, '⅞'],
]

/** Convert a positive decimal to a readable cooking-fraction string. */
function toDisplayString(n) {
  if (n <= 0) return '0'
  const whole = Math.floor(n)
  const frac  = n - whole

  // Fractional part is negligible → whole number only
  if (frac < 0.06) return whole > 0 ? String(whole) : '0'
  // Fractional part nearly rounds up
  if (frac > 0.94) return String(whole + 1)

  // Find nearest standard cooking fraction
  let best = null, bestDiff = Infinity
  for (const [val, str] of FRAC_DISPLAY) {
    const diff = Math.abs(frac - val)
    if (diff < bestDiff) { bestDiff = diff; best = str }
  }

  // Best match too far off → fall back to one decimal place
  if (bestDiff > 0.08) {
    const rounded = Math.round(n * 10) / 10
    return String(rounded)
  }

  return whole > 0 ? `${whole}${best}` : best
}

/**
 * Parse a leading numeric token from a trimmed amount string.
 * Handles: mixed+vulgar ("1½"), lone vulgar ("½"), ranges ("2–3"),
 *          mixed slash ("1 1/2"), slash fraction ("1/2"), plain numbers ("2", "2.5").
 * Returns { value, value2?, isRange?, rest } or null.
 */
function parseLeading(str) {
  str = str.trim()

  // 1. Mixed number + vulgar fraction: "1½ cups"
  for (const [ch, frac] of Object.entries(VULGAR)) {
    const re = new RegExp(`^(\\d+)${ch}`)
    const m  = str.match(re)
    if (m) return { value: parseInt(m[1]) + frac, rest: str.slice(m[0].length) }
  }

  // 2. Lone vulgar fraction: "½ tsp"
  for (const [ch, frac] of Object.entries(VULGAR)) {
    if (str.startsWith(ch)) return { value: frac, rest: str.slice(ch.length) }
  }

  // 3. Range: "2-3 cups" or "2–3 cups"
  const range = str.match(/^(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+(?:\.\d+)?)/)
  if (range) return {
    value: parseFloat(range[1]), value2: parseFloat(range[2]),
    isRange: true, rest: str.slice(range[0].length),
  }

  // 4. Mixed number with slash fraction: "1 1/2 cups"
  const mixed = str.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/)
  if (mixed) return {
    value: parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]),
    rest: str.slice(mixed[0].length),
  }

  // 5. Slash fraction: "1/2 cup"
  const slashFrac = str.match(/^(\d+)\s*\/\s*(\d+)/)
  if (slashFrac) return {
    value: parseInt(slashFrac[1]) / parseInt(slashFrac[2]),
    rest: str.slice(slashFrac[0].length),
  }

  // 6. Plain integer or decimal: "2 cups", "1.5 tbsp"
  const plain = str.match(/^(\d+(?:\.\d+)?)/)
  if (plain) return { value: parseFloat(plain[1]), rest: str.slice(plain[0].length) }

  return null
}

/**
 * Scale a single ingredient amount string by the given numeric factor.
 *
 * @param {string} amount  – raw amount from the recipe, e.g. "1½ cups", "2-3 cloves", "to taste"
 * @param {number} factor  – scale factor, e.g. 2 to double, 0.5 to halve
 * @returns {{ result: string, unscalable: boolean }}
 */
export function scaleIngredient(amount, factor) {
  if (!amount || typeof amount !== 'string') return { result: amount ?? '', unscalable: false }
  if (!factor || factor === 1)               return { result: amount,       unscalable: false }

  const parsed = parseLeading(amount.trim())
  if (!parsed) return { result: amount, unscalable: true }

  if (parsed.isRange) {
    const s1 = toDisplayString(parsed.value  * factor)
    const s2 = toDisplayString(parsed.value2 * factor)
    return { result: `${s1}–${s2}${parsed.rest}`, unscalable: false }
  }

  return {
    result: `${toDisplayString(parsed.value * factor)}${parsed.rest}`,
    unscalable: false,
  }
}
