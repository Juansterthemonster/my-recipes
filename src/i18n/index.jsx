/* ─── i18n ───────────────────────────────────────────────────────────────────
   Tiny zero-dependency translation layer (English / French / Spanish).

   • Strings live in src/i18n/locales/<area>.js as { en: {...}, fr: {...}, es: {...} }
     (one file per screen/area so the three languages sit side by side). All files
     are merged automatically (import.meta.glob), so adding an area needs no wiring.
   • Keys are flat and dotted, e.g. 'profile.saveUsername'.
   • Interpolation: t('toast.addedTo', { name }) with "{name}" in the string.
   • Plurals: define key_one / key_other and call t('browse.recipes', { count }).
     The form is chosen with Intl.PluralRules for the active language.
   • Missing key in the active language → English → the key itself.
   • The user's language is stored in profiles.language (see
     supabase_migration_language.sql). Before sign-in (or if unset) the browser
     language is used. Nothing is stored on the device.

   Canonical values that are saved to the database (diet tags, meal types) stay in
   English; only their on-screen labels are translated (see tagLabel()).        */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'English',  locale: 'en-US' },
  { code: 'fr', label: 'Français', locale: 'fr-CA' },   // Canadian French
  { code: 'es', label: 'Español',  locale: 'es-419' },  // neutral Latin American Spanish
]
export const SUPPORTED = LANGUAGES.map(l => l.code)

// Merge every locales/*.js file: { en: {...all}, fr: {...all}, es: {...all} }
const modules = import.meta.glob('./locales/*.js', { eager: true })
const messages = { en: {}, fr: {}, es: {} }
for (const mod of Object.values(modules)) {
  const area = mod.default || {}
  for (const code of SUPPORTED) Object.assign(messages[code], area[code] || {})
}

export function detectBrowserLanguage() {
  const prefs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || []
  for (const p of prefs) {
    const base = String(p || '').toLowerCase().slice(0, 2)
    if (SUPPORTED.includes(base)) return base
  }
  return 'en'
}

function lookup(lang, key, params) {
  let str = messages[lang]?.[key] ?? messages.en[key]
  if (params && params.count !== undefined) {
    const form = new Intl.PluralRules(LANGUAGES.find(l => l.code === lang)?.locale || 'en').select(params.count)
    str = messages[lang]?.[`${key}_${form}`]
      ?? messages[lang]?.[`${key}_other`]
      ?? messages.en[`${key}_${form}`]
      ?? messages.en[`${key}_other`]
      ?? str
  }
  if (str === undefined) return key
  if (params) str = str.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m))
  return str
}

// Module-level current language so non-React code (utils) can translate too.
let currentLang = detectBrowserLanguage()
export function translate(key, params) { return lookup(currentLang, key, params) }
export function getLanguage() { return currentLang }

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang)

  const setLang = useCallback(next => {
    if (!SUPPORTED.includes(next)) return
    currentLang = next
    setLangState(next)
  }, [])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const value = useMemo(() => {
    const locale = LANGUAGES.find(l => l.code === lang)?.locale || 'en-US'
    return {
      lang,
      setLang,
      t: (key, params) => lookup(lang, key, params),
      // Short date, e.g. "Oct 13, 2026" / "13 oct. 2026" / "13 oct 2026"
      formatDate: iso => iso
        ? new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
        : null,
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/* Display label for a canonical English tag value (diet / meal type).
   Unknown tags (e.g. custom values) are shown as stored. */
export function tagLabel(t, group, value) {
  const key = `tag.${group}.${value}`
  const out = t(key)
  return out === key ? value : out
}
