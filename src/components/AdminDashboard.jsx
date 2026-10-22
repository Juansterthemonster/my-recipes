import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { getLastSeen, markSeen } from '../utils/adminSeen'

/* ─────────────────────────────────────────────────────────────────────────────
   AdminDashboard — owner-only overview of every account.
   The data comes from the admin_user_stats() database function, which checks
   the caller against the `admins` table; anyone else gets an error.
   English only on purpose (owner tool).
   ───────────────────────────────────────────────────────────────────────────── */

const COLUMNS = [
  { key: 'username',            label: 'Username',      num: false },
  { key: 'email',               label: 'Email',         num: false },
  { key: 'signed_up',           label: 'Signed up',     num: false },
  { key: 'recipe_count',        label: 'Recipes',       num: true  },
  { key: 'public_recipe_count', label: 'Public',        num: true  },
  { key: 'liked_count',         label: 'Liked',         num: true  },
  { key: 'collection_count',    label: 'Collections',   num: true  },
]

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—'

const card = {
  background: 'var(--white)', borderRadius: 'var(--r-lg)',
  border: '1px solid var(--border-soft)', padding: '20px 24px',
}

export default function AdminDashboard({ onBack }) {
  const [rows, setRows]       = useState(null)
  const [error, setError]     = useState('')
  const [sortKey, setSortKey] = useState('signed_up')
  const [sortDir, setSortDir] = useState('desc')
  const [loadedAt] = useState(() => Date.now())
  const [recent, setRecent]   = useState(null)
  const [lastSeen]  = useState(() => getLastSeen())   // value from BEFORE this visit

  useEffect(() => {
    let cancelled = false
    supabase.rpc('admin_user_stats').then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message || 'Could not load the dashboard.')
      else setRows(data || [])
    })
    supabase.rpc('admin_recent_recipes', { p_limit: 10 }).then(({ data, error }) => {
      if (cancelled) return
      if (!error) { setRecent(data || []); markSeen() }
    })
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(() => {
    if (!rows) return []
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = a[sortKey], y = b[sortKey]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number') {
        return (Number(x) - Number(y)) * dir
      }
      return String(x).localeCompare(String(y)) * dir
    })
  }, [rows, sortKey, sortDir])

  const totals = useMemo(() => {
    const r = rows || []
    const sum = k => r.reduce((n, x) => n + Number(x[k] || 0), 0)
    const weekAgo = loadedAt - 7 * 24 * 3600 * 1000
    return [
      { label: 'Accounts',         value: r.length },
      { label: 'New this week',    value: r.filter(x => new Date(x.signed_up).getTime() >= weekAgo).length },
      { label: 'Recipes',          value: sum('recipe_count') },
      { label: 'Public recipes',   value: sum('public_recipe_count') },
      { label: 'Likes',            value: sum('liked_count') },
      { label: 'Collections',      value: sum('collection_count') },
    ]
  }, [rows, loadedAt])

  function toggleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'username' ? 'asc' : 'desc') }
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="px-4 lg:px-10" style={{ padding: '16px 0 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 600,
          color: '#0C3D4E', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Profile
        </button>
      </div>

      <div className="mx-4 mt-4 lg:mx-10">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          App dashboard
        </h1>

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', borderRadius: 8, padding: '10px 14px', color: '#A03030', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!error && !rows && (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Loading…</div>
        )}

        {rows && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
              {totals.map(s => (
                <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── New recipes feed ── */}
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
                New recipes{recent && lastSeen > 0 && recent.filter(r => new Date(r.created_at).getTime() > lastSeen).length > 0
                  ? ` · ${recent.filter(r => new Date(r.created_at).getTime() > lastSeen).length} since your last visit` : ''}
              </div>
              {!recent && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>Loading…</div>}
              {recent && recent.length === 0 && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>No recipes yet.</div>}
              {recent && recent.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recent.map((r, i) => {
                    const isNew = lastSeen > 0 && new Date(r.created_at).getTime() > lastSeen
                    return (
                      <div key={r.recipe_id} style={{
                        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                        padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                        fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          {isNew && (
                            <span style={{ background: '#0C3D4E', color: '#F9F6F0', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 999, marginRight: 8, verticalAlign: 'middle' }}>NEW</span>
                          )}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.recipe_name || '(untitled)'}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}by {r.author_username ? `@${r.author_username}` : '(no username)'}
                          </span>
                          {r.is_copy && <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}> · saved from another recipe</span>}
                          {!r.is_public && <span style={{ color: 'var(--text-tertiary)' }}> · private</span>}
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmtDateTime(r.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.88rem', minWidth: 720 }}>
                <thead>
                  <tr>
                    {COLUMNS.map(c => (
                      <th key={c.key} style={{ textAlign: c.num ? 'right' : 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                        <button onClick={() => toggleSort(c.key)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: sortKey === c.key ? '#0C3D4E' : 'var(--text-tertiary)',
                        }}>
                          {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.profile_id}>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {r.username ? `@${r.username}` : <span style={{ color: 'var(--text-tertiary)' }}>(no username)</span>}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>{r.email || '—'}</td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.signed_up)}</td>
                      {['recipe_count', 'public_recipe_count', 'liked_count', 'collection_count'].map(k => (
                        <td key={k} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', textAlign: 'right', color: 'var(--text-primary)' }}>{Number(r[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
