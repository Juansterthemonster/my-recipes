import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { getLastSeen, markSeen } from '../utils/adminSeen'
import AdminReports from './AdminReports'
import AdminAnnouncements from './AdminAnnouncements'
import AdminTours from './AdminTours'

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
  { key: 'platforms',           label: 'Platform',      num: false },
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

const PLATFORM_LABEL = { web: 'Web', android: 'Android', ios: 'iOS' }

// Which platforms an account has used. Empty = hasn't opened a build that reports it yet.
function PlatformBadges({ platforms }) {
  const list = (platforms || []).filter(p => PLATFORM_LABEL[p])
  if (!list.length) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {list.map(p => (
        <span key={p} style={{
          fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-full)',
          background: 'var(--green-light)', color: 'var(--text-primary)', whiteSpace: 'nowrap',
        }}>{PLATFORM_LABEL[p]}</span>
      ))}
    </span>
  )
}

const card = {
  background: 'var(--surface)', borderRadius: 'var(--r-lg)',
  border: '1px solid var(--border-soft)', padding: '20px 24px',
}

// True on phone-sized screens (the users table becomes a stack of cards there).
function useIsMobile(maxWidth = 640) {
  const query = `(max-width: ${maxWidth - 1}px)`
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = e => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return mobile
}

const labelStyle = {
  fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)',
}

