import { useState } from 'react'
import { useI18n } from '../i18n'
import { parseIngredientText } from '../utils/parseIngredients'

/* ─────────────────────────────────────────────────────────────────────────────
   PasteIngredientsModal
   Step 1: paste text.  Step 2: preview the parsed lines (amount / name /
   optional editable, lines removable).  onAdd receives
   [{ label, items: [{ name, amount, optional }] }].
   ───────────────────────────────────────────────────────────────────────────── */

const field = {
  width: '100%', boxSizing: 'border-box', background: 'var(--white)',
  border: '1.5px solid var(--border-soft)', borderRadius: 8,
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-primary)',
  padding: '8px 10px', outline: 'none',
}
const primaryBtn = {
  background: '#0C3D4E', color: '#F9F6F0', border: 'none', borderRadius: 'var(--r-full)',
  fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500, padding: '10px 20px', cursor: 'pointer',
}
const ghostBtn = {
  background: 'none', color: 'var(--text-secondary)', border: '1.5px solid var(--border-soft)',
  borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
  fontWeight: 500, padding: '10px 20px', cursor: 'pointer',
}

export default function PasteIngredientsModal({ onAdd, onClose }) {
  const { t } = useI18n()
  const [text, setText]     = useState('')
  const [groups, setGroups] = useState(null)   // null = step 1

  const count = groups ? groups.reduce((n, g) => n + g.items.length, 0) : 0

  function updateItem(gi, ii, patch) {
    setGroups(gs => gs.map((g, a) => a !== gi ? g : { ...g, items: g.items.map((it, b) => b !== ii ? it : { ...it, ...patch }) }))
  }
  function removeItem(gi, ii) {
    setGroups(gs => gs
      .map((g, a) => a !== gi ? g : { ...g, items: g.items.filter((_, b) => b !== ii) })
      .filter(g => g.items.length > 0))
  }
  function updateLabel(gi, label) {
    setGroups(gs => gs.map((g, a) => a !== gi ? g : { ...g, label }))
  }
  function handleAdd() {
    const cleaned = groups
      .map(g => ({ ...g, items: g.items.filter(it => it.name.trim() || it.amount.trim()) }))
      .filter(g => g.items.length > 0)
    if (cleaned.length) onAdd(cleaned)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={t('paste.title')}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        style={{
          background: '#F9F6F0', borderRadius: 16, padding: '24px 22px',
          width: 'min(600px, 100%)', maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
          {t('paste.title')}
        </div>

        {!groups ? (
          <>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {t('paste.hint')}
            </p>
            <textarea
              autoFocus value={text} onChange={e => setText(e.target.value)}
              placeholder={t('paste.placeholder')} rows={9}
              style={{ ...field, resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn}>{t('paste.cancel')}</button>
              <button
                type="button" disabled={!text.trim()}
                onClick={() => setGroups(parseIngredientText(text))}
                style={{ ...primaryBtn, opacity: text.trim() ? 1 : 0.5, cursor: text.trim() ? 'pointer' : 'default' }}
              >{t('paste.preview')}</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {t('paste.reviewHint')}
            </p>

            {count === 0 && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                {t('paste.empty')}
              </p>
            )}

            {groups.map((g, gi) => (
              <div key={gi} style={{ background: 'var(--white)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 12 }}>
                {g.label !== '' && (
                  <input
                    value={g.label} onChange={e => updateLabel(gi, e.target.value)}
                    aria-label={t('paste.group')} placeholder={t('paste.group')}
                    style={{ ...field, fontWeight: 600, marginBottom: 10 }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {g.items.map((it, ii) => (
                    <div key={ii}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={it.amount} onChange={e => updateItem(gi, ii, { amount: e.target.value })}
                          aria-label={t('paste.amount')} placeholder={t('paste.amount')}
                          style={{ ...field, flex: '0 0 32%', minWidth: 0 }}
                        />
                        <input
                          value={it.name} onChange={e => updateItem(gi, ii, { name: e.target.value })}
                          aria-label={t('paste.name')} placeholder={t('paste.name')}
                          style={{ ...field, flex: 1, minWidth: 0 }}
                        />
                        <button
                          type="button" onClick={() => removeItem(gi, ii)} aria-label={t('paste.remove')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.2rem', lineHeight: 1, padding: '4px 6px' }}
                        >×</button>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 5, cursor: 'pointer' }}>
                        <input
                          type="checkbox" checked={it.optional}
                          onChange={e => updateItem(gi, ii, { optional: e.target.checked })}
                          style={{ width: 15, height: 15, accentColor: 'var(--green-primary)' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{t('paste.optional')}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setGroups(null)} style={ghostBtn}>{t('paste.back')}</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} style={ghostBtn}>{t('paste.cancel')}</button>
                <button
                  type="button" disabled={count === 0} onClick={handleAdd}
                  style={{ ...primaryBtn, opacity: count ? 1 : 0.5, cursor: count ? 'pointer' : 'default' }}
                >{t('paste.add', { count })}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
