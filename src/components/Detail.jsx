import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatTime } from './TimePicker'
import { scaleIngredient } from '../utils/scaleIngredient'
import { compressImage } from '../utils/compressImage'
import { uploadToCloudinary } from '../utils/uploadToCloudinary'

const pill = {
  fontSize: '0.72rem', padding: '6px 13px', borderRadius: 'var(--r-full)',
  background: 'var(--green-light)', color: 'var(--green-primary)',
  border: 'none', fontFamily: 'var(--font-body)', fontWeight: 500,
}

/* ─── HEART ICON ───────────────────────────────────────────────────────────── */
function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* ─── WARN ICON — shown next to amounts that couldn't be scaled ────────────── */
function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-label="Amount could not be scaled automatically"
      style={{ color: 'var(--amber-accent)', flexShrink: 0 }}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/* ─── SHARE ICON BUTTON ─────────────────────────────────────────────────────
   44 × 44 px touch target (Apple / Google HIG minimum) with a centred 18 px
   icon — matches the visual weight of the existing kebab and back buttons.  */
function ShareBtn({ onClick, copied }) {
  return (
    <button
      onClick={onClick}
      aria-label={copied ? 'Link copied!' : 'Share recipe'}
      title={copied ? 'Link copied!' : 'Share recipe'}
      style={{
        /* 44 × 44 touch target so the button is easy to tap on mobile */
        width: 44, height: 44,
        background: 'none', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
        color: '#0C3D4E', borderRadius: 8, transition: 'background 150ms, color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {copied ? (
        /* Checkmark — brief confirmation that the link landed in the clipboard */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        /* Android / Material "share" icon: three nodes joined by two lines */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5"  r="3" />
          <circle cx="6"  cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
        </svg>
      )}
    </button>
  )
}

/* Shared blur button — mirrors Browse's blurBtn constant */
const blurBtn = {
  background: 'rgba(0,0,0,0.24)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 8,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 150ms, color 150ms',
}

/* ─── INGREDIENT ROW ───────────────────────────────────────────────────────── */
function IngRow({ ing, scaledAmount, warn }) {
  const displayAmount = scaledAmount ?? ing.amount
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--green-primary)', flexShrink: 0, display: 'inline-block',
          position: 'relative', top: '-1px',
        }} />
        <span
          className="text-[1.0625rem] md:text-[0.9rem]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}
        >{ing.name}</span>
      </div>
      {displayAmount && (
        <div style={{ paddingLeft: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            className="text-[0.875rem] md:text-[0.78rem]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >{displayAmount}</span>
          {warn && <WarnIcon />}
        </div>
      )}
    </div>
  )
}

/* ─── INGREDIENT CARD ──────────────────────────────────────────────────────── */
function IngredientCard({ ingredients, scaleFactor }) {
  const factor   = scaleFactor ?? 1
  const required = ingredients.filter(i => !i.optional)
  const optional = ingredients.filter(i => i.optional)
  const sectionLabelStyle = {
    fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-secondary)',
    marginBottom: 12, fontFamily: 'var(--font-body)',
  }

  function IngList({ items }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-[14px] gap-y-0">
        {items.map((ing, i) => {
          const { result, unscalable } = factor !== 1 && ing.amount
            ? scaleIngredient(ing.amount, factor)
            : { result: ing.amount, unscalable: false }
          return (
            <IngRow
              key={i}
              ing={ing}
              scaledAmount={result}
              warn={unscalable && factor !== 1}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 lg:mx-10" style={{
      background: 'var(--white)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-soft)', padding: '20px 24px',
    }}>
      <div style={{ ...sectionLabelStyle, color: 'var(--text-tertiary)', marginBottom: 14 }}>Ingredients</div>
      <IngList items={required} />
      {optional.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={sectionLabelStyle}>Optional ingredients</div>
          <IngList items={optional} />
        </div>
      )}
    </div>
  )
}

/* ─── COLLECTION SHEET ──────────────────────────────────────────────────────
   Bottom sheet that lets the owner add / remove a recipe from their collections.
   Fetches both the user's collections and this recipe's existing memberships on
   mount so checkboxes are pre-populated correctly.
   ─────────────────────────────────────────────────────────────────────────── */