export default function AdminDashboard({ onBack, onOpenRecipe }) {
  const isMobile = useIsMobile()
  const [rows, setRows]       = useState(null)
  const [error, setError]     = useState('')
  const [sortKey, setSortKey] = useState('signed_up')
  const [sortDir, setSortDir] = useState('desc')
  const [loadedAt] = useState(() => Date.now())
  const [recent, setRecent]   = useState(null)
  const [lastSeen]  = useState(() => getLastSeen())   // value from BEFORE this visit
  const [page, setPage]   = useState(() => window.history.state?.adminPage === 'users' ? 'users' : 'overview')       // 'overview' | 'users' (the full list, its own page)
  const [query, setQuery] = useState('')

  // The full users list is its own history entry, so the phone's back button returns to the overview.
  useEffect(() => {
    const onPop = e => setPage(e.state?.adminPage === 'users' ? 'users' : 'overview')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function openUsers() {
    window.history.pushState({ ...(window.history.state || {}), adminPage: 'users' }, '', '#admin-users')
    setPage('users'); window.scrollTo(0, 0)
  }

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
      const x = Array.isArray(a[sortKey]) ? (a[sortKey].join(',') || null) : a[sortKey]
      const y = Array.isArray(b[sortKey]) ? (b[sortKey].join(',') || null) : b[sortKey]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number') {
        return (Number(x) - Number(y)) * dir
      }
      return String(x).localeCompare(String(y)) * dir
    })
  }, [rows, sortKey, sortDir])

  const newest = useMemo(
    () => [...(rows || [])].sort((a, b) => new Date(b.signed_up) - new Date(a.signed_up)).slice(0, 15),
    [rows])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(r => `${r.username || ''} ${r.email || ''}`.toLowerCase().includes(q))
  }, [sorted, query])

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
      { label: 'On Android',       value: r.filter(x => x.platforms?.includes('android')).length },
      { label: 'On iOS',           value: r.filter(x => x.platforms?.includes('ios')).length },
      { label: 'On web',           value: r.filter(x => x.platforms?.includes('web')).length },
    ]
  }, [rows, loadedAt])

  function toggleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'username' ? 'asc' : 'desc') }
  }

  const renderUsers = (list, sortable) => (
    <>

            {isMobile ? (
              <>
                {sortable && <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                  <select
                    value={sortKey} onChange={e => { setSortKey(e.target.value); setSortDir(e.target.value === 'username' ? 'asc' : 'desc') }}
                    aria-label="Sort users by"
                    style={{
                      flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-soft)',
                      background: 'var(--surface)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                    }}
                  >
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>Sort: {c.label}</option>)}
                  </select>
                  <button
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    aria-label={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                    style={{
                      padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--surface)',
                      color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600,
                    }}
                  >{sortDir === 'asc' ? '↑' : '↓'}</button>
                </div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {list.map(r => (
                    <div key={r.profile_id} style={{ ...card, padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', overflowWrap: 'anywhere' }}>
                        {r.username ? `@${r.username}` : <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(no username)</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2, overflowWrap: 'anywhere' }}>{r.email || '—'}</div>
                      <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: 2 }}>Signed up {fmtDate(r.signed_up)}</div>
                      <div style={{ marginTop: 8 }}><PlatformBadges platforms={r.platforms} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sortable ? 4 : 2}, 1fr)`, gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                        {[['Recipes', 'recipe_count'], ['Public', 'public_recipe_count'], ['Liked', 'liked_count'], ['Collections', 'collection_count']].filter(([, k]) => sortable || k === 'recipe_count' || k === 'public_recipe_count').map(([label, k]) => (
                          <div key={k} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>{Number(r[k])}</div>
                            <div style={{ ...labelStyle, fontSize: '0.56rem', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
            <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.88rem', minWidth: 560 }}>
                <thead>
                  <tr>
                    {COLUMNS.filter(c => sortable || (c.key !== 'liked_count' && c.key !== 'collection_count')).map(c => (
                      <th key={c.key} style={{ textAlign: c.num ? 'right' : 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                        <button onClick={sortable ? () => toggleSort(c.key) : undefined} style={{
                          background: 'none', border: 'none', cursor: sortable ? 'pointer' : 'default', padding: 0,
                          fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: sortable && sortKey === c.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        }}>
                          {c.label}{sortable && sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.profile_id}>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {r.username ? `@${r.username}` : <span style={{ color: 'var(--text-tertiary)' }}>(no username)</span>}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>{r.email || '—'}</td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.signed_up)}</td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)' }}><PlatformBadges platforms={r.platforms} /></td>
                      {['recipe_count', 'public_recipe_count', 'liked_count', 'collection_count'].filter(k => sortable || k === 'recipe_count' || k === 'public_recipe_count').map(k => (
                        <td key={k} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', textAlign: 'right', color: 'var(--text-primary)' }}>{Number(r[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
    </>
  )

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="mx-4 lg:mx-10" style={{ paddingTop: 16 }}>
        <button onClick={page === 'users' ? () => window.history.back() : onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 600,
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </div>

      <div className="mx-4 mt-4 lg:mx-10">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          {page === 'users' ? 'All users' : 'Admin Dashboard'}
        </h1>

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger-text)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!error && !rows && (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Loading…</div>
        )}

        {rows && (
          <>
{page === 'users' ? (
              <>
                <input
                  type="search" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search username or email"
                  aria-label="Search users"
                  style={{
                    width: '100%', maxWidth: 420, boxSizing: 'border-box', padding: '10px 14px', marginBottom: 12,
                    borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--surface)',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.92rem',
                  }}
                />
                <div style={{ ...labelStyle, margin: '0 2px 10px' }}>
                  {query.trim() ? `${filtered.length} of ${rows.length} users` : `${rows.length} users`}
                </div>
                {renderUsers(filtered, true)}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
                  {/* ── Users: the newest 15 (the full list opens on its own page) ── */}
                  <div className="order-2 lg:order-1 lg:col-span-2">
                    {/* ── Stats: all the tiles in one section, under the same two columns as the users ── */}
                    <div style={{ ...card, padding: '16px 18px', marginBottom: 16 }}>
                      <div style={{ ...labelStyle, marginBottom: 12 }}>Stats</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                        {totals.map(s => (
                          <div key={s.label} style={{ background: 'var(--cream)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>{s.value}</div>
                            <div style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', marginTop: 4 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
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
                            <span style={{ background: 'var(--green-primary)', color: 'var(--on-primary)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 999, marginRight: 8, verticalAlign: 'middle' }}>NEW</span>
                          )}
                          {r.is_public && onOpenRecipe ? (
                            <button
                              onClick={() => onOpenRecipe(r.recipe_id)}
                              style={{
                                background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                                font: 'inherit', fontWeight: 500, color: 'var(--text-primary)',
                                textDecoration: 'underline', textUnderlineOffset: 3,
                              }}
                            >{r.recipe_name || '(untitled)'}</button>
                          ) : (
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.recipe_name || '(untitled)'}</span>
                          )}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}by {r.author_username ? `@${r.author_username}` : '(no username)'}
                          </span>
                          {r.is_copy && <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}> · saved from another recipe</span>}
                          <span style={{ color: r.is_public ? 'var(--violet-accent)' : 'var(--text-tertiary)' }}> · {r.is_public ? 'public' : 'private'}</span>
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmtDateTime(r.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>


                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '8px 2px 10px' }}>
                      <div style={{ ...labelStyle }}>Newest users · {newest.length} of {rows.length}</div>
                      <button onClick={openUsers} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)',
                        textDecoration: 'underline', textUnderlineOffset: 3,
                      }}>View all {rows.length} →</button>
                    </div>
                    {renderUsers(newest, false)}
                  </div>

                  <div className="order-1 lg:order-2 lg:col-span-1">
            {/* ── Reports ── */}
            <AdminReports onOpenRecipe={onOpenRecipe} />

            {/* ── What's new announcements (try them by hand) ── */}
            <AdminAnnouncements />
            <AdminTours />

                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
