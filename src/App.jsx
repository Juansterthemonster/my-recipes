import { useState } from 'react'
import Browse from './components/Browse'
import Detail from './components/Detail'
import RecipeForm from './components/RecipeForm'
import Toast from './components/Toast'

export default function App() {
  const [view, setView] = useState('browse')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: {} })

  function showToast(title, sub) {
    setToast({ visible: true, message: { title, sub } })
  }

  function hideToast() {
    setToast(t => ({ ...t, visible: false }))
  }

  function openDetail(recipe) {
    setSelectedRecipe(recipe)
    setView('detail')
  }

  function openEdit(recipe) {
    setSelectedRecipe(recipe)
    setView('edit')
  }

  function openAdd() {
    setSelectedRecipe(null)
    setView('add')
  }

  function goHome() {
    setSelectedRecipe(null)
    setView('browse')
  }

  function handleSaved(isEdit) {
    goHome()
    showToast(
      isEdit ? 'Saved your changes.' : 'Saved. Nice one.',
    )
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Toast visible={toast.visible} message={toast.message} onHide={hideToast} />
      {/* Desktop: wider container (max-w-5xl = ~1280px, or use custom 90vw up to 1400px)
          Mobile/tablet: unchanged max-w-2xl centred layout */}
      <div className="mx-auto max-w-2xl lg:max-w-[1400px]">
        {view === 'browse' && (
          <Browse onSelect={openDetail} onAdd={openAdd} />
        )}
        {view === 'detail' && (
          <Detail recipe={selectedRecipe} onBack={goHome} onEdit={openEdit} onDelete={goHome} />
        )}
        {(view === 'add' || view === 'edit') && (
          <RecipeForm
            recipe={selectedRecipe}
            onBack={goHome}
            onSave={() => handleSaved(view === 'edit')}
          />
        )}
      </div>
    </div>
  )
}
