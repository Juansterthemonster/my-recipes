import { useState } from 'react'
import { supabase } from '../supabase'
import { useI18n } from '../i18n'
import { IN_APP_WEBVIEW, IN_NATIVE_APP, GOOGLE_WEB_CLIENT_ID, getNativeSocialLogin } from '../utils/inApp'

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
// Food photos for the collage live in /public/auth/ (1.jpg … 8.jpg). A missing file just leaves
// its soft-coloured tile empty, so the page still looks intentional without them.
const AUTH_PHOTOS = Array.from({ length: 23 }, (_, i) => i + 1).map(n => `/auth/${n}.jpg`)
const TILE_TINTS = ['#1A5E75', '#3E92BF', '#E3EED6', '#F5EFC0', '#D4EBF6', '#2B7690']

// The Play Store button is only for the website. Flip PLAY_STORE_LIVE to true once the app is
// approved and live (it is, as of Nov 2026); it never shows inside the app itself or on iPhones (no iOS app yet).
const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.misazon.app'
const PLAY_STORE_LIVE = true
const IS_IOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
const SHOW_PLAY_BUTTON = PLAY_STORE_LIVE && !IN_NATIVE_APP && !IS_IOS

// App Store badge: iPhones/iPads and desktop browsers (not Android phones, not inside either app).
const APP_STORE_URL = 'https://apps.apple.com/app/id6831440109'
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
const SHOW_APPSTORE_BUTTON = !IN_NATIVE_APP && !IS_ANDROID

const AUTH_CSS = `
/* the sign-in page is full-bleed: don't reserve the scrollbar gutter (it showed as a cream bar on the right) */
html{scrollbar-gutter:auto}
.auth-wrap{position:fixed;inset:0;overflow:hidden;display:flex;flex-direction:column;background:#F9F6F0}
.auth-hero{box-sizing:border-box;position:relative;overflow:hidden;background:#0C3D4E;color:#F9F6F0;flex:0 1 clamp(104px,17dvh,136px);
  min-height:90px;display:flex;flex-direction:column;justify-content:flex-end;padding:18px 22px 44px}
.auth-collage{position:absolute;inset:-12% -10%;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;
  transform:rotate(-8deg);opacity:.72}
.auth-col{display:flex;flex-direction:column;gap:8px}
.auth-col:nth-child(even){transform:translateY(-34px)}
.auth-tile{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:3/4}
.auth-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.auth-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,61,78,.2) 0%,rgba(12,61,78,.83) 100%)}
.auth-mark{position:absolute;top:14px;left:50%;transform:translateX(-50%);height:43px;width:auto;z-index:2}
.auth-copy{position:relative;z-index:2;text-align:center;display:none}
.auth-title{font-family:var(--font-display);font-weight:400;font-size:1.55rem;line-height:1.1;letter-spacing:-.01em;margin:0}
.auth-sub{display:none;font-family:var(--font-body);font-size:.95rem;line-height:1.5;opacity:.9;margin:0;max-width:30ch}
.auth-panel{flex:1 0 auto;max-height:calc(100% - 62px);position:relative;z-index:3;margin-top:-28px;background:#F9F6F0;border-radius:14px 14px 0 0;
  padding:14px 20px 12px;overflow-y:auto;min-height:0}
.auth-inner{max-width:420px;margin:0 auto}
.auth-head{margin-bottom:12px!important}
.auth-head h1{font-size:1.45rem!important;margin-bottom:0!important}
.auth-head p{display:block;font-size:.85rem!important;margin:4px 0 0!important}
.auth-card{padding:14px 16px!important}
.auth-card form{gap:10px!important}
.auth-card input{padding:8px 12px!important}
.auth-card label{margin-bottom:4px!important}
.auth-foot{margin-top:10px!important}
.auth-noacct{margin-bottom:8px}
@media (max-height:700px){.auth-head p{display:none}.auth-noacct{display:none}}
.play-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;box-sizing:border-box;
  background:#0C3D4E;color:#F9F6F0;border-radius:14px;padding:11px 18px;text-decoration:none;
  font-family:var(--font-body);transition:background 180ms}
.play-btn:hover{background:#1A5E75}
@media (min-width:1024px){
  .auth-wrap{position:static;overflow:visible;flex-direction:row;height:auto;min-height:100vh}
  .auth-noacct{display:block!important}
  .auth-hero{flex:1.15;height:auto;min-height:100vh;padding:64px;justify-content:flex-end}
  .auth-copy{display:block;text-align:left}
  .auth-sub{display:block}
  .auth-collage{inset:-10% -6%;gap:12px;grid-template-columns:repeat(4,1fr)}
  .auth-col:nth-child(5){display:none}
  .auth-col{gap:12px}
  .auth-mark{top:44px;left:64px;transform:none;height:38px}
  .auth-title{font-size:3rem;margin-bottom:10px}
  .auth-sub{font-size:1.1rem}
  .auth-panel{flex:1;max-height:none;margin-top:0;border-radius:0;display:flex;align-items:center;justify-content:center;padding:40px;overflow:visible}
  .auth-inner{width:100%}
  .auth-head{margin-bottom:24px!important}
  .auth-head h1{font-size:1.8rem!important;margin-bottom:6px!important}
  .auth-head p{display:block!important}
  .auth-card{padding:24px!important}
  .auth-card form{gap:16px!important}
  .auth-card input{padding:10px 14px!important}
  .auth-card label{margin-bottom:6px!important}
  .auth-foot{margin-top:20px!important}
}
@media (prefers-reduced-motion:no-preference){
  .auth-col:nth-child(odd){animation:authdrift 28s ease-in-out infinite alternate}
  .auth-col:nth-child(even){animation:authdrift2 32s ease-in-out infinite alternate}
}
@keyframes authdrift{from{transform:translateY(0)}to{transform:translateY(-28px)}}
@keyframes authdrift2{from{transform:translateY(-34px)}to{transform:translateY(-6px)}}
`

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l9-9.6z"/>
      <path fill="#FBBC05" d="M16.5 15.4l-3.9-3.4 3.9-3.4 4.3 2.4c1.2.7 1.2 1.8 0 2.5z"/>
      <path fill="#EA4335" d="M12.6 12l-9-9.6c.4-.4 1-.4 1.7-.1l11.2 6.3z"/>
      <path fill="#4285F4" d="M12.6 12l3.9 3.4L5.3 21.7c-.7.4-1.3.3-1.7-.1z"/>
    </svg>
  )
}

