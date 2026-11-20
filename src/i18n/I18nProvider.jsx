/* The provider component. Kept component-only so Vite's Fast Refresh can hot-reload it;
   the translation logic is in core.js and the hook is in context.js (all re-exported by index.js). */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { I18nContext } from './context'
import { LANGUAGES, SUPPORTED, getLanguage, setCurrentLanguage, lookup } from './core'

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getLanguage)

  const setLang = useCallback(next => {
    if (!SUPPORTED.includes(next)) return
    setCurrentLanguage(next)
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
