import { useState } from 'react'
import { supabase } from '../supabase'

/* ─── SHARED STYLES (mirrors AuthScreen) ─────────────────────────────────────── */
const inp = {
  width: '100%', background: 'var(--white)', border: '1.5px solid var(--border)',
  borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '1rem',
  color: 'var(--text-primary)', padding: '10px 14px', outline: 'none',
  transition: 'border-color 180ms', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6,
  fontFamily: 'var(--font-body)',
}
const btnPrimary = {
  width: '100%', background: 'var(--green-primary)', color: 'var(--text-on-dark)',
  border: 'none', borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', fontWeight: 500, padding: '12px 22px',
  cursor: 'pointer', transition: 'background 180ms', letterSpacing: '0.02em',
}

function focus(e) { e.target.style.borderColor = '#999' }
function blur(e)  { e.target.style.borderColor = 'var(--border)' }

/* ─── EYE ICON ───────────────────────────────────────────────────────────────── */
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/* ─── PASSWORD FIELD ─────────────────────────────────────────────────────────── */
function PasswordField({ label, value, onChange, autoComplete, visible, onToggle }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          style={{ ...inp, paddingRight: 42 }}
          onFocus={focus}
          onBlur={blur}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
            borderRadius: 4, transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </div>
  )
}

/* ─── RESET PASSWORD ─────────────────────────────────────────────────────────── */
export default function ResetPassword({ onDone }) {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError('Something went wrong. Your reset link may have expired — please request a new one.')
      return
    }

    // Session is already active after updateUser; hand off to app
    onDone()
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>

      {/* Nav */}
      <div
        style={{ background: '#F9F6F0', position: 'sticky', top: 0, zIndex: 10 }}
        className="
          px-5 py-[14px] flex items-center justify-between
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '1.15rem', fontWeight: 800,
          color: '#0C3D4E', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
        }}>MI SAZÓN</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 420, margin: '20px auto 0', padding: '0 20px 40px' }}>

        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 400,
            fontSize: '1.8rem', color: 'var(--text-primary)',
            lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6,
          }}>
            Choose a new password
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Make it something you'll remember.
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FFF0F0', border: '1px solid #F5BABA', color: '#A03030',
            fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8,
            fontFamily: 'var(--font-body)', marginBottom: 16,
          }}>{error}</div>
        )}

        <div style={{
          background: 'var(--white)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-soft)', padding: '24px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <PasswordField
              label="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              visible={showPassword}
              onToggle={() => setShowPassword(v => !v)}
            />

            <PasswordField
              label="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              visible={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
            />

            <button
              type="submit" disabled={loading}
              style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--green-mid)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
            >
              {loading ? 'Saving…' : 'Set new password'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
