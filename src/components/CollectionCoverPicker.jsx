import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import CardImg from './CardImg'
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

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    await onSave(cover)
  }

  const tile = selected => ({
    aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer', padding: 0, overflow: 'hidden',
    border: selected ? '2.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
      <div role="dialog" aria-modal="true" aria-label={t('col.selectCover')} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 301,
        background: '#F9F6F0', borderRadius: 16, padding: '28px 24px',
        width: 'min(380px, calc(100vw - 48px))', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {t('col.selectCover')}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('col.selectCoverHint')}
        </div>

        {options === null ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{t('browse.loading')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            <button
              type="button" onClick={() => setCover(null)}
              aria-label={t('col.useDefault')} aria-pressed={cover === null}
              style={{
                ...tile(cover === null), background: 'var(--white)', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.15, padding: 4,
              }}
            >{t('col.default')}</button>
            {options.map(url => (
              <button
                type="button" key={url} onClick={() => setCover(url)}
                aria-label={t('col.useThisPhoto')} aria-pressed={cover === url}
                style={{ ...tile(cover === url), background: 'var(--green-primary)' }}
              >
                <CardImg src={url} alt="" sizes="30vw" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 'var(--r-full)', background: 'transparent', border: '1.5px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 500,
          }}>{t('col.cancel')}</button>
          <button onClick={handleSave} disabled={saving || options === null} style={{
            padding: '10px 20px', borderRadius: 'var(--r-full)', background: '#0C3D4E', border: 'none', color: '#fff',
            cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600,
            opacity: saving || options === null ? 0.7 : 1,
          }}>{saving ? t('col.saving') : t('col.save')}</button>
        </div>
      </div>
    </>
  )
}
