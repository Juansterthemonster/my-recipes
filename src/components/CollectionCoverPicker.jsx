import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import CardImg from './CardImg'
import DefaultCoverTile from './DefaultCoverTile'
import CoverTile from './CoverTile'
import GlassDialog from './GlassDialog'
import { loadCollectionPhotos } from '../utils/collectionPhotos'

/* ─── COLLECTION COVER PICKER ───────────────────────────────────────────────
   Opened from a collection card's menu ("Select cover image"). Shows every photo from the
   recipes in the collection; tap one, then Save. "Default" goes back to the plain card.
   onSave(coverUrl | null) does the DB write and closes the dialog.            */
export default function CollectionCoverPicker({ collectionId, current = null, onSave, onClose }) {
  const { t } = useI18n()
  const [options, setOptions] = useState(null)   // null = loading
  const [cover, setCover] = useState(current)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadCollectionPhotos(collectionId).then(urls => { if (!cancelled) setOptions(urls) })
    return () => { cancelled = true }
  }, [collectionId])

  async function handleSave() {
    setSaving(true)
    await onSave(cover)
  }

  return (
    <GlassDialog solid open onClose={onClose} label={t('col.selectCover')} maxWidth={420}>
      {/* iOS-style header: Cancel · title · Save */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={onClose} disabled={saving} style={{
          justifySelf: 'start', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-secondary)',
        }}>{t('col.cancel')}</button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
          {t('col.selectCover')}
        </div>
        <button onClick={handleSave} disabled={saving || options === null} style={{
          justifySelf: 'end', background: 'none', border: 'none', padding: '6px 0',
          cursor: saving ? 'default' : 'pointer', opacity: saving || options === null ? 0.6 : 1,
          fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--green-primary)',
        }}>{saving ? t('col.saving') : t('col.save')}</button>
      </div>

      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
        {t('col.selectCoverHint')}
      </div>

      {options === null ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{t('browse.loading')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingBottom: 4 }}>
          <DefaultCoverTile selected={cover === null} onClick={() => setCover(null)} />
          {options.map(url => (
            <CoverTile key={url} selected={cover === url} onClick={() => setCover(url)} label={t('col.useThisPhoto')} background="var(--green-primary)">
              <CardImg src={url} alt="" sizes="30vw" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </CoverTile>
          ))}
        </div>
      )}
    </GlassDialog>
  )
}
