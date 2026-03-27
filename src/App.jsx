import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Browse from './components/Browse'
import Detail from './components/Detail'
import RecipeForm from './components/RecipeForm'
import Toast from './components/Toast'
import AuthScreen from './components/AuthScreen'
import ResetPassword from './components/ResetPassword'
import Profile from './components/Profile'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [view, setView]       = useState('browse')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [toast, setToast]     = useState({ visible: false, message: {} })
  const [activeTab, setActiveTab] = useState('mine')
  const [username, setUsername]   = useState(null)

  // ── Share link state ──────────────────────────────────────────────────────
  // shareRecipeId is extracted from /recipe/:id on first load.
  // shareRecipe is the fetched recipe data (null until loaded).
  // shareLoading tracks whether the fetch is in progress.
  // shareError is true if the recipe was not found or is not public.
  const [shareRecipeId, setShareRecipeId] = useState(() => {
    const m = window.location.pathname.match(/^\/recipe\/([0-9a-f-]{36})$/i)
    return m ? m[1] : null
  })
  const [shareRecipe,  setShareRecipe]  = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError,   setShareError]   = useState(false)

  useEffect(() => {
    // Restore session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Keep session in sync — also intercepts PASSWORD_RECOVERY links
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session)
        setView('reset')
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Seed the initial history entry. If it's a share link, leave the real path
  // in place so the URL stays clean; otherwise restore the hash-based approach.
  useEffect(() => {
    if (!shareRecipeId) {
      window.history.replaceState({ view: 'browse', tab: 'mine', recipe: null }, '', '#mine')
    }
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    function handlePop(e) {
      const s = e.state
      if (!s) { setSelectedRecipe(null); setView('browse'); setActiveTab('mine'); return }
      if (s.view === 'detail' && s.recipe) { setSelectedRecipe(s.recipe); setView('detail') }
      else if (s.view === 'edit' && s.recipe) { setSelectedRecipe(s.recipe); setView('edit') }
      else if (s.view === 'add')             { setSelectedRecipe(null);    setView('add') }
      else if (s.view === 'profile')         { setView('profile') }
      else {
        setSelectedRecipe(null)
        setView('browse')
        if (s.tab) setActiveTab(s.tab)
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Scroll to top whenever the active view changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // After every sign-in, ensure a profiles row exists and resolve the display username.
  useEffect(() => {
    if (!session?.user) return
    const userId      = session.user.id
    const metaUsername = session.user.user_metadata?.username

    async function ensureProfileAndLoadUsername() {
      const { data: existing } = await supabase
        .from('profiles').select('id, username').eq('id', userId).maybeSingle()
      if (!existing) {
        if (metaUsername) {
          await supabase.from('profiles').insert({ id: userId, username: metaUsername })
          setUsername(metaUsername)
        }
      } else {
        setUsername(existing.username || metaUsername || null)
      }
    }
    ensureProfileAndLoadUsername()
  }, [session?.user?.id])

  // ── Fetch shared recipe when a /recipe/:id path is detected ───────────────
  useEffect(() => {
    if (!shareRecipeId) return
    setShareLoading(true)
    setShareError(false)

    async function fetchShareRecipe() {
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', shareRecipeId)
        .eq('is_public', true)
        .maybeSingle()

      if (!recipeData) {
        setShareRecipe(null)
        setShareLoading(false)
        setShareError(true)
        return
      }

      // Fetch author username so Detail can show "by @username"
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', recipeData.user_id)
        .maybeSingle()

      setShareRecipe({ ...recipeData, author_username: profile?.username ?? null })
      setShareLoading(false)
    }

    fetchShareRecipe()
  }, [shareRecipeId])

  // ── Redirect logged-in users arriving via a share link ────────────────────
  // Once both the session and the shared recipe are available, navigate the
  // logged-in user into the normal full-featured Detail view.
  useEffect(() => {
    if (!shareRecipeId || shareLoading || session === undefined || !session) return
    if (!shareRecipe) return
    setSelectedRecipe(shareRecipe)
    setView('detail')
    setShareRecipeId(null)
    window.history.replaceState(
      { view: 'detail', tab: 'mine', recipe: shareRecipe },
      '',
      '#detail',
    )
  }, [session, shareRecipe, shareLoading, shareRecipeId])

  async function signOut() {
    await supabase.auth.signOut()
  }

  function showToast(title) {
    setToast({ visible: true, message: { title } })
  }

  function hideToast() {
    setToast(t => ({ ...t, visible: false }))
  }

  function openTab(tab) {
    window.history.pushState({ view: 'browse', tab, recipe: null }, '', `#${tab}`)
    setActiveTab(tab)
  }

  function openDetail(recipe) {
    window.history.pushState({ view: 'detail', tab: activeTab, recipe }, '', '#detail')
    setSelectedRecipe(recipe)
    setView('detail')
  }
  function openEdit(recipe) {
    window.history.pushState({ view: 'edit', tab: activeTab, recipe }, '', '#edit')
    setSelectedRecipe(recipe)
    setView('edit')
  }
  function openAdd() {
    window.history.pushState({ view: 'add', tab: activeTab, recipe: null }, '', '#add')
    setSelectedRecipe(null)
    setView('add')
  }
  function openProfile() {
    window.history.pushState({ view: 'profile', tab: activeTab, recipe: null }, '', '#profile')
    setView('profile')
  }

  function goBack() {
    window.history.back()
  }

  function goHome() {
    setSelectedRecipe(null)
    setView('browse')
    setActiveTab('mine')
    window.history.replaceState({ view: 'browse', tab: 'mine', recipe: null }, '', '#mine')
  }

  function handleSaved(isEdit) {
    goHome()
    showToast(isEdit ? 'Saved your changes.' : 'Saved. Nice one.')
  }

  function handleAddedToMyRecipes(copiedRecipe) {
    showToast('Added to your recipes.')
    openDetail(copiedRecipe)
  }

  // ── Exit share link view (used by "Sign in to save" + back) ───────────────
  function exitShareView() {
    setShareRecipeId(null)
    setShareRecipe(null)
    setShareError(false)
    window.history.replaceState({}, '', '/')
  }

  // Still resolving session — render nothing to avoid flash
  if (session === undefined) return null

  // Password reset flow — takes priority over no-session check because
  // Supabase issues a temporary session with the recovery token
  if (view === 'reset') {
    return <ResetPassword onDone={goHome} />
  }

  // ── Share link — read-only view for logged-out visitors ───────────────────
  if (shareRecipeId && !session) {
    // Recipe still loading
    if (shareLoading) return null

    // Recipe not found or not public
    if (shareError || !shareRecipe) {
      return (
        <div className="min-h-screen" style={{
          background: '#F9F6F0', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: 360 }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '1.3rem',
              color: 'var(--text-primary)', marginBottom: 10, fontWeight: 400,
            }}>Recipe not found</p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.9rem',
              color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5,
            }}>
              This recipe may have been made private or no longer exists.
            </p>
            <button
              onClick={exitShareView}
              style={{
                fontSize: '0.9rem', fontWeight: 500, padding: '10px 24px',
                borderRadius: 'var(--r-full)', border: '1.5px solid #0C3D4E',
                background: 'transparent', color: '#0C3D4E',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >Go to Mi Sazón</button>
          </div>
        </div>
      )
    }

    // Render recipe in read-only mode
    return (
      <div className="min-h-screen bg-[#F9F6F0]">
        <div className="mx-auto max-w-2xl lg:max-w-[1400px]">
          <Detail
            recipe={shareRecipe}
            session={null}
            readOnly={true}
            onBack={exitShareView}
            onSignIn={exitShareView}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      </div>
    )
  }

  // No session — show auth screen
  if (!session) return <AuthScreen />

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Toast visible={toast.visible} message={toast.message} onHide={hideToast} />
      <div className="mx-auto max-w-2xl lg:max-w-[1400px]">
        {view === 'profile' && (
          <Profile
            session={session}
            username={username}
            onBack={goBack}
            onSignOut={signOut}
            onUsernameChange={newName => setUsername(newName)}
          />
        )}
        {view === 'browse' && (
          <Browse
            onSelect={openDetail} onAdd={openAdd}
            session={session} onSignOut={signOut}
            activeTab={activeTab} onTabChange={openTab}
            username={username}
            onProfile={openProfile}
          />
        )}
        {view === 'detail' && (
          <Detail
            recipe={selectedRecipe}
            onBack={goBack}
            onEdit={openEdit}
            onDelete={goHome}
            onAddedToMyRecipes={handleAddedToMyRecipes}
            session={session}
            onToast={showToast}
          />
        )}
        {(view === 'add' || view === 'edit') && (
          <RecipeForm
            recipe={selectedRecipe}
            onBack={goBack}
            onSave={() => handleSaved(view === 'edit')}
            session={session}
          />
        )}
      </div>
    </div>
  )
}