// Official "Download on the App Store" badge (from Apple's marketing resources; save as
// /public/auth/appstore-en.svg, appstore-es.svg, appstore-fr.svg). Until a file exists a plain button shows.
function AppStoreBadge() {
  const { lang } = useI18n()
  const [missing, setMissing] = useState(false)
  const file = lang === 'es' ? 'appstore-es' : lang === 'fr' ? 'appstore-fr' : 'appstore-en'
  return (
    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store"
      style={missing ? undefined : { display: 'flex', alignItems: 'center' }}
      className={missing ? 'play-btn' : undefined}>
      {missing ? (
        <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>App Store</span>
      ) : (
        <img src={`/auth/${file}.svg`} alt="App Store" style={{ display: 'block', height: 48, width: 'auto' }}
          onError={() => setMissing(true)} />
      )}
    </a>
  )
}

// Official "Get it on Google Play" badge (download from play.google.com/intl/en_us/badges and save as
// /public/auth/badge-en.png, badge-es-419.png, badge-fr-ca.png). Until a file exists the plain button shows.
function PlayBadge() {
  const { t, lang } = useI18n()
  const [missing, setMissing] = useState(false)
  const file = lang === 'es' ? 'badge-es-419' : lang === 'fr' ? 'badge-fr-ca' : 'badge-en'
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play"
      style={missing ? undefined : { display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      className={missing ? 'play-btn' : undefined}>
      {missing ? (
        <>
          <PlayIcon />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>{t('auth.getItOn')}</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>Google Play</span>
          </span>
        </>
      ) : (
        <img src={`/auth/${file}.png`} alt="Google Play" style={{ display: 'block', height: 48, width: 'auto', margin: '0 auto' }}
          onError={() => setMissing(true)} />
      )}
    </a>
  )
}

function AuthCollage() {
  // Distribute the photos across the columns so each column mixes photo and plain tiles
  // 23 photos, each used exactly once. 23 is prime, so a stride of 7 scatters similar dishes apart.
  const order = Array.from({ length: 23 }, (_, i) => (i * 7) % 23)
  const sizes = [5, 5, 5, 4, 4]
  let at = 0
  const cols = sizes.map(n => { const c = order.slice(at, at + n); at += n; return c })
  return (
    <div className="auth-collage" aria-hidden="true">
      {cols.map((col, ci) => (
        <div className="auth-col" key={ci}>
          {col.map((idx, ti) => (
            <div className="auth-tile" key={ti} style={{ background: TILE_TINTS[(ci * 2 + ti) % TILE_TINTS.length] }}>
              <img src={AUTH_PHOTOS[idx]} alt="" loading="lazy" decoding="async"
                onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function AuthShell({ children }) {
  const { t } = useI18n()
  return (
    <div className="auth-wrap">
      <style>{AUTH_CSS}</style>
      <header className="auth-hero">
        <AuthCollage />
        <div className="auth-shade" />
        <img className="auth-mark" src="/auth/mi-sazon-wordmark-white.svg" alt="Mi Sazón" />
        <div className="auth-copy">
          <h2 className="auth-title">{t('auth.heroTitle')}</h2>
          <p className="auth-sub">{t('auth.heroSub')}</p>
        </div>
      </header>
      <main className="auth-panel">
        <div className="auth-inner">
          {children}
          {(SHOW_PLAY_BUTTON || SHOW_APPSTORE_BUTTON) && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginTop: 18 }}>
              {SHOW_APPSTORE_BUTTON && <AppStoreBadge />}
              {SHOW_PLAY_BUTTON && <PlayBadge />}
            </div>
          )}
          <p style={{ textAlign: 'center', marginTop: 10, marginBottom: 0, fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('legal.privacy')}</a>
            {' · '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('legal.terms')}</a>
          </p>
        </div>
      </main>
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
      // No `scopes` option: the plugin refuses it, and its defaults already include email + profile.
      const res = await social.login({ provider: 'google', options: { nonce: hashedNonce } })
      const idToken = res && res.result && res.result.idToken
      if (!idToken) throw new Error('no id token')
      const { error: err } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: rawNonce })
      if (err) throw err
      // success: onAuthStateChange in App.jsx picks up the new session
    } catch (e) {
      const msg = String((e && e.message) || e || '')
      if (!/cancel/i.test(msg)) { console.error('Native Google sign-in failed:', msg); setError(t('auth.err.google')) }
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
      <div className="auth-head" style={{ marginBottom: 24, textAlign: 'center' }}>
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

      <div className="auth-card" style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '24px' }}>
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

        <div style={{ height: 1, background: 'var(--border-soft)', margin: '14px 0 12px' }} />
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <div className="auth-noacct">{isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}</div>
          <button onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} style={{
            width: '100%', boxSizing: 'border-box', padding: '11px 16px', borderRadius: 999, cursor: 'pointer',
            background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
            fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600,
          }}>
            {isSignUp ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