function CollectionSheet({ recipeId, session, onClose, onToast, onSaved }) {
  const [collections,  setCollections]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [originalIds,  setOriginalIds]  = useState(new Set())
  const [checkedIds,   setCheckedIds]   = useState(new Set())
  const [saving,       setSaving]       = useState(false)
  const [newColName,   setNewColName]   = useState('')
  const [showInput,    setShowInput]    = useState(false)
  const [creating,     setCreating]     = useState(false)
  const newColRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      const [colRes, memberRes] = await Promise.all([
        supabase.from('collections').select('id, name')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('collection_recipes').select('collection_id')
          .eq('recipe_id', recipeId),
      ])
      const memberIds = new Set((memberRes.data || []).map(r => r.collection_id))
      setCollections(colRes.data || [])
      setOriginalIds(memberIds)
      setCheckedIds(new Set(memberIds))
      setLoading(false)
    }
    fetchData()
  }, [])

  // Focus the new-collection input when it appears
  useEffect(() => {
    if (showInput && newColRef.current) newColRef.current.focus()
  }, [showInput])

  function toggleCheck(id) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    const name = newColName.trim()
    if (!name) return
    setCreating(true)
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: session.user.id, name })
      .select().single()
    if (!error && data) {
      setCollections(prev => [data, ...prev])
      setCheckedIds(prev => new Set([...prev, data.id]))
    }
    setNewColName('')
    setShowInput(false)
    setCreating(false)
  }

  async function handleSave() {
    setSaving(true)
    const toAdd    = [...checkedIds].filter(id => !originalIds.has(id))
    const toRemove = [...originalIds].filter(id => !checkedIds.has(id))
    await Promise.all([
      toAdd.length > 0
        ? supabase.from('collection_recipes')
            .insert(toAdd.map(id => ({ collection_id: id, recipe_id: recipeId })))
        : Promise.resolve(),
      ...toRemove.map(id =>
        supabase.from('collection_recipes').delete()
          .eq('collection_id', id).eq('recipe_id', recipeId)
      ),
    ])
    setSaving(false)
    onSaved?.(checkedIds.size > 0)
    onClose()
    onToast?.('Collections updated')
  }

  const hasChanges = (
    [...checkedIds].some(id => !originalIds.has(id)) ||
    [...originalIds].some(id => !checkedIds.has(id))
  )

  /* ── Shared menu-item button style ── */
  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', padding: '14px 20px', textAlign: 'left',
    fontSize: '0.95rem', color: 'var(--text-primary)',
    background: 'none', border: 'none', borderBottom: '1px solid var(--border-soft)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
        }}
      />

      {/* ── Sheet ── */}
      {/*
        Responsive sizing:
        • Mobile  (<640 px)  — full width, flush to bottom, rounded top corners only.
        • Desktop (≥640 px)  — centred, capped at 520 px, small gap from bottom,
                               fully rounded so it floats above the viewport edge.
      */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 520,
        zIndex: 201,
        background: '#F9F6F0',
        borderRadius: '22px 22px 0 0',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.14)',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 16px', flexShrink: 0,
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
            color: 'var(--text-primary)',
          }}>Add to collection</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ＋ New collection */}
          {showInput ? (
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border-soft)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input
                ref={newColRef}
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowInput(false); setNewColName('') } }}
                placeholder="Collection name…"
                maxLength={60}
                style={{
                  flex: 1, minWidth: 0,
                  background: 'var(--white)', border: '1.5px solid var(--border-soft)',
                  borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem', color: 'var(--text-primary)',
                  padding: '9px 14px', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--green-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
              />
              <button
                onClick={handleCreate}
                disabled={!newColName.trim() || creating}
                style={{
                  flexShrink: 0, padding: '9px 16px',
                  borderRadius: 'var(--r-full)',
                  background: newColName.trim() ? 'var(--green-primary)' : 'var(--border-soft)',
                  color: newColName.trim() ? '#fff' : 'var(--text-tertiary)',
                  border: 'none', cursor: newColName.trim() ? 'pointer' : 'default',
                  fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500,
                  transition: 'background 150ms, color 150ms',
                }}
              >{creating ? 'Creating…' : 'Create'}</button>
              <button
                onClick={() => { setShowInput(false); setNewColName('') }}
                style={{
                  flexShrink: 0, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)', padding: 4,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              style={{
                ...menuItemStyle,
                color: 'var(--green-primary)', fontWeight: 500,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New collection
            </button>
          )}

          {/* Collection list */}
          {loading ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            }}>Loading…</div>
          ) : collections.length === 0 ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            }}>Create your first collection above.</div>
          ) : (
            collections.map(col => {
              const checked = checkedIds.has(col.id)
              return (
                <button
                  key={col.id}
                  onClick={() => toggleCheck(col.id)}
                  style={{
                    ...menuItemStyle,
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--green-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {col.name}
                  </span>
                  {/* Custom checkbox */}
                  <span style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${checked ? 'var(--green-primary)' : 'var(--border)'}`,
                    background: checked ? 'var(--green-primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 150ms, border-color 150ms',
                  }}>
                    {checked && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer — Save button */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-soft)',
          flexShrink: 0,
          background: '#F9F6F0',
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 'var(--r-full)',
              background: hasChanges ? 'var(--green-primary)' : 'var(--border-soft)',
              color: hasChanges ? '#fff' : 'var(--text-tertiary)',
              border: 'none',
              cursor: hasChanges ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600,
              transition: 'background 150ms, color 150ms',
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}

/* ─── DETAIL ───────────────────────────────────────────────────────────────── */
export default function Detail({
  recipe: initialRecipe,
  onBack,
  onEdit,
  onDelete,
  onAddedToMyRecipes,
  session,
  readOnly = false,
  onSignIn,
  onToast,
}) {
  const [recipe, setRecipe]               = useState(initialRecipe)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [scaledServings, setScaledServings] = useState(initialRecipe.serves || null)
  const [linkCopied, setLinkCopied]       = useState(false)

  // Non-owner interaction state
  const [isLiked, setIsLiked]                 = useState(initialRecipe.is_liked ?? false)
  const [isAdded, setIsAdded]                 = useState(false)
  const [adding, setAdding]                   = useState(false)
  const [originalAuthor, setOriginalAuthor]   = useState(null)
  const [isInAnyCollection, setIsInAnyCollection] = useState(false)

  const menuRef       = useRef(null)
  const photoInputRef = useRef(null)

  const isOwner    = !readOnly && recipe.user_id === session?.user?.id
  // Compute scale factor — only when serves is known and the user has adjusted it
  const scaleFactor = recipe.serves && scaledServings
    ? scaledServings / recipe.serves
    : 1

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // If this recipe was copied from another, fetch the original author's username
  useEffect(() => {
    if (!recipe.copied_from) return
    async function fetchOriginalAuthor() {
      const { data: orig } = await supabase
        .from('recipes').select('user_id').eq('id', recipe.copied_from).maybeSingle()
      if (!orig) return
      const { data: prof } = await supabase
        .from('profiles').select('username').eq('id', orig.user_id).maybeSingle()
      if (prof?.username) setOriginalAuthor(prof.username)
    }
    fetchOriginalAuthor()
  }, [recipe.copied_from])

  // For non-owners: fetch whether user has liked or already copied this recipe
  useEffect(() => {
    if (isOwner || !session?.user) return
    async function fetchInteractionStatus() {
      const [likeRes, copyRes] = await Promise.all([
        supabase.from('likes')
          .select('id').eq('user_id', session.user.id).eq('recipe_id', recipe.id).maybeSingle(),
        supabase.from('recipes')
          .select('id').eq('user_id', session.user.id).eq('copied_from', recipe.id).maybeSingle(),
      ])
      if (likeRes.data) setIsLiked(true)
      if (copyRes.data) setIsAdded(true)
    }
    fetchInteractionStatus()
  }, [recipe.id, isOwner])

  // For owners: check if this recipe belongs to any collection
  useEffect(() => {
    if (!isOwner) return
    async function checkCollectionMembership() {
      const { data } = await supabase
        .from('collection_recipes')
        .select('collection_id')
        .eq('recipe_id', recipe.id)
        .limit(1)
      setIsInAnyCollection(!!(data && data.length > 0))
    }
    checkCollectionMembership()
  }, [recipe.id, isOwner])

  async function handleDelete() {
    if (!window.confirm(`Delete "${recipe.name}"?`)) return
    await supabase.from('recipes').delete().eq('id', recipe.id)
    onDelete()
  }

  async function handleRemoveFromCollections() {
    await supabase.from('collection_recipes').delete().eq('recipe_id', recipe.id)
    setIsInAnyCollection(false)
    onToast?.('Removed from collections')
  }

  async function handleToggleFavourite() {
    const newVal = !recipe.is_favourite
    await supabase.from('recipes').update({ is_favourite: newVal }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, is_favourite: newVal }))
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file)
    let photoUrl
    try {
      photoUrl = await uploadToCloudinary(compressed, recipe.id)
    } catch (e) {
      console.error('Photo upload failed:', e)
      setUploading(false)
      return
    }
    await supabase.from('recipes').update({ photo_url: photoUrl }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, photo_url: photoUrl }))
    setUploading(false)
  }

  async function handleTogglePublic() {
    const newVal = !recipe.is_public
    await supabase.from('recipes').update({ is_public: newVal }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, is_public: newVal }))
    setMenuOpen(false)
  }

  async function handleToggleLike() {
    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: session.user.id, recipe_id: recipe.id })
    } else {
      await supabase.from('likes').delete()
        .eq('user_id', session.user.id).eq('recipe_id', recipe.id)
    }
  }

  async function handleAddToMyRecipes() {
    if (isAdded || adding) return
    setAdding(true)
    const { id, created_at, updated_at, author_username, is_liked: _liked, ...rest } = recipe
    const { data, error } = await supabase.from('recipes').insert({
      ...rest,
      user_id: session.user.id,
      is_public: false,
      is_favourite: false,
      copied_from: recipe.id,
      is_modified: false,
    }).select().single()
    setAdding(false)
    if (!error && data) {
      setIsAdded(true)
      onAddedToMyRecipes?.(data)
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/recipe/${recipe.id}`

    /* ── Tier 1: native share sheet (iOS Safari, Android Chrome, etc.) ──────
       navigator.share() works on mobile over HTTP as well as HTTPS, so it's
       the most reliable path on phones. We only treat AbortError (user
       dismissed the sheet) as a non-error; anything else falls through.      */
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.name, url })
        return // user shared via OS sheet — no clipboard toast needed
      } catch (err) {
        if (err?.name !== 'AbortError') {
          // Unexpected share failure — fall through to clipboard
        } else {
          return // user cancelled intentionally, do nothing
        }
      }
    }

    /* ── Tier 2: Clipboard API (requires secure context / HTTPS) ────────── */
    /* ── Tier 3: execCommand fallback (works on HTTP local network) ──────── */
    const copied = await (async () => {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url)
          return true
        } catch (_) { /* fall through to execCommand */ }
      }
      // textarea + execCommand — works even without a secure context
      try {
        const el = document.createElement('textarea')
        el.value = url
        el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
        document.body.appendChild(el)
        el.focus()
        el.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(el)
        return ok
      } catch (_) {
        return false
      }
    })()

    if (copied) {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
      onToast?.('Recipe link copied')
    }
  }

  const ingredients   = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const steps         = Array.isArray(recipe.steps) ? recipe.steps : []
  const totalTimeText = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `Total time: ${formatTime(recipe.total_time_min)}–${formatTime(recipe.total_time_max)}`
      : `Total time: ${formatTime(recipe.total_time_min)}`
    : null
  const prepTimeText = recipe.active_time_mins
    ? `Prep time: ${formatTime(recipe.active_time_mins)}`
    : null

  /* ── Shared stepper button style ── */
  const stepperBtn = {
    width: 26, height: 26, borderRadius: 6,
    border: '1.5px solid var(--border-soft)',
    background: 'transparent', color: 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 150ms, color 150ms, border-color 150ms',
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>

      {/* ── Nav ── */}
      {readOnly ? (
        /* Read-only nav: wordmark + Sign in CTA */
        <div
          style={{ background: '#F9F6F0' }}
          className="
            px-5 py-[14px] flex items-center justify-between sticky top-0 z-10
            lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
            lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
            lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
          "
        >
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 800,
            color: '#0C3D4E', letterSpacing: '0.06em',
            textTransform: 'uppercase', fontSize: '1.15rem', lineHeight: 1,
          }}>MI SAZÓN</span>
          <button
            onClick={onSignIn}
            style={{
              fontSize: '0.82rem', fontWeight: 500, padding: '7px 18px',
              borderRadius: 'var(--r-full)', border: '1.5px solid #0C3D4E',
              background: 'transparent', color: '#0C3D4E',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >Sign in to save</button>
        </div>
      ) : (
        /* Normal nav */
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
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Recipes
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* ── OWNER actions ── */}
            {isOwner && (
              <>
                <button onClick={() => onEdit(recipe)} style={{
                  fontSize: '0.82rem', fontWeight: 500, padding: '7px 18px',
                  borderRadius: 'var(--r-full)', border: '1.5px solid #0C3D4E',
                  background: 'transparent', color: '#0C3D4E',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Edit</button>

                {/* Kebab menu */}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="More options"
                    style={{
                      width: 34, height: 34,
                      background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, color: '#0C3D4E',
                      borderRadius: 6, transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5"  r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="12" cy="19" r="1.75" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      background: 'var(--white)', border: '1px solid var(--border-soft)',
                      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                      minWidth: 170, zIndex: 100, overflow: 'hidden',
                    }}>
                      {/* Add / Remove collection */}
                      {isInAnyCollection ? (
                        <button
                          onClick={() => { setMenuOpen(false); handleRemoveFromCollections() }}
                          style={{
                            display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                            fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                            border: 'none', borderBottom: '1px solid var(--border-soft)',
                            cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        >Remove from collection</button>
                      ) : (
                        <button
                          onClick={() => { setMenuOpen(false); setSheetOpen(true) }}
                          style={{
                            display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                            fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                            border: 'none', borderBottom: '1px solid var(--border-soft)',
                            cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        >Add to collection</button>
                      )}
                      {/* Make public / Make private */}
                      <button
                        onClick={handleTogglePublic}
                        style={{
                          display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                          fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                          border: 'none', borderBottom: '1px solid var(--border-soft)',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      >
                        {recipe.is_public ? 'Make recipe private' : 'Make recipe public'}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => { setMenuOpen(false); handleDelete() }}
                        style={{
                          display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                          fontSize: '0.9rem', color: '#C0392B', background: 'none', border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms, color 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F43F5E'; e.currentTarget.style.color = '#F9F6F0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#C0392B' }}
                      >Delete recipe</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── NON-OWNER (logged in) actions ── */}
            {!isOwner && session?.user && (
              <>
                {isAdded ? (
                  <span style={{
                    fontSize: '0.78rem', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', fontStyle: 'italic',
                  }}>
                    Saved to my recipes
                  </span>
                ) : (
                  <button
                    onClick={handleAddToMyRecipes}
                    disabled={adding}
                    style={{
                      fontSize: '0.82rem', fontWeight: 500, padding: '7px 18px',
                      borderRadius: 'var(--r-full)', border: '1.5px solid #0C3D4E',
                      background: 'transparent', color: '#0C3D4E',
                      cursor: adding ? 'default' : 'pointer', fontFamily: 'var(--font-body)',
                      opacity: adding ? 0.6 : 1, transition: 'opacity 150ms',
                    }}
                  >
                    {adding ? 'Adding…' : 'Add to my recipes'}
                  </button>
                )}

                {/* Kebab menu — Add to collection */}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="More options"
                    style={{
                      width: 34, height: 34,
                      background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, color: '#0C3D4E',
                      borderRadius: 6, transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5"  r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="12" cy="19" r="1.75" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      background: 'var(--white)', border: '1px solid var(--border-soft)',
                      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                      minWidth: 170, zIndex: 100, overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => { setMenuOpen(false); setSheetOpen(true) }}
                        style={{
                          display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                          fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                          border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', transition: 'background 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      >Add to collection</button>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <div className="mx-4 mt-4 lg:mx-10" style={{
        background: recipe.photo_url ? 'var(--white)' : '#FFFFFF',
        borderRadius: 'var(--r-lg)',
        border: recipe.photo_url ? '1px solid var(--border-soft)' : '1px solid #D1D5DB',
        padding: '24px',
        position: 'relative',
      }}>

        {recipe.photo_url ? (
          /* Photo present — heart sits top-right over the image (blur style) */
          <div style={{ position: 'relative', margin: '-24px -24px 20px', overflow: 'hidden', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
            <img
              src={recipe.photo_url} alt={recipe.name}
              style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
            />
            {!readOnly && (
              isOwner ? (
                <button
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                  style={{ ...blurBtn, position: 'absolute', top: 12, right: 12, padding: 10,
                    color: recipe.is_favourite ? '#D7191D' : '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                >
                  <HeartIcon filled={recipe.is_favourite} />
                </button>
              ) : session?.user ? (
                <button
                  onClick={handleToggleLike}
                  aria-label={isLiked ? 'Unlike recipe' : 'Like recipe'}
                  style={{ ...blurBtn, position: 'absolute', top: 12, right: 12, padding: 10,
                    color: isLiked ? '#D7191D' : '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                >
                  <HeartIcon filled={isLiked} />
                </button>
              ) : null
            )}
          </div>
        ) : (
          /* No photo */
          <>
            <input
              ref={photoInputRef}
              type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {isOwner && (
              /* Owner — full-width clickable Add photo zone with heart overlaid */
              <div style={{
                position: 'relative',
                margin: '-24px -24px 20px',
                borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
                overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => !uploading && photoInputRef.current?.click()}
                  style={{
                    width: '100%', height: 100,
                    background: '#EFEFED',
                    border: 'none',
                    cursor: uploading ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 10, color: '#9CA3AF', fontFamily: 'var(--font-body)',
                    transition: 'background 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = '#E4E2DF'; e.currentTarget.style.color = '#6B7280' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EFEFED'; e.currentTarget.style.color = '#9CA3AF' }}
                >
                  {uploading ? (
                    <span style={{ fontSize: '0.85rem' }}>Uploading…</span>
                  ) : (
                    <>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>Add photo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                  style={{
                    ...blurBtn,
                    position: 'absolute', top: 12, right: 12, padding: 10,
                    color: recipe.is_favourite ? '#D7191D' : '#fff',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                >
                  <HeartIcon filled={recipe.is_favourite} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Eyebrow row: meal-type label (left) + share icon (right).
            Renders whenever either element needs to appear; if neither does the
            row is omitted entirely.  The share button lives here so it is always
            vertically flush with the meal-type text, not pushed down by anything. */}
        {(() => {
          const mealItems = recipe.meal_type
            ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).filter(Boolean)
            : []
          const showShare = recipe.is_public && !readOnly
          if (!mealItems.length && !showShare) return null
          return (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8,
            }}>
              {mealItems.length > 0 ? (
                <div style={{
                  fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {mealItems.join(' · ')}
                </div>
              ) : <span />}
              {showShare && (
                <div style={{ marginRight: -12 }}>
                  <ShareBtn onClick={handleCopyLink} copied={linkCopied} />
                </div>
              )}
            </div>
          )
        })()}

          <h1
            className="text-[1.5rem] md:text-[1.8rem]"
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              color: 'var(--text-primary)', lineHeight: 1.15,
              marginBottom: (recipe.author_username && !isOwner) || (recipe.copied_from && recipe.is_modified) ? 6 : 10,
              letterSpacing: '-0.01em',
            }}>{recipe.name}</h1>

        {/* Modification notice — directly under recipe name */}
        {recipe.copied_from && recipe.is_modified && (
          <p style={{
            fontSize: '0.78rem', fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)', marginBottom: 14,
            fontStyle: 'italic', lineHeight: 1.4,
          }}>
            {originalAuthor
              ? `Original recipe by @${originalAuthor} edited by you`
              : 'You\'ve made changes to the original recipe'}
          </p>
        )}

        {/* Attribution — shown on other users' public recipes */}
        {!isOwner && recipe.author_username && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.82rem',
            color: 'var(--text-tertiary)', marginBottom: 14,
            letterSpacing: '0.01em',
          }}>by @{recipe.author_username}</p>
        )}

        {recipe.description && (
          <p
            className="text-[1.0625rem] md:text-[0.95rem]"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}
          >{recipe.description}</p>
        )}

        {(totalTimeText || prepTimeText) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
            {totalTimeText && (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                {totalTimeText}
              </span>
            )}
            {prepTimeText && (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                {prepTimeText}
              </span>
            )}
          </div>
        )}

        {/* ── Serves stepper + cuisine ── */}
        {(recipe.serves || recipe.cuisine) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {recipe.serves ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    Serves
                  </span>
                  <button
                    onClick={() => setScaledServings(s => Math.max(1, (s || recipe.serves) - 1))}
                    aria-label="Fewer servings"
                    style={stepperBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0'; e.currentTarget.style.borderColor = '#0C3D4E' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-soft)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span style={{
                    fontSize: '0.875rem', fontWeight: 600,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                    minWidth: 20, textAlign: 'center',
                  }}>
                    {scaledServings ?? recipe.serves}
                  </span>
                  <button
                    onClick={() => setScaledServings(s => (s || recipe.serves) + 1)}
                    aria-label="More servings"
                    style={stepperBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0'; e.currentTarget.style.borderColor = '#0C3D4E' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-soft)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Reset link — only shown when scaling is active */}
                {scaledServings && scaledServings !== recipe.serves && (
                  <button
                    onClick={() => setScaledServings(recipe.serves)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: '0.78rem', color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                      textDecoration: 'underline', textDecorationStyle: 'dotted',
                    }}
                  >Reset</button>
                )}
              </>
            ) : null}

            {recipe.cuisine && (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                {recipe.serves ? '·' : ''} {recipe.cuisine}
              </span>
            )}
          </div>
        )}

        {recipe.dietary && recipe.dietary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.dietary.map(d => {
              const s = {
                'Gluten free':  { background: 'var(--cream-mid)',    color: 'var(--text-secondary)' },
                'Vegetarian':   { background: 'var(--green-tint)',   color: 'var(--green-primary)' },
                'Vegan':        { background: 'var(--white)',        color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' },
                'Pescatarian':  { background: 'var(--violet-light)', color: 'var(--violet-accent)' },
              }[d] || {}
              return <span key={d} style={{ ...pill, ...s }}>{d}</span>
            })}
          </div>
        )}

      </div>

      {/* ── Ingredients (with scaling) ── */}
      {ingredients.length > 0 && (
        <IngredientCard ingredients={ingredients} scaleFactor={scaleFactor} />
      )}

      {/* ── Method ── */}
      {steps.length > 0 && (
        <div className="mx-4 mt-3 lg:mx-10" style={{
          background: 'var(--white)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-soft)', padding: '20px 24px',
        }}>
          <div style={{
            fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: 14, fontFamily: 'var(--font-body)',
          }}>Method</div>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4" style={{
              padding: '11px 0',
              borderBottom: i < steps.length - 1 ? '1px solid var(--border-soft)' : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--green-primary)', color: 'var(--text-on-dark)',
                fontSize: '0.65rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>{i + 1}</div>
              <div
                className="text-[1.0625rem] md:text-[0.95rem]"
                style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontFamily: 'var(--font-body)' }}
              >{step}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 40 }} />

      {/* ── Collection bottom sheet ── */}
      {sheetOpen && (
        <CollectionSheet
          recipeId={recipe.id}
          session={session}
          onClose={() => setSheetOpen(false)}
          onToast={onToast}
          onSaved={setIsInAnyCollection}
        />
      )}
    </div>
  )
}
