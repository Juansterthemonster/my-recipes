import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { useI18n } from '../i18n'
import { useIsPhone } from '../utils/useIsPhone'
import { BottomSheet } from './MobileNav'
import { ANNOUNCEMENTS, MAX_VIEWS, RECENT_DAYS } from '../announcements'
import { whatsNewState } from '../utils/whatsNewState'
import { FROST_FILL, FROST_EDGE, FROST_DIM } from '../utils/glass'

/* ─────────────────────────────────────────────────────────────────────────────
   WhatsNew — the "what's new" sheet (see src/announcements.js for the rules).

   A "visit" = opening the app, or coming back after VISIT_GAP away. An announcement
   is shown at most once per visit: its last_shown_at (saved in announcement_views, so
   it holds across devices and page refreshes) must be older than VISIT_GAP.
   If the table doesn't exist yet (migration not run) or any call fails, nothing is
   shown — this can never get in the way of using the app.
   ───────────────────────────────────────────────────────────────────────────── */

const VISIT_GAP = 30 * 60 * 1000   // 30 minutes
const SHOW_DELAY = 1200            // let the recipes appear first

function Icon({ name }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'share') return (
    <svg {...common}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>
  )
  return (
    <svg {...common}><circle cx="12" cy="12" r="10" /><polygon points="16.2 7.8 13.9 13.9 7.8 16.2 10.1 10.1 16.2 7.8" /></svg>
  )
}

function Content({ items, onGotIt }) {
  const { t } = useI18n()
  return (
    <div style={{ padding: '4px 8px 8px' }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 14,
      }}>{t('ann.eyebrow')}</div>

      {items.map((a, i) => (
        <div key={a.id} style={{
          textAlign: 'center', padding: i === 0 ? '0 0 18px' : '18px 0',
          borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
            background: 'var(--green-light)', color: 'var(--green-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name={a.icon} /></div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2,
            color: 'var(--text-primary)', marginBottom: 8,
          }}>{t(`ann.${a.id}.title`)}</div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.55,
            color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto',
          }}>{t(`ann.${a.id}.body`)}</div>
        </div>
      ))}

      <button onClick={onGotIt} style={{
        width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '13px 16px', borderRadius: 999,
        background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600,
      }}>{t('ann.gotIt')}</button>
    </div>
  )
}

// The sheet itself (also used by the admin dashboard's announcement tester):
// a bottom sheet on phones, a centred card on larger screens.
export function AnnouncementSheet({ items, open, onClose, onGotIt }) {
  const { t } = useI18n()
  const isPhone = useIsPhone()
  const label = t('ann.eyebrow')
  const body = <Content items={items} onGotIt={onGotIt} />
  return isPhone
    ? <BottomSheet glass open={open} onClose={onClose} label={label}>{body}</BottomSheet>
    : <CenteredDialog open={open} onClose={onClose} label={label}>{body}</CenteredDialog>
}

// Desktop / tablet: a centred card instead of a bottom sheet
function CenteredDialog({ open, onClose, label, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: FROST_DIM }} />
      <div role="dialog" aria-modal="true" aria-label={label} style={{
        position: 'relative', width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto',
        ...FROST_FILL, border: `1px solid ${FROST_EDGE}`, borderRadius: 24, padding: '28px 24px 22px',
        boxShadow: '0 18px 50px rgba(6,30,39,0.28), 0 2px 8px rgba(6,30,39,0.10)',
      }}>{children}</div>
    </div>,
    document.body
  )
}

export default function WhatsNew({ session, enabled }) {
  const uid = session?.user?.id
  const createdAt = session?.user?.created_at
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  useEffect(() => { openRef.current = open }, [open])

  // Decide whether to show something: on arrival at the recipe list, and when the app
  // comes back to the foreground after a break.
  useEffect(() => {
    if (!uid || !enabled) return
    let cancelled = false
    let timer = null

    async function check(force = false) {
      if (openRef.current) return
      if (!force && Date.now() - whatsNewState.lastCheckAt < VISIT_GAP) return   // not re-checked every time Browse remounts
      whatsNewState.lastCheckAt = Date.now()
      const now = Date.now()
      const accountAt = createdAt ? new Date(createdAt).getTime() : 0
      const candidates = ANNOUNCEMENTS.filter(a => {
        const rel = new Date(a.releasedAt).getTime()
        if (rel > now || now - rel > RECENT_DAYS * 86400000) return false
        return a.audience === 'all' || (accountAt > 0 && accountAt < rel)
      })
      if (candidates.length === 0) return

      const { data: rows, error } = await supabase
        .from('announcement_views')
        .select('announcement_id, views, dismissed, first_shown_at, last_shown_at')
        .eq('user_id', uid)
        .in('announcement_id', candidates.map(a => a.id))
      if (error || cancelled) return   // table missing or offline → show nothing
      const byId = Object.fromEntries((rows || []).map(r => [r.announcement_id, r]))
      const eligible = candidates
        .filter(a => {
          const r = byId[a.id]
          if (!r) return true
          if (r.dismissed || r.views >= MAX_VIEWS) return false
          return !r.last_shown_at || now - new Date(r.last_shown_at).getTime() >= VISIT_GAP
        })
        .sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt))
      if (eligible.length === 0) return

      timer = setTimeout(async () => {
        if (cancelled || openRef.current) return
        setItems(eligible)
        setOpen(true)
        const iso = new Date().toISOString()
        await supabase.from('announcement_views').upsert(
          eligible.map(a => ({
            user_id: uid, announcement_id: a.id,
            views: (byId[a.id]?.views || 0) + 1,
            dismissed: false,
            first_shown_at: byId[a.id]?.first_shown_at || iso,
            last_shown_at: iso,
          })),
          { onConflict: 'user_id,announcement_id' },
        )
      }, SHOW_DELAY)
    }

    check()
    let hiddenAt = 0
    function onVisibility() {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      if (hiddenAt && Date.now() - hiddenAt >= VISIT_GAP) check(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [uid, enabled, createdAt])

  // "Got it" ends the announcement for good; closing any other way just closes it
  // (it will show once more on a later visit, up to MAX_VIEWS).
  function gotIt() {
    setOpen(false)
    supabase.from('announcement_views').update({ dismissed: true })
      .eq('user_id', uid).in('announcement_id', items.map(a => a.id))
      .then(({ error }) => { if (error) console.warn('Could not save dismissal:', error.message) })
  }
  const close = () => setOpen(false)

  if (items.length === 0) return null
  return <AnnouncementSheet items={items} open={open} onClose={close} onGotIt={gotIt} />
}
