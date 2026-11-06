import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

/* ─────────────────────────────────────────────────────────────────────────────
   AdminReports — owner-only list of user reports on public recipes.
   Data and actions go through admin_reports(), admin_take_down_recipe() and
   admin_set_report_status(), which all check the caller against `admins`.
   English only on purpose (owner tool).
   ───────────────────────────────────────────────────────────────────────────── */

const REASONS = {
  inappropriate: 'Inappropriate',
  spam:          'Spam',
  copied:        'Copied from someone',
  other:         'Other',
}

const TABS = [
  { key: 'open',      label: 'Unactioned' },
  { key: 'actioned',  label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'all',       label: 'All' },
]

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—'

// What happened to a report: status badge colours + a plain-language line
const STATUS_LABEL = { open: 'Unactioned', actioned: 'Actioned', dismissed: 'Dismissed' }
const STATUS_STYLE = {
  open:      { background: '#FFF4E0', color: '#8A5A00' },
  actioned:  { background: '#E3EED6', color: '#2F5D1F' },
  dismissed: { background: '#EEF1F2', color: '#5A6B70' },
}
const RESOLUTION_TEXT = {
  made_private: 'Recipe made private',
  deleted:      'Recipe deleted',
  dismissed:    'Dismissed — no action taken',
}
function outcomeText(r) {
  if (r.status === 'open') return 'Nothing done yet'
  const what = RESOLUTION_TEXT[r.resolution]
    || (r.status === 'dismissed' ? RESOLUTION_TEXT.dismissed : 'Actioned (what was done was not recorded)')
  return r.resolved_at ? `${what} · ${fmtDateTime(r.resolved_at)}` : what
}

const card = {
  background: 'var(--white)', borderRadius: 'var(--r-lg)',
  border: '1px solid var(--border-soft)', padding: '20px 24px',
}

const labelStyle = {
  fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)',
}

const btn = (kind = 'plain') => ({
  padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
  border: kind === 'danger' ? '1px solid #E0A0A0' : '1px solid var(--border-soft)',
  background: kind === 'primary' ? '#0C3D4E' : 'var(--white)',
  color: kind === 'primary' ? '#F9F6F0' : kind === 'danger' ? '#A03030' : '#0C3D4E',
})

export default function AdminReports({ onOpenRecipe, onCountChange }) {
  const [tab, setTab]       = useState('open')
  const [rows, setRows]     = useState(null)
  const [error, setError]   = useState('')
  const [busyId, setBusyId] = useState(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('admin_reports', { p_status: tab }).then(({ data, error }) => {
      if (cancelled) return
      if (error) { setError(error.message || 'Could not load reports.'); setRows([]); return }
      setRows(data || [])
      if (tab === 'open' && onCountChange) onCountChange((data || []).length)
    })
    return () => { cancelled = true }
  }, [tab, reloadKey, onCountChange])

  function pickTab(key) {
    if (key === tab) return
    setRows(null)
    setError('')
    setTab(key)
  }

  async function run(report, fn) {
    setBusyId(report.report_id)
    setError('')
    const { error } = await fn()
    setBusyId(null)
    if (error) setError(error.message || 'That did not work.')
    else setReloadKey(k => k + 1)
  }

  const makePrivate = r => run(r, () =>
    supabase.rpc('admin_take_down_recipe', { p_recipe_id: r.recipe_id, p_delete: false }))

  const deleteRecipe = r => {
    if (!window.confirm(`Permanently delete "${r.recipe_name || 'this recipe'}"? This cannot be undone.`)) return
    run(r, () => supabase.rpc('admin_take_down_recipe', { p_recipe_id: r.recipe_id, p_delete: true }))
  }

  const setStatus = (r, status) => run(r, () =>
    supabase.rpc('admin_set_report_status', { p_report_id: r.report_id, p_status: status }))

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={labelStyle}>Reports{rows && tab === 'open' ? ` · ${rows.length} unactioned` : ''}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => pickTab(t.key)} style={{
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.74rem', fontWeight: 600,
              border: '1px solid var(--border-soft)',
              background: tab === t.key ? '#0C3D4E' : 'var(--white)',
              color: tab === t.key ? '#F9F6F0' : '#0C3D4E',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', borderRadius: 8, padding: '10px 14px', color: '#A03030', fontFamily: 'var(--font-body)', fontSize: '0.875rem', marginBottom: 10 }}>
          {error}
        </div>
      )}

      {!rows && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>Loading…</div>}
      {rows && rows.length === 0 && !error && (
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>
          {tab === 'open' ? 'No unactioned reports. 🎉' : 'Nothing here.'}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r, i) => {
            const busy = busyId === r.report_id
            const isOpen = r.status === 'open'
            return (
              <div key={r.report_id} style={{
                padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                fontFamily: 'var(--font-body)', fontSize: '0.88rem', opacity: busy ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ background: '#F0F5E8', color: '#0C3D4E', fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, marginRight: 8, verticalAlign: 'middle' }}>
                      {REASONS[r.reason] || r.reason}
                    </span>
                    {r.recipe_exists && r.recipe_is_public && onOpenRecipe ? (
                      <button onClick={() => onOpenRecipe(r.recipe_id)} style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                        font: 'inherit', fontWeight: 600, color: '#0C3D4E',
                        textDecoration: 'underline', textUnderlineOffset: 3,
                      }}>{r.recipe_name || '(untitled)'}</button>
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.recipe_name || '(untitled)'}</span>
                    )}
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {' · '}{!r.recipe_exists ? 'deleted' : r.recipe_is_public ? 'public' : 'private'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmtDateTime(r.created_at)}</div>
                </div>

                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    ...(STATUS_STYLE[r.status] || STATUS_STYLE.open),
                    fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 999,
                  }}>{STATUS_LABEL[r.status] || r.status}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{outcomeText(r)}</span>
                </div>

                <div style={{ color: 'var(--text-secondary)', marginTop: 4, overflowWrap: 'anywhere' }}>
                  Author {r.author_username ? `@${r.author_username}` : '(unknown)'}
                  {r.author_email ? ` · ${r.author_email}` : ''}
                  {Number(r.author_open_reports) >= 2 && (
                    <span style={{ color: '#A03030', fontWeight: 600 }}> · {Number(r.author_open_reports)} open reports on this author</span>
                  )}
                </div>
                <div style={{ color: 'var(--text-tertiary)', marginTop: 2, fontSize: '0.8rem', overflowWrap: 'anywhere' }}>
                  Reported by {r.reporter_username ? `@${r.reporter_username}` : '(unknown)'}{r.reporter_email ? ` · ${r.reporter_email}` : ''}
                </div>
                {r.note && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--green-tint)', borderRadius: 8, color: 'var(--text-primary)', fontStyle: 'italic', overflowWrap: 'anywhere' }}>
                    “{r.note}”
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {isOpen && r.recipe_exists && r.recipe_is_public && (
                    <button disabled={busy} onClick={() => makePrivate(r)} style={btn('primary')}>Make private</button>
                  )}
                  {r.recipe_exists && (
                    <button disabled={busy} onClick={() => deleteRecipe(r)} style={btn('danger')}>Delete recipe</button>
                  )}
                  {isOpen
                    ? <button disabled={busy} onClick={() => setStatus(r, 'dismissed')} style={btn()}>Dismiss</button>
                    : <button disabled={busy} onClick={() => setStatus(r, 'open')} style={btn()}>Reopen</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
