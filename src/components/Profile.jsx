import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/* ─── SHARED STYLE TOKENS ────────────────────────────────────────────────────
   These mirror the values defined in AuthScreen.jsx — kept local so this
   component is self-contained and doesn't create a cross-component dependency. */
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
const card = {
  background: 'var(--white)', borderRadius: 'var(--r-lg)',
  border: '1px solid var(--border-soft)', padding: '20px 24px',
}
const sectionLabel = {
  fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)',
  marginBottom: 14, fontFamily: 'var(--font-body)',
}
const errBlock = {
  background: '#FFF0F0', border: '1px solid #F5BABA', borderRadius: 8,
  padding: '10px 14px', color: '#A03030',
  fontFamily: 'var(--font-body)', fontSize: '0.875rem', marginBottom: 16,
}

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

function focus(e) { e.target.style.borderColor = '#999' }
function blur(e)  { e.target.style.borderColor = 'var(--border)' }

/* ─── EYE ICON ───────────────────────────────────────────────────────────────
   Identical to AuthScreen's EyeIcon — self-contained copy.                  */
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

/* ─── PASSWORD FIELD ──────────────────────────────────────────────────────── */
function PasswordField({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)
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
          onClick={() => setVisible(v => !v)}
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

/* ─── STAT GRID ───────────────────────────────────────────────────────────── */
/* Reusable 2-column grid of labelled stats tiles.                             */
function StatGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map(({ value, label }) => (
        <div key={label} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          background: 'var(--green-tint)', borderRadius: 'var(--r-md)',
          padding: '16px 12px', minHeight: 88,
        }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)', marginBottom: 8,
          }}>{label}</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400,
            color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {value === null ? '—' : value}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── PROFILE ─────────────────────────────────────────────────────────────── */
