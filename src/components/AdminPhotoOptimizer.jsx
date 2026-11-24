import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import AdminAccordion from './AdminAccordion'

/* AdminPhotoOptimizer — shows the weekly photo-optimizer cron (api/optimize-photos.js):
   when it last ran, how many photos it optimized, and a "Run now" button.
   Rows come from photo_optimization_runs (admins only). English only on purpose (owner tool). */

const STALE_DAYS = 8 // weekly job: amber if nothing has run for longer than this

const btn = {
  background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
  borderRadius: 999, padding: '7px 16px', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
}

function ago(iso, now) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 48) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} days ago`
}

function when(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function describe(r) {
  if (r.error) return `Error: ${r.error}`
  const bits = [r.optimized === 0 ? 'Nothing to optimize' : `${r.optimized} photo${r.optimized === 1 ? '' : 's'} optimized (${r.copies_made} copies)`]
  if (r.failed) bits.push(`${r.failed} failed`)
  if (r.remaining) bits.push(`${r.remaining} still waiting`)
  return bits.join(' · ')
}

export default function AdminPhotoOptimizer() {
  const [runs, setRuns] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [now] = useState(() => Date.now())

  const [tick, setTick] = useState(0)

  useEffect(() => {
    let on = true
    supabase.from('photo_optimization_runs').select('*').order('ran_at', { ascending: false }).limit(8)
      .then(({ data, error }) => {
        if (!on) return
        setRuns(error ? [] : data || [])
        if (error) setNote('Could not load runs. Has supabase_migration_photo_runs.sql been run?')
      })
    return () => { on = false }
  }, [tick])

  async function runNow() {
    setBusy(true); setNote('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/optimize-photos', {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNote(res.status === 404 ? 'Run now only works on the deployed site, not local dev.' : (out.error || `Run failed (${res.status})`))
      } else {
        setNote(`${describe(out)}${out.remaining ? '. Run again to continue.' : ''}${out.logged ? '' : ' (not logged: SUPABASE_SERVICE_ROLE_KEY missing)'}`)
      }
    } catch (e) {
      setNote(String(e?.message || e))
    }
    setBusy(false)
    setTick(t => t + 1)
  }

  const last = runs?.[0]
  const stale = last && now - new Date(last.ran_at).getTime() > STALE_DAYS * 86400000
  const bad = last && (last.error || last.failed > 0)
  const state = !last ? 'amber' : stale || bad ? 'amber' : 'green'
  const headline = !runs ? 'Loading…'
    : !last ? 'No runs yet. Photos from the iPhone app get their small copies once the job runs.'
    : stale ? `No run for more than ${STALE_DAYS} days. Check the cron job in Vercel.`
    : bad ? 'Last run had problems.'
    : 'Running on schedule.'

  return (
    <AdminAccordion title="Photo optimizer" meta={last ? `ran ${ago(last.ran_at, now)}` : null}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, marginTop: 6, flexShrink: 0, background: state === 'green' ? '#2E8B57' : '#D9A21B' }} />
        <span>{headline}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 12px' }}>
        Runs weekly (Sundays). Creates 640, 960 and 1280 px copies for photos that don't have them, so cards stay sharp and light.
      </div>
      {note && <div style={{ background: 'var(--green-light)', color: 'var(--success-text-dark)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', marginBottom: 12 }}>{note}</div>}
      <button onClick={runNow} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1, cursor: busy ? 'default' : 'pointer' }}>
        {busy ? 'Running…' : 'Run now'}
      </button>
      {runs?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {runs.map((r, i) => (
            <div key={r.id} style={{ padding: '9px 0', borderTop: i === 0 ? '1px solid var(--border-soft)' : '1px solid var(--border-soft)', fontFamily: 'var(--font-body)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {when(r.ran_at)} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {r.trigger === 'cron' ? 'weekly' : 'manual'}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{describe(r)}</div>
            </div>
          ))}
        </div>
      )}
    </AdminAccordion>
  )
}
