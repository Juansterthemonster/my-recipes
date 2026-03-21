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

  // After every sign-in, ensure a profiles row exists for this user.
  useEffect(() => {
    if (!session?.user) return
    const userId  = session.user.id
    const username = session.user.user_metadata?.username
    if (!username) return

    async function ensureProfile() {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('id', userId).maybeSingle()
      if (!existing) {
        await supabase.from('profiles').insert({ id: userId, username })
      }
    }
    ensureProfile()
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

  function openDetail(recipe) { setSelectedRecipe(recipe); setView('detail') }
  function openEdit(recipe)   { setSelectedRecipe(recipe); setView('edit') }
  function openAdd()          { setSelectedRecipe(null);   setView('add') }

  function goHome() {
    setSelectedRecipe(null)
    setView('browse')
  }

  function handleSaved(isEdit) {
    goHome()
    showToast(isEdit ? 'Saved your changes.' : 'Saved. Nice one.')
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
          <Browse onSelect={openDetail} onAdd={openAdd} session={session} onSignOut={signOut} />
        )}
        {view === 'detail' && (
          <Detail recipe={selectedRecipe} onBack={goHome} onEdit={openEdit} onDelete={goHome} session={session} />
        )}
        {(view === 'add' || view === 'edit') && (
          <RecipeForm
            recipe={selectedRecipe}
            onBack={goHome}
            onSave={() => handleSaved(view === 'edit')}
            session={session}
          />
        )}
      </div>
    </div>
  )
}
