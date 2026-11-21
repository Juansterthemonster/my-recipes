import { useI18n } from '../i18n'
import CoverTile from './CoverTile'

/* The "Default" choice in the collection cover pickers: a miniature of the plain collection card
   (dark teal, small "COLLECTION" eyebrow, name in the display font, bottom-left) — as on iOS. */
export default function DefaultCoverTile({ selected, onClick }) {
  const { t } = useI18n()
  return (
    <CoverTile selected={selected} onClick={onClick} label={t('col.useDefault')} background="var(--fixed-teal)">
      <span style={{
        position: 'absolute', left: 9, right: 9, bottom: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', textAlign: 'left', color: '#fff',
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.47rem', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', marginBottom: 3,
        }}>{t('col.eyebrow')}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, lineHeight: 1.15,
          whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{t('col.default')}</span>
      </span>
    </CoverTile>
  )
}