export default function Profile({ session, username, onBack, onSignOut, onUsernameChange }) {
  // ── Stats
  const [stats, setStats] = useState({
    totalCount:       null, // all my recipes (including private, copied, etc.)
    publicCount:      null, // my recipes marked is_public
    myCopiedCount:    null, // public recipes from others I've added to my recipes
    myLikedCount:     null, // public recipes from others I've liked
    theirCopiedCount: null, // times others copied my recipes
    theirLikedCount:  null, // times others liked my recipes
  })

  // ── Change username
  const [newUsername,   setNewUsername]   = useState(username || '')
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError,   setUsernameError]   = useState(null)
  const [usernameSaved,   setUsernameSaved]   = useState(false)

  // ── Change password
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError,   setPasswordError]   = useState(null)
  const [passwordSaved,   setPasswordSaved]   = useState(false)

  /* ── Fetch stats on mount ───────────────────────────────────────────────── */
  useEffect(() => {
    async function fetchStats() {
      const userId = session.user.id

      // Run independent queries in parallel
      const [
        { count: publicCount },
        { data: myRecipes },
        { count: myCopiedCount },  // public recipes I copied from others
        { count: myLikedCount },   // public recipes I have liked
      ] = await Promise.all([
        // My public recipes
        supabase.from('recipes').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).eq('is_public', true),
        // All my recipe IDs (for total count + others' activity queries)
        supabase.from('recipes').select('id').eq('user_id', userId),
        // Recipes I copied from others (copied_from is set = came from a public recipe)
        supabase.from('recipes').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).not('copied_from', 'is', null),
        // Recipes I have liked (my rows in the likes table)
        supabase.from('likes').select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const myIds = (myRecipes || []).map(r => r.id)
      const totalCount = myIds.length

      // Others' activity — only meaningful if I have at least one recipe
      let theirCopiedCount = 0
      let theirLikedCount  = 0
      if (myIds.length > 0) {
        const [{ count: cc }, { count: lc }] = await Promise.all([
          supabase.from('recipes').select('*', { count: 'exact', head: true }).in('copied_from', myIds),
          supabase.from('likes').select('*', { count: 'exact', head: true }).in('recipe_id', myIds),
        ])
        theirCopiedCount = cc || 0
        theirLikedCount  = lc || 0
      }

      setStats({
        totalCount,
        publicCount:      publicCount      || 0,
        myCopiedCount:    myCopiedCount    || 0,
        myLikedCount:     myLikedCount     || 0,
        theirCopiedCount,
        theirLikedCount,
      })
    }
    fetchStats()
  }, [session.user.id])

  /* ── Debounced username uniqueness check ────────────────────────────────── */
  useEffect(() => {
    const trimmed = newUsername.trim()

    // No check needed if field is empty, unchanged, or too short
    if (!trimmed || trimmed === username) {
      setUsernameStatus(null)
      return
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameStatus('invalid')
      return
    }
    if (!USERNAME_RE.test(trimmed)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(t)
  }, [newUsername, username])

  /* ── Save username ──────────────────────────────────────────────────────── */
  const trimmedUsername = newUsername.trim()
  const canSaveUsername = (
    trimmedUsername &&
    trimmedUsername !== username &&
    usernameStatus === 'available' &&
    !usernameLoading
  )

  async function handleUsernameSubmit(e) {
    e.preventDefault()
    if (!canSaveUsername) return
    setUsernameLoading(true)
    setUsernameError(null)
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername })
        .eq('id', session.user.id)
      if (profileErr) throw profileErr

      // Keep user_metadata in sync
      await supabase.auth.updateUser({ data: { username: trimmedUsername } })

      setUsernameSaved(true)
      setUsernameStatus(null)
      onUsernameChange(trimmedUsername)
      setTimeout(() => setUsernameSaved(false), 3000)
    } catch (err) {
      setUsernameError(err.message || 'Could not save username. Please try again.')
    } finally {
      setUsernameLoading(false)
    }
  }

  /* ── Update password ────────────────────────────────────────────────────── */
  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.")
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordError(error.message || 'Could not update password. Please try again.')
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    }
  }

  /* ── Username status hint ───────────────────────────────────────────────── */
  function UsernameHint() {
    if (usernameSaved) return (
      <p style={{ marginTop: 6, fontSize: '0.8rem', fontFamily: 'var(--font-body)', color: '#4A7C59' }}>
        ✓ Username saved
      </p>
    )
    if (!usernameStatus) return null
    const map = {
      checking:  { color: 'var(--text-tertiary)', text: 'Checking…' },
      available: { color: '#4A7C59',              text: '✓ Available' },
      taken:     { color: '#A03030',              text: 'Username already taken' },
      invalid:   { color: '#A03030',              text: 'Must be 3–20 chars, letters, numbers, - or _' },
    }
    const { color, text } = map[usernameStatus]
    return (
      <p style={{ marginTop: 6, fontSize: '0.8rem', fontFamily: 'var(--font-body)', color }}>
        {text}
      </p>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>

      {/* ── Nav ── */}
      <div
        style={{ background: '#F9F6F0' }}
        className="
          px-5 py-[14px] flex items-center justify-between sticky top-0 z-10
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 600,
          color: '#0C3D4E', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Recipes
        </button>
      </div>

      {/* ── Stats card ── */}
      <div className="mx-4 mt-4 lg:mx-10" style={card}>
        <div style={sectionLabel}>Your profile</div>

        {/* Username display */}
        <h1
          className="text-[1.5rem] md:text-[1.8rem]"
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 400,
            color: 'var(--text-primary)', lineHeight: 1.15,
            letterSpacing: '-0.01em', marginBottom: 20,
          }}
        >@{username}</h1>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0 18px' }} />

        {/* ── My stats ── */}
        <div style={sectionLabel}>Your stats</div>
        <StatGrid items={[
          { value: stats.totalCount,    label: 'Total recipes'      },
          { value: stats.publicCount,   label: 'Public recipes'     },
          { value: stats.myCopiedCount, label: "Recipes I've copied" },
          { value: stats.myLikedCount,  label: "Recipes I've liked"  },
        ]} />

        {/* ── Others' activity ── */}
        <div style={{ height: 1, background: 'var(--border-soft)', margin: '20px 0 18px' }} />
        <div style={sectionLabel}>Others' activity on your recipes</div>
        <StatGrid items={[
          { value: stats.theirCopiedCount, label: 'Times copied' },
          { value: stats.theirLikedCount,  label: 'Times liked'  },
        ]} />
      </div>

      {/* ── Change username card ── */}
      <div className="mx-4 mt-3 lg:mx-10" style={card}>
        <div style={sectionLabel}>Username</div>
        <form onSubmit={handleUsernameSubmit} noValidate>
          {usernameError && <div style={errBlock}>{usernameError}</div>}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>New username</label>
            <input
              type="text"
              value={newUsername}
              onChange={e => { setNewUsername(e.target.value); setUsernameError(null) }}
              placeholder="your_username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
            <UsernameHint />
          </div>
          <button
            type="submit"
            disabled={!canSaveUsername}
            style={{
              ...btnPrimary,
              opacity: canSaveUsername ? 1 : 0.45,
              cursor: canSaveUsername ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { if (canSaveUsername) e.currentTarget.style.background = 'var(--green-mid)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
          >
            {usernameLoading ? 'Saving…' : 'Save username'}
          </button>
        </form>
      </div>

      {/* ── Change password card ── */}
      <div className="mx-4 mt-3 lg:mx-10" style={card}>
        <div style={sectionLabel}>Password</div>
        <form onSubmit={handlePasswordSubmit} noValidate>
          {passwordError && <div style={errBlock}>{passwordError}</div>}
          {passwordSaved && (
            <div style={{
              background: '#F0F7F2', border: '1px solid #B2D9BE', borderRadius: 8,
              padding: '10px 14px', color: '#2E6B47',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem', marginBottom: 16,
            }}>
              ✓ Password updated successfully
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordError(null) }}
              autoComplete="new-password"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null) }}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading || !newPassword || !confirmPassword}
            style={{
              ...btnPrimary,
              opacity: (passwordLoading || !newPassword || !confirmPassword) ? 0.45 : 1,
              cursor: (passwordLoading || !newPassword || !confirmPassword) ? 'default' : 'pointer',
            }}
            onMouseEnter={e => { if (!passwordLoading && newPassword && confirmPassword) e.currentTarget.style.background = 'var(--green-mid)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-primary)' }}
          >
            {passwordLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* ── Sign out ── */}
      <div className="mx-4 mt-3 mb-10 lg:mx-10" style={card}>
        <div style={sectionLabel}>Account</div>
        <button
          onClick={onSignOut}
          style={{
            background: 'none', border: '1.5px solid var(--border-soft)',
            borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)',
            fontSize: '0.9rem', fontWeight: 500, padding: '10px 22px',
            cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0C3D4E'; e.currentTarget.style.color = '#0C3D4E' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Sign out
        </button>
      </div>

    </div>
  )
}
