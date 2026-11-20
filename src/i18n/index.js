/* Public entry for translations — everything is imported from 'src/i18n' as before.
   (Split into core.js / context.js / I18nProvider.jsx so each React file only exports components.) */
export * from './core'
export { I18nContext, useI18n } from './context'
export { I18nProvider } from './I18nProvider'
