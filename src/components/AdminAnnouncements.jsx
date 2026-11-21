import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { ANNOUNCEMENTS, MAX_VIEWS } from '../announcements'
import { AnnouncementSheet } from './WhatsNew'
import { whatsNewState } from '../utils/whatsNewState'

/* ─────────────────────────────────────────────────────────────────────────────
   AdminAnnouncements — owner tool to try the "what's new" messages by hand.
   • Preview: opens the sheet exactly as people see it. Nothing is saved.
   • Reset my history: forgets that YOUR account saw/dismissed it, so it appears by
     itself the way it would for a user when you go back to your recipes.
   The list comes from src/announcements.js. English only on purpose (owner tool);
   the preview itself uses your current app language (Profile → Language).
   ───────────────────────────────────────────────────────────────────────────── */

const labelStyle = {
  fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)',
}
const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—'
const btn = {
  background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
  borderRadius: 999, padding: '7px 16px', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
}

export default function AdminAnnouncements() {
  const [mine, setMine]       = useState(null)   // my own announcement_views rows, by id (null = loading)
  const [problem, setProblem] = useState('')
  const [preview, setPreview] = useState([])     // announcements shown in the tester sheet
  const [open, setOpen]       = useState(false)
  const [note, setNote]       = useState('')

  const fetchMine = () => supabase.from('announcement_views').select('announcement_id, views, dismissed, last_shown_at')
  function applyMine({ data, error }) {
    if (error) { setProblem("Couldn't read announcement history — has supabase_migration_announcements.sql been run?"); setMine({}); return }
    setProblem('')
    setMine(Object.fromEntries((data || []).map(r => [r.announcement_id, r])))
  }
  useEffect(() => {
    let cancelled = false
    fetchMine().then(res => { if (!cancelled) applyMine(res) })
    return () => { cancelled = true }
  }, [])

  function show(items) { setPreview(items); setOpen(true) }

  async function reset(id) {
    setNote('')
    const { error } = await supabase.from('announcement_views').delete().eq('announcement_id', id)
    if (error) { setNote("Couldn't reset — run the latest supabase_migration_announcements.sql (it adds the delete rule)."); return }
    whatsNewState.lastCheckAt = 0
    setNote('Done. Go back to your recipes and it will appear by itself, as it would for a user.')
    fetchMine().then(applyMine)
  }

  const list = [...ANNOUNCEMENTS].sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt))

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)',
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ ...labelStyle, marginBottom: 4 }}>What's new announcements</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
        Try them here. Preview shows the sheet without saving anything.
      </div>

      {problem && <div style={{ background: 'var(--warn-bg)', color: 'var(--warn-text)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', marginBottom: 12 }}>{problem}</div>}
      {note && <div style={{ background: 'var(--green-light)', color: 'var(--success-text-dark)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', marginBottom: 12 }}>{note}</div>}

      {list.map((a, i) => {
        const m = mine?.[a.id]
        const status = !mine ? 'Loading…'
          : !m ? 'Your account: not shown yet'
          : `Your account: shown ${m.views} of ${MAX_VIEWS} times · last ${fmtDateTime(m.last_shown_at)}${m.dismissed ? ' · "Got it" tapped' : ''}`
        return (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
            fontFamily: 'var(--font-body)',
          }}>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.id}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Released {fmtDate(a.releasedAt)} · {a.audience === 'all' ? 'everyone' : 'accounts created before that'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{status}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => show([a])} style={btn}>Preview</button>
              <button onClick={() => reset(a.id)} style={{ ...btn, color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>Reset my history</button>
            </div>
          </div>
        )
      })}

      {list.length > 1 && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
          <button onClick={() => show(list)} style={btn}>Preview all together</button>
        </div>
      )}

      <AnnouncementSheet items={preview} open={open} onClose={() => setOpen(false)} onGotIt={() => setOpen(false)} />
    </div>
  )
}
