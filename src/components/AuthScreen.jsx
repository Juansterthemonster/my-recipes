import { useState } from 'react'
import { supabase } from '../supabase'
import { useI18n } from '../i18n'
import { IN_APP_WEBVIEW, GOOGLE_WEB_CLIENT_ID, getNativeSocialLogin } from '../utils/inApp'

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
  const { t } = useI18n()
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
          aria-label={visible ? t('profile.hidePassword') : t('profile.showPassword')}
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
  const { t } = useI18n()
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
        <p style={{ textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{t('legal.privacy')}</a>
          {' · '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{t('legal.terms')}</a>
        </p>
      </div>
    </div>
  )
}

/* ─── AUTH SCREEN ────────────────────────────────────────────────────────────── */
// modes: 'signin' | 'signup' | 'verify' | 'forgot' | 'forgot-sent'
export default function AuthScreen() {
  const { t } = useI18n()
  const [mode, setMode]                   = useState('signin')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [username, setUsername]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  // A failed Google sign-in comes back to this page with an error in the URL (kept by main.jsx)
  const [error, setError]                 = useState(() => {
    try {
      const d = sessionStorage.getItem('sazon_auth_error')
      if (d) { sessionStorage.removeItem('sazon_auth_error'); return `${t('auth.err.google')} (${d})` }
    } catch { /* ignore */ }
    return ''
  })
  // Set by Profile right after an account is deleted; shown once on the sign-in screen
  const [accountDeleted] = useState(() => {
    try {
      const v = sessionStorage.getItem('sazon_account_deleted') === '1'
      if (v) sessionStorage.removeItem('sazon_account_deleted')
      return v
    } catch { return false }
  })

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
      if (!trimmed) { setError(t('auth.err.chooseUsername')); return }
      if (trimmed.length < 3 || trimmed.length > 20) { setError(t('auth.err.usernameLength')); return }
      if (!USERNAME_RE.test(trimmed)) { setError(t('auth.err.usernameChars')); return }
      if (password !== confirm) { setError(t('auth.err.mismatch')); return }
      if (password.length < 6) { setError(t('auth.err.shortPassword')); return }

      setLoading(true)
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', trimmed.toLowerCase()).maybeSingle()
      if (existing) { setError(t('auth.err.taken')); setLoading(false); return }

      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: trimmed.toLowerCase() } },
      })
      setLoading(false)
      if (err) { setError(err.message); return }
      setMode('verify')

    } else {
      if (password.length < 6) { setError(t('auth.err.shortPassword')); return }
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(t('auth.err.badLogin')); return }
    }
  }

  /* ── Forgot password ── */
  /* ── Continue with Google (Supabase OAuth; returns to this site signed in) ── */
  // In the Android app: Android's own account picker (Google blocks its web sign-in in a WebView).
  // The Google ID token goes to Supabase, which signs the person in. A random nonce is hashed for
  // Google and the raw value is given to Supabase, which checks they match.
  async function nativeGoogleSignIn(social) {
    try {
      const rand = crypto.getRandomValues(new Uint8Array(16))
      const rawNonce = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce))
      const hashedNonce = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
      await social.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } })
      const res = await social.login({ provider: 'google', options: { scopes: ['email', 'profile'], nonce: hashedNonce } })
      const idToken = res && res.result && res.result.idToken
      if (!idToken) throw new Error('no id token')
      const { error: err } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: rawNonce })
      if (err) throw err
      // success: onAuthStateChange in App.jsx picks up the new session
    } catch (e) {
      const msg = String((e && e.message) || e || '')
      if (!/cancel/i.test(msg)) setError(`${t('auth.err.google')} (${msg.slice(0, 120)})`)
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    const nativeSocial = IN_APP_WEBVIEW ? getNativeSocialLogin() : null
    if (nativeSocial) { await nativeGoogleSignIn(nativeSocial); return }
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    if (err) { setError(t('auth.err.google')); setLoading(false) }
    // on success the browser is redirected to Google, so nothing more to do here
  }

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
            {t('auth.verifyTitle')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('auth.verifySent', { email })}
          </p>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {t('auth.verifyBody')}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {t('auth.spam')}
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {t('auth.alreadyVerified')}{' '}
          <button onClick={() => switchMode('signin')} style={linkBtn}>{t('auth.signIn')}</button>
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
            {t('auth.forgotTitle')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('auth.forgotIntro')}
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
              <label style={lbl}>{t('auth.email')}</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                style={inp} onFocus={focus} onBlur={blur}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--green-mid)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
            >
              {loading ? t('auth.sending') : t('auth.sendReset')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <button onClick={() => switchMode('signin')} style={linkBtn}>{t('auth.backToSignIn')}</button>
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
            {t('auth.verifyTitle')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('auth.forgotSentIntro', { email })}
          </p>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {t('auth.forgotSentBody')}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {t('auth.spam')}
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <button onClick={() => switchMode('signin')} style={linkBtn}>{t('auth.backToSignIn')}</button>
        </p>
      </AuthShell>
    )
  }

  /* ── Sign in / Sign up ── */
  return (
    <AuthShell>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
          {isSignUp ? t('auth.createTitle') : t('auth.welcomeBack')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {isSignUp ? t('auth.createSub') : t('auth.signInSub')}
        </p>
      </div>

      {accountDeleted && (
        <div style={{ background: 'var(--green-light)', color: 'var(--green-primary)', fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
          {t('auth.accountDeleted')}
        </div>
      )}

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', color: '#A03030', fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px' }}>
        {(!IN_APP_WEBVIEW || !!getNativeSocialLogin()) && (<>
        <button
          type="button" onClick={handleGoogle} disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--white)', color: 'var(--text-primary)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-full)', padding: '11px 24px', fontFamily: 'var(--font-body)',
            fontSize: '0.95rem', fontWeight: 500, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1, transition: 'background 150ms',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#F5F5F2' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {t('auth.google')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />{t('auth.or')}<span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
        </div>
        </>)}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={lbl}>{t('auth.email')}</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              style={inp} onFocus={focus} onBlur={blur}
            />
          </div>

          <div>
            <PasswordField
              label={t('auth.password')}
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
                  {t('auth.forgotLink')}
                </button>
              </div>
            )}
          </div>

          {isSignUp && (
            <>
              <PasswordField
                label={t('auth.confirmPassword')}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                visible={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
              />
              <div>
                <label style={lbl}>{t('auth.chooseUsername')}</label>
                <input
                  type="text" required autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder={t('auth.usernamePlaceholder')}
                  maxLength={20}
                  style={inp} onFocus={focus} onBlur={blur}
                />
                <p style={{ marginTop: 6, fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {t('auth.usernameNote')}
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
              ? (isSignUp ? t('auth.creating') : t('auth.signingIn'))
              : (isSignUp ? t('auth.createAccount') : t('auth.signIn'))}
          </button>

        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
        <button onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} style={linkBtn}>
          {isSignUp ? t('auth.signIn') : t('auth.signUp')}
        </button>
      </p>
    </AuthShell>
  )
}
