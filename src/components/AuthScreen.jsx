import { useState } from 'react'
import { supabase } from '../supabase'

/* ─── SHARED STYLES ──────────────────────────────────────────────────────────── */
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
const linkBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--green-primary)', fontFamily: 'var(--font-body)',
  fontSize: '0.875rem', fontWeight: 500, padding: 0,
  textDecoration: 'underline', textUnderlineOffset: 3,
}

function focus(e) { e.target.style.borderColor = '#999' }
function blur(e)  { e.target.style.borderColor = 'var(--border)' }

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

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

/* ─── SHARED CHROME ──────────────────────────────────────────────────────────── */
function AuthShell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>
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
      <div style={{ maxWidth: 420, margin: '20px auto 0', padding: '0 20px 40px' }}>
        {children}
      </div>
    </div>
  )
}

/* ─── AUTH SCREEN ────────────────────────────────────────────────────────────── */
// modes: 'signin' | 'signup' | 'verify' | 'forgot' | 'forgot-sent'
export default function AuthScreen() {
  const [mode, setMode]                   = useState('signin')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [username, setUsername]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  const isSignUp = mode === 'signup'

  function switchMode(next) {
    setMode(next)
    setError('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  /* ── Sign in / Sign up ── */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isSignUp) {
      const trimmed = username.trim()
      if (!trimmed) { setError('Please choose a username.'); return }
      if (trimmed.length < 3 || trimmed.length > 20) { setError('Username must be between 3 and 20 characters.'); return }
      if (!USERNAME_RE.test(trimmed)) { setError('Username may only contain letters, numbers, underscores, and hyphens.'); return }
      if (password !== confirm) { setError("Passwords don't match."); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

      setLoading(true)
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', trimmed.toLowerCase()).maybeSingle()
      if (existing) { setError('That username is already taken. Please choose another.'); setLoading(false); return }

      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: trimmed.toLowerCase() } },
      })
      setLoading(false)
      if (err) { setError(err.message); return }
      setMode('verify')

    } else {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError('Incorrect email or password.'); return }
    }
  }

  /* ── Forgot password ── */
  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/',
    })
    // Always switch to sent — never reveal whether the email exists
    setLoading(false)
    switchMode('forgot-sent')
  }

  /* ────────────────────────────────── RENDER ── */

  /* ── Verify ── */
  if (mode === 'verify') {
    return (
      <AuthShell>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Check your email
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
          </p>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            Click the link in the email to verify your account, then come back here to sign in.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Can't find it? Check your spam folder.
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already verified?{' '}
          <button onClick={() => switchMode('signin')} style={linkBtn}>Sign in</button>
        </p>
      </AuthShell>
    )
  }

  /* ── Forgot — email form ── */
  if (mode === 'forgot') {
    return (
      <AuthShell>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Reset your password
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', color: '#A03030', fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px' }}>
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inp} onFocus={focus} onBlur={blur}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--green-mid)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <button onClick={() => switchMode('signin')} style={linkBtn}>Back to sign in</button>
        </p>
      </AuthShell>
    )
  }

  /* ── Forgot — sent confirmation ── */
  if (mode === 'forgot-sent') {
    return (
      <AuthShell>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Check your email
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            If that account exists, we've sent a reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
          </p>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            Click the link in the email to choose a new password. It expires in 1 hour.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Can't find it? Check your spam folder.
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <button onClick={() => switchMode('signin')} style={linkBtn}>Back to sign in</button>
        </p>
      </AuthShell>
    )
  }

  /* ── Sign in / Sign up ── */
  return (
    <AuthShell>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {isSignUp ? 'Your recipes, your photos, yours fully.' : 'Sign in to access your recipes.'}
        </p>
      </div>

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', color: '#A03030', fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={lbl}>Email</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inp} onFocus={focus} onBlur={blur}
            />
          </div>

          <div>
            <PasswordField
              label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              visible={showPassword}
              onToggle={() => setShowPassword(v => !v)}
            />
            {/* Forgot link — sign-in only, right-aligned under password */}
            {!isSignUp && (
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', transition: 'color 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--green-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>

          {isSignUp && (
            <>
              <PasswordField
                label="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                visible={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
              />
              <div>
                <label style={lbl}>Choose a username</label>
                <input
                  type="text" required autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. chef_juan"
                  maxLength={20}
                  style={inp} onFocus={focus} onBlur={blur}
                />
                <p style={{ marginTop: 6, fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  This username may be visible to others when you share recipes publicly.
                </p>
              </div>
            </>
          )}

          <button
            type="submit" disabled={loading}
            style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.6 : 1 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--green-mid)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
          >
            {loading
              ? (isSignUp ? 'Creating account…' : 'Signing in…')
              : (isSignUp ? 'Create account' : 'Sign in')}
          </button>

        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <button onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} style={linkBtn}>
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </AuthShell>
  )
}
