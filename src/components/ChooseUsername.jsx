import { useState } from 'react'
import { supabase } from '../supabase'
import { useI18n } from '../i18n'

/* ─────────────────────────────────────────────────────────────────────────────
   ChooseUsername — shown once, right after someone's first "Continue with Google".
   (Email sign-ups pick a username on the sign-up form; Google accounts arrive
   without one.) Same rules as sign-up: 3–20 chars, letters/numbers/_/-, unique,
   stored lowercase in profiles.username. The app is blocked until it's saved.
   ───────────────────────────────────────────────────────────────────────────── */

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

export default function ChooseUsername({ session, onDone, onSignOut }) {
  const { t } = useI18n()
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError(t('auth.err.chooseUsername')); return }
    if (trimmed.length < 3 || trimmed.length > 20) { setError(t('auth.err.usernameLength')); return }
    if (!USERNAME_RE.test(trimmed)) { setError(t('auth.err.usernameChars')); return }

    setSaving(true); setError('')
    const lower = trimmed.toLowerCase()
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', lower).neq('id', session.user.id).maybeSingle()
    if (existing) { setError(t('auth.err.taken')); setSaving(false); return }

    const { error: err } = await supabase
      .from('profiles').upsert({ id: session.user.id, username: lower })
    setSaving(false)
    if (err) {
      setError(err.code === '23505' ? t('auth.err.taken') : t('username.saveError'))
      return
    }
    onDone(lower)
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <div style={{ padding: '18px 20px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.15rem', fontWeight: 800, color: '#0C3D4E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          MI SAZÓN
        </span>
      </div>
      <div style={{ maxWidth: 420, margin: '20px auto 0', padding: '0 20px 40px' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 6 }}>
            {t('username.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('username.sub')}
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #F5BABA', color: '#A03030', fontSize: '0.85rem', padding: '12px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                {t('auth.chooseUsername')}
              </label>
              <input
                autoFocus type="text" value={name} maxLength={20} autoComplete="username"
                onChange={e => { setName(e.target.value); if (error) setError('') }}
                placeholder={t('auth.usernamePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-primary)', padding: '10px 14px', outline: 'none' }}
              />
              <p style={{ marginTop: 6, fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                {t('auth.usernameNote')}
              </p>
            </div>
            <button
              type="submit" disabled={saving}
              style={{ background: 'var(--green-primary)', color: '#F9F6F0', border: 'none', borderRadius: 'var(--r-full)', padding: '12px 24px', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >{saving ? t('profile.saving') : t('username.continue')}</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            {t('profile.signOut')}
          </button>
        </p>
      </div>
    </div>
  )
}
