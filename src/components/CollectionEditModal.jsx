import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useI18n } from '../i18n'
import CardImg from './CardImg'

/* ─── COLLECTION EDIT MODAL ─────────────────────────────────────────────────
   Centred overlay used for both "New collection" and "Edit collection".
   Fields: name (required), description (optional) and — when editing — a cover
   photo picked from the recipes already in the collection.
   Accepts an async onSave({ name, description, cover }) callback — caller is
   responsible for the DB write and for closing the modal.                    */
export default function CollectionEditModal({ title, collectionId = null, initial = {}, onSave, onClose }) {
  const { t } = useI18n()
  const [name,        setName]        = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')
  const [cover,       setCover]       = useState(initial.cover_photo_url || null)
  const [coverOptions, setCoverOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [])

  // Load every photo from the recipes in this collection (edit mode only)
  useEffect(() => {
    if (!collectionId) return
    let cancelled = false
    async function loadPhotos() {
      const { data } = await supabase
        .from('collection_recipes')
        .select('recipes(photo_url, photos)')
        .eq('collection_id', collectionId)
      if (cancelled) return
      const urls = []
      for (const row of data || []) {
        const r = row.recipes
        if (!r) continue
        const list = r.photos?.length ? r.photos : (r.photo_url ? [r.photo_url] : [])
        for (const u of list) if (u && !urls.includes(u)) urls.push(u)
      }
      setCoverOptions(urls)
    }
    loadPhotos()
    return () => { cancelled = true }
  }, [collectionId])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError(t('col.nameRequired')); return }
    setError(null)
    setSaving(true)
    await onSave({ name: trimmed, description: description.trim(), cover })
    // onSave closes the modal; setSaving left true to prevent double-clicks
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--white)',
    border: '1.5px solid var(--border-soft)',
    borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-body)',
    fontSize: '0.95rem', color: 'var(--text-primary)',
    padding: '11px 14px', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301,
        background: '#F9F6F0',
        borderRadius: 16,
        padding: '28px 24px',
        width: 'min(380px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 18,
        }}>{title}</div>

        <label style={labelStyle}>{t('col.name')}</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => { setName(e.target.value); if (error) setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder={t('col.namePlaceholder')}
          maxLength={60}
          style={{ ...fieldStyle, borderColor: error ? '#f5baba' : 'var(--border-soft)', marginBottom: error ? 8 : 16 }}
          onFocus={e => e.target.style.borderColor = error ? '#f5baba' : 'var(--green-primary)'}
          onBlur={e => e.target.style.borderColor = error ? '#f5baba' : 'var(--border-soft)'}
        />

        {error && (
          <div style={{
            fontSize: '0.8rem', color: '#a31621', fontFamily: 'var(--font-body)',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <label style={labelStyle}>{t('col.description')} <span style={{ fontWeight: 400 }}>{t('col.optional')}</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('col.descPlaceholder')}
          maxLength={300}
          rows={3}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.45, marginBottom: 16 }}
          onFocus={e => e.target.style.borderColor = 'var(--green-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
        />

        {/* Cover picker — only when editing a collection that has recipe photos */}
        {collectionId && coverOptions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t('col.cover')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {/* Default collage */}
              <button
                type="button"
                onClick={() => setCover(null)}
                aria-label={t('col.useDefault')}
                aria-pressed={cover === null}
                style={{
                  aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer',
                  border: cover === null ? '2.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
                  background: 'var(--white)', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600,
                  lineHeight: 1.15, padding: 4,
                }}
              >{t('col.default')}</button>
              {coverOptions.map(url => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setCover(url)}
                  aria-label={t('col.useThisPhoto')}
                  aria-pressed={cover === url}
                  style={{
                    aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer', padding: 0, overflow: 'hidden',
                    border: cover === url ? '2.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
                    background: 'var(--green-primary)',
                  }}
                >
                  <CardImg src={url} alt="" sizes="25vw" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: 'transparent', border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 500,
            }}
          >{t('col.cancel')}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: '#0C3D4E',
              border: 'none',
              color: '#fff',
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? t('col.saving') : t('col.save')}</button>
        </div>
      </div>
    </>
  )
}
