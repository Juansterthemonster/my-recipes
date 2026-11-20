import { useI18n } from '../i18n'

/* The "Default" choice in the collection cover pickers: a miniature of the plain collection card
   (dark teal, small "COLLECTION" eyebrow, name in the display font, bottom-left). When selected
   it gets an outer ring, because a border would disappear into the teal. */
export default function DefaultCoverTile({ selected, onClick }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('col.useDefault')}
      aria-pressed={selected}
      style={{
        aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer', border: 'none',
        background: '#0C3D4E', color: '#fff', padding: '0 8px 9px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start',
        textAlign: 'left', overflow: 'hidden', minWidth: 0,
        outline: selected ? '2.5px solid #0C3D4E' : 'none', outlineOffset: 2,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', marginBottom: 3,
      }}>{t('col.eyebrow')}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.15 }}>
        {t('col.default')}
      </span>
    </button>
  )
}
