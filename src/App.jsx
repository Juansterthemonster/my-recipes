import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Browse from './components/Browse'
import Detail from './components/Detail'
import RecipeForm from './components/RecipeForm'
import Toast from './components/Toast'
import AuthScreen from './components/AuthScreen'
import ResetPassword from './components/ResetPassword'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [view, setView]       = useState('browse')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [toast, setToast]     = useState({ visible: false, message: {} })
  const [activeTab, setActiveTab] = useState('mine')
  const [username, setUsername]   = useState(null)

  useEffect(() => {
    // Restore session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Keep session in sync — also intercepts PASSWORD_RECOVERY links
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked a reset link — show the new-password form
        setSession(session)
        setView('reset')
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Seed the initial history entry. The hash (#mine) ensures Android Chrome
  // treats subsequent pushState calls as real navigations.
  useEffect(() => {
    window.history.replaceState({ view: 'browse', tab: 'mine', recipe: null }, '', '#mine')
  }, [])

  // Handle browser back/forward (swipe-back on mobile, Android system back, desktop back button)
  useEffect(() => {
    function handlePop(e) {
      const s = e.state
      if (!s) { setSelectedRecipe(null); setView('browse'); setActiveTab('mine'); return }
      if (s.view === 'detail' && s.recipe) { setSelectedRecipe(s.recipe); setView('detail') }
      else if (s.view === 'edit' && s.recipe) { setSelectedRecipe(s.recipe); setView('edit') }
      else if (s.view === 'add')             { setSelectedRecipe(null);    setView('add') }
      else {
        // Returning to browse — also restore whichever tab was active
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
    const userId = session.user.id
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
        // Use profile row username; fall back to user_metadata if somehow empty
        setUsername(existing.username || metaUsername || null)
      }
    }
    ensureProfileAndLoadUsername()
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
  }

  function showToast(title) {
    setToast({ visible: true, message: { title } })
  }

  function hideToast() {
    setToast(t => ({ ...t, visible: false }))
  }

  // Tab change — each tab switch is a real history entry so back navigates between tabs.
  function openTab(tab) {
    window.history.pushState({ view: 'browse', tab, recipe: null }, '', `#${tab}`)
    setActiveTab(tab)
  }

  // Each view navigation includes a hash so Android Chrome treats it as a real page change.
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

  // goBack — used by in-app "← Recipes" and Cancel buttons.
  // Mirrors the swipe-back gesture so both feel identical.
  function goBack() {
    window.history.back()
  }

  // goHome — used after save / delete where we want to land on Browse → My Recipes tab.
  // Replaces the current history entry rather than pushing a new one.
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

  // Called by Detail after a successful "Add to my recipes" copy.
  // Shows a toast then navigates to the newly owned recipe detail page.
  function handleAddedToMyRecipes(copiedRecipe) {
    showToast('Added to your recipes.')
    openDetail(copiedRecipe)
  }

  // Still resolving session — render nothing to avoid flash
  if (session === undefined) return null

  // Password reset flow — takes priority over no-session check because
  // Supabase issues a temporary session with the recovery token
  if (view === 'reset') {
    return <ResetPassword onDone={goHome} />
  }

  // No session — show auth screen
  if (!session) return <AuthScreen />

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Toast visible={toast.visible} message={toast.message} onHide={hideToast} />
      <div className="mx-auto max-w-2xl lg:max-w-[1400px]">
        {view === 'browse' && (
          <Browse
            onSelect={openDetail} onAdd={openAdd}
            session={session} onSignOut={signOut}
            activeTab={activeTab} onTabChange={openTab}
            username={username}
          />
        )}
        {view === 'detail' && (
          <Detail recipe={selectedRecipe} onBack={goBack} onEdit={openEdit} onDelete={goHome} onAddedToMyRecipes={handleAddedToMyRecipes} session={session} />
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
