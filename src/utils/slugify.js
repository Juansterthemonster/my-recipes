/**
 * slugify.js
 *
 * Turns a recipe name into a URL-friendly slug for the share link, e.g.
 * "Chicken Tikka Masala!" -> "chicken-tikka-masala".
 *
 * Purely cosmetic — the slug is never read back out of the URL for lookup
 * (see App.jsx's share-link regex), so it doesn't need to be unique and a
 * recipe rename after sharing never breaks an already-shared link.
 *
 * @param {string} name
 * @returns {string} a lowercase, hyphen-separated slug ('' if name is empty
 *   or has no a-z0-9 characters at all)
 */
export function slugify(name) {
  return (name || '')
    .normalize('NFKD')                 // split accented chars into base + mark, e.g. "e-acute" -> "e" + combining mark
    .replace(/[\u0300-\u036f]/g, '')  // drop the combining marks, keeping the base letter
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // anything else (spaces, punctuation, emoji...) becomes a hyphen
    .replace(/^-+|-+$/g, '')           // trim leading/trailing hyphens
}
