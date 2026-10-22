import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatTime } from './TimePicker'
import { scaleIngredient } from '../utils/scaleIngredient'
import { useI18n, tagLabel } from '../i18n'
import { compressImage } from '../utils/compressImage'
import { uploadToR2 } from '../utils/uploadToR2'
import { slugify } from '../utils/slugify'

// Must match the MAX_PHOTOS check in RecipeForm.jsx — same cap, enforced on
// both places a photo can be added to a recipe.
const MAX_PHOTOS = 6

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
  const { t } = useI18n()
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-label={t('detail.warnAmount')}
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
  const { t } = useI18n()
  return (
    <button
      onClick={onClick}
      aria-label={copied ? t('detail.linkCopied') : t('detail.share')}
      title={copied ? t('detail.linkCopied') : t('detail.share')}
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

/* ─── INGREDIENT GROUPING ──────────────────────────────────────────────────── */
// Buckets the flat `ingredients` array (each item optionally carrying a
// `group` string, set by RecipeForm's ingredient-group editor) by that
// group, preserving the order groups first appear in. A recipe with no
// `group` keys at all — every pre-v4 recipe — collapses back into exactly
// one unlabeled group, so its layout is unchanged from before grouping existed.
function bucketByGroup(ingredients) {
  const groups = []
  const byLabel = new Map()
  for (const item of ingredients) {
    const label = item.group || ''
    let g = byLabel.get(label)
    if (!g) {
      g = { label, items: [] }
      byLabel.set(label, g)
      groups.push(g)
    }
    g.items.push(item)
  }
  return groups
}

/* ─── INGREDIENT CARD ──────────────────────────────────────────────────────── */
function IngredientCard({ ingredients, scaleFactor }) {
  const { t } = useI18n()
  const factor = scaleFactor ?? 1
  const groups = bucketByGroup(ingredients)
  const sectionLabelStyle = {
    fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-secondary)',
    marginBottom: 12, fontFamily: 'var(--font-body)',
  }
  const groupHeadingStyle = {
    fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)', marginBottom: 12,
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
      <div style={{ ...sectionLabelStyle, color: 'var(--text-tertiary)', marginBottom: 14 }}>{t('detail.ingredients')}</div>
      {groups.map((group, gi) => {
        const required = group.items.filter(i => !i.optional)
        const optional = group.items.filter(i => i.optional)
        return (
          <div key={group.label + gi} style={{ marginTop: gi > 0 ? 28 : 0 }}>
            {group.label && <div style={groupHeadingStyle}>{group.label}</div>}
            <IngList items={required} />
            {optional.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={sectionLabelStyle}>{t('detail.optionalIngredients')}</div>
                <IngList items={optional} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── COLLECTION SHEET ──────────────────────────────────────────────────────
   Bottom sheet that lets the owner add / remove a recipe from their collections.
   Fetches both the user's collections and this recipe's existing memberships on
   mount so checkboxes are pre-populated correctly.
   ─────────────────────────────────────────────────────────────────────────── */
function CollectionSheet({ recipeId, session, onClose, onToast, onSaved }) {
  const { t } = useI18n()
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
    const toAdd    = [...checkedIds].filter(id => !originalIds.has(id))
    const toRemove = [...originalIds].filter(id => !checkedIds.has(id))
    // Nothing changed — just close the sheet and stay where we are
    if (toAdd.length === 0 && toRemove.length === 0) { onClose(); return }
    setSaving(true)
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

    // Toast copy reflects what actually changed
    const nameOf = id => collections.find(c => c.id === id)?.name
    let message = t('detail.collectionsUpdated')
    if (toAdd.length === 1 && toRemove.length === 0 && nameOf(toAdd[0]))
      message = t('detail.addedTo', { name: nameOf(toAdd[0]) })
    else if (toRemove.length === 1 && toAdd.length === 0 && nameOf(toRemove[0]))
      message = t('detail.removedFrom', { name: nameOf(toRemove[0]) })

    onSaved?.(checkedIds.size > 0, true)
    onClose()
    onToast?.(message)
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
          }}>{t('detail.addToCollection')}</span>
          <button
            onClick={onClose}
            aria-label={t('detail.close')}
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
                placeholder={t('detail.collectionName')}
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
              >{creating ? t('detail.creating') : t('detail.create')}</button>
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
              {t('detail.newCollection')}
            </button>
          )}

          {/* Collection list */}
          {loading ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            }}>{t('browse.loading')}</div>
          ) : collections.length === 0 ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            }}>{t('detail.createFirst')}</div>
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
          >{saving ? t('col.saving') : t('col.save')}</button>
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
  fromCollection = false,
  username = null,
}) {
  const { t, formatDate } = useI18n()
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
  const [originalDate, setOriginalDate]       = useState(null)   // when the original recipe was created
  // Opened from a collection page => definitely in a collection; don't wait on the lookup
  const [isInAnyCollection, setIsInAnyCollection] = useState(fromCollection)

  const menuRef       = useRef(null)
  const photoInputRef = useRef(null)

  const isOwner    = !readOnly && recipe.user_id === session?.user?.id
  // Byline: "by @name · Added on <date>" — shown for everyone's recipes, owner included.
  // The owner's own username comes from App (profiles table); others arrive as author_username.
  // A copy of someone else's recipe (mine, with copied_from set) credits the ORIGINAL creator and
  // the original's date, plus a second line with when I saved it. If the original is no longer
  // visible (deleted / made private) the creator and date are simply omitted — never my own name.
  const fmtDate = formatDate
  const isCopy = isOwner && !!recipe.copied_from
  const authorName = isCopy ? originalAuthor : (isOwner ? username : recipe.author_username)
  const addedDate = fmtDate(isCopy ? originalDate : recipe.created_at)
  const savedToMineDate = isCopy ? fmtDate(recipe.created_at) : null
  // Gallery: falls back to the single legacy photo_url for older recipes that
  // predate the photos[] column, so nothing needs a data migration.
  const photos = recipe.photos?.length ? recipe.photos : (recipe.photo_url ? [recipe.photo_url] : [])
  const [activePhoto, setActivePhoto] = useState(0)
  // Belt-and-suspenders alongside the `lg:hidden` Tailwind class on the dots
  // and prev/next arrows below: those controls only make sense against the
  // mobile carousel, never the desktop "all photos at once" grid. Tracking
  // the breakpoint in JS too means they can't end up shown on desktop even
  // if a CSS class fails to apply for some reason.
  const [isDesktopPhotoView, setIsDesktopPhotoView] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = e => setIsDesktopPhotoView(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const photoScrollRef = useRef(null)
  function handlePhotoScroll(e) {
    const el = e.currentTarget
    if (!el.clientWidth) return
    setActivePhoto(Math.round(el.scrollLeft / el.clientWidth))
  }
  function scrollToPhoto(index) {
    const el = photoScrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(index, photos.length - 1))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }
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
        .from('recipes').select('user_id, created_at').eq('id', recipe.copied_from).maybeSingle()
      if (!orig) return
      if (orig.created_at) setOriginalDate(orig.created_at)
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

  // Check if this recipe belongs to any of the viewer's collections
  useEffect(() => {
    if (!session?.user || readOnly) return
    async function checkCollectionMembership() {
      const { data } = await supabase
        .from('collection_recipes')
        .select('collection_id')
        .eq('recipe_id', recipe.id)
        .limit(1)
      // Only ever upgrade to true here; a missing/empty result must not hide the menu item
      if (data && data.length > 0) setIsInAnyCollection(true)
    }
    checkCollectionMembership()
  }, [recipe.id, session?.user?.id, readOnly])

  // After the collection sheet saves. If the recipe was opened from a collection
  // page, return to that page's grid so it reflects the change.
  function handleSheetSaved(anyChecked, changed) {
    setIsInAnyCollection(anyChecked)
    if (changed && fromCollection) onBack?.()
  }

  async function handleDelete() {
    if (!window.confirm(t('detail.confirmDelete', { name: recipe.name }))) return
    // Remove collection memberships first (the link table may not cascade), then the
    // recipe. .select() returns the deleted rows so a silent no-op (e.g. a row-level
    // security rule blocking the delete) is caught instead of looking like success.
    const { error: linkErr } = await supabase.from('collection_recipes').delete().eq('recipe_id', recipe.id)
    const { data: deleted, error } = await supabase.from('recipes').delete().eq('id', recipe.id).select('id')
    if (linkErr || error || !deleted?.length) {
      console.error('Delete recipe failed:', linkErr || error || 'no rows deleted')
      onToast?.(t('detail.deleteFailed'), 'error')
      return
    }
    onDelete()
  }

  async function handleRemoveFromCollections() {
    await supabase.from('collection_recipes').delete().eq('recipe_id', recipe.id)
    setIsInAnyCollection(false)
    onToast?.(t('detail.removedFromCollections'))
  }

  async function handleToggleFavourite() {
    const newVal = !recipe.is_favourite
    await supabase.from('recipes').update({ is_favourite: newVal }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, is_favourite: newVal }))
  }

  const triggerAddPhotos = () => { if (!uploading) photoInputRef.current?.click() }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { e.target.value = ''; return }
    setUploading(true)
    const uploaded = []
    let failed = 0
    let lastReason = ''
    for (const file of files.slice(0, room)) {
      try {
        const compressed = await compressImage(file)
        uploaded.push(await uploadToR2(compressed, recipe.id))
      } catch (err) {
        console.error('Photo upload failed:', err)
        failed += 1
        lastReason = err?.message || ''
      }
    }
    if (failed) {
      const base = failed === 1 ? t('detail.photoFailedOne') : t('detail.photoFailedMany', { count: failed })
      onToast?.(t('detail.tryAgain', { base, reason: lastReason ? ` (${lastReason})` : '' }), 'error')
    }
    if (uploaded.length) {
      const newPhotos = [...photos, ...uploaded]
      await supabase.from('recipes').update({ photos: newPhotos, photo_url: newPhotos[0] }).eq('id', recipe.id)
      setRecipe(r => ({ ...r, photos: newPhotos, photo_url: newPhotos[0] }))
    }
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
    // Slug is cosmetic only — App.jsx's share-link regex never reads it back
    // out, so a recipe renamed after sharing doesn't break the old link, and
    // a name with no a-z0-9 characters at all just falls back to no slug.
    const slug = slugify(recipe.name)
    const url = `${window.location.origin}/recipe/${slug ? `${slug}/` : ''}${recipe.id}`

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
      onToast?.(t('detail.linkCopiedToast'))
    }
  }

  const ingredients   = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const steps         = Array.isArray(recipe.steps) ? recipe.steps : []
  const totalTimeText = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `${formatTime(recipe.total_time_min)}–${formatTime(recipe.total_time_max)}`
      : formatTime(recipe.total_time_min)
    : null
  const prepTimeText = recipe.active_time_mins
    ? formatTime(recipe.active_time_mins)
    : null

  /* ── Key-facts typography: small-caps label over a larger value ── */
  const factLabel = {
    fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', marginBottom: 4,
  }
  const factValue = {
    fontWeight: 600, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', lineHeight: 1.3, minHeight: 26, display: 'flex', alignItems: 'center',
  }

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
          >{t('detail.signInToSave')}</button>
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
            {t('detail.back')}
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
                }}>{t('detail.edit')}</button>

                {/* Kebab menu */}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label={t('detail.moreOptions')}
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
                        <>
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
                        >{t('detail.addToAnother')}</button>
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
                        >{t('detail.removeFromCollection')}</button>
                        </>
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
                        >{t('detail.addToCollection')}</button>
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
                        {recipe.is_public ? t('detail.makePrivate') : t('detail.makePublic')}
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
                      >{t('detail.deleteRecipe')}</button>
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
                    {t('detail.savedToMine')}
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
                    {adding ? t('detail.adding') : t('detail.addToMine')}
                  </button>
                )}

                {/* Kebab menu — Add to collection */}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label={t('detail.moreOptions')}
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
                      >{isInAnyCollection ? t('detail.addToAnother') : t('detail.addToCollection')}</button>
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
        background: photos.length > 0 ? 'var(--white)' : '#FFFFFF',
        borderRadius: 'var(--r-lg)',
        border: photos.length > 0 ? '1px solid var(--border-soft)' : '1px solid #D1D5DB',
        padding: '24px',
        position: 'relative',
      }}>

        {photos.length > 0 ? (
          /* Photo(s) present — heart sits top-right over the image (blur style).
             A swipeable carousel with dot indicators renders only when there is
             more than one photo; a single photo renders exactly as before. */
          <div
            className={photos.length === 1 ? 'lg:hidden' : undefined}
            style={{ position: 'relative', margin: '-24px -24px 10px', overflow: 'hidden', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}
          >
            {photos.length > 1 ? (
              <>
                {/* Mobile/tablet (below lg): swipeable carousel — unchanged. */}
                <div className="lg:hidden">
                  <div
                    ref={photoScrollRef}
                    onScroll={handlePhotoScroll}
                    className="pill-row"
                    style={{
                      display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {photos.map((url, i) => (
                      <div key={url + i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}>
                        <img
                          src={url} alt={t('detail.photoAlt', { name: recipe.name, n: i + 1 })}
                          style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop (lg and up): show every photo at once — a bigger
                    cover photo (photo 1) plus the rest in a grid alongside
                    it. The grid always fills completely with no empty cells:
                    the last grid photo spans both columns whenever the
                    remaining count is odd (e.g. 4 total → 1 side photo
                    spans full width under 2 others; 6 total → same, under
                    2 rows of 2). */}
                <div className="hidden lg:flex" style={{ gap: 4, height: 420 }}>
                  <img
                    src={photos[0]} alt={t('detail.photoAlt', { name: recipe.name, n: 1 })}
                    style={{
                      flex: photos.length > 2 ? '1.4 1 0' : '1 1 0', minWidth: 0,
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    }}
                  />
                  {photos.length > 2 ? (
                    <div style={{
                      flex: '1 1 0', minWidth: 0, minHeight: 0, height: '100%', display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: 4,
                    }}>
                      {photos.slice(1).map((url, i, rest) => (
                        <img
                          key={url + i} src={url} alt={t('detail.photoAlt', { name: recipe.name, n: i + 2 })}
                          style={{
                            width: '100%', height: '100%', minHeight: 0, objectFit: 'cover', display: 'block',
                            gridColumn: rest.length % 2 === 1 && i === rest.length - 1 ? 'span 2' : undefined,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <img
                      src={photos[1]} alt={t('detail.photoAlt', { name: recipe.name, n: 2 })}
                      style={{ flex: '1 1 0', minWidth: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </div>
              </>
            ) : (
              <img
                src={photos[0]} alt={recipe.name}
                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Dots + arrows only make sense against the mobile carousel above
                — the desktop grid shows every photo at once, so both are
                hidden at the lg breakpoint (and gated in JS via
                isDesktopPhotoView too — see its declaration above for why). */}
            {photos.length > 1 && !isDesktopPhotoView && (
              <div className="lg:hidden" style={{
                position: 'absolute', bottom: 12, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 6,
              }}>
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToPhoto(i)}
                    aria-label={t('detail.goToPhoto', { n: i + 1 })}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', padding: 0, border: 'none',
                      background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.45)',
                      transition: 'background 150ms', cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Prev/next arrows — hidden on touch-only devices (mobile already has
                swipe); shown only where a precise, hover-capable pointer exists
                (desktop mouse/trackpad) AND below the lg breakpoint, since lg+
                shows the all-at-once grid instead of the carousel these control. */}
            {photos.length > 1 && !isDesktopPhotoView && activePhoto > 0 && (
              <button
                type="button"
                className="carousel-arrow lg:hidden"
                onClick={() => scrollToPhoto(activePhoto - 1)}
                aria-label={t('detail.prevPhoto')}
                style={{ ...blurBtn, position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: 34, height: 34, color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {photos.length > 1 && !isDesktopPhotoView && activePhoto < photos.length - 1 && (
              <button
                type="button"
                className="carousel-arrow lg:hidden"
                onClick={() => scrollToPhoto(activePhoto + 1)}
                aria-label={t('detail.nextPhoto')}
                style={{ ...blurBtn, position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: 34, height: 34, color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {isOwner && !readOnly && photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={triggerAddPhotos}
                disabled={uploading}
                aria-label={t('detail.addMorePhotosLabel')}
                style={{
                  ...blurBtn, position: 'absolute', top: 12, left: 12, gap: 6,
                  padding: '9px 14px', color: '#fff', borderRadius: 'var(--r-full)',
                  fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 500,
                  cursor: uploading ? 'default' : 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              >
                {uploading ? t('detail.uploading') : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('detail.addPhotos')}
                  </>
                )}
              </button>
            )}

            {!readOnly && (
              isOwner ? (
                <button
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
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
                  aria-label={isLiked ? t('card.unlike') : t('card.like')}
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
              type="file" accept="image/*" multiple
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {isOwner && (
              /* Owner — full-width clickable Add photo zone with heart overlaid */
              <div style={{
                position: 'relative',
                margin: '-24px -24px 10px',
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
                    <span style={{ fontSize: '0.85rem' }}>{t('detail.uploading')}</span>
                  ) : (
                    <>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t('detail.addPhoto')}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
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

        {/* Hidden picker shared by every "Add photos" control below */}
        {photos.length > 0 && isOwner && !readOnly && (
          <input
            ref={photoInputRef}
            type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        )}

        {/* Single photo, desktop only (lg+): a compact photo section ABOVE the
            title — the photo in a 2:3 tile (about 75% of the old size so the
            title stays above the fold) next to an owner-only "Add photos" tile.
            Below lg the banner above is used. Two or more photos use the
            multi-photo layout instead. */}
        {photos.length === 1 && (
          <div className="hidden lg:flex" style={{ gap: 12, margin: '-24px -24px 11px', padding: 24, paddingBottom: 0 }}>
            <div style={{
              position: 'relative', width: 255, aspectRatio: '2/3', flexShrink: 0,
              borderRadius: 'var(--r-lg)', overflow: 'hidden', background: '#000',
            }}>
              <img
                src={photos[0]} alt={recipe.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {!readOnly && (
                isOwner ? (
                  <button
                    onClick={handleToggleFavourite}
                    aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
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
                    aria-label={isLiked ? t('card.unlike') : t('card.like')}
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

            {isOwner && !readOnly && photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={triggerAddPhotos}
                disabled={uploading}
                style={{
                  width: 150, aspectRatio: '2/3', flexShrink: 0,
                  borderRadius: 'var(--r-lg)', border: '1.5px dashed #C9CDD1',
                  background: '#F3F3F1', color: '#8A9096',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
                  cursor: uploading ? 'default' : 'pointer', transition: 'background 150ms, color 150ms, border-color 150ms',
                }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = '#E9E8E5'; e.currentTarget.style.color = '#0C3D4E'; e.currentTarget.style.borderColor = '#0C3D4E' } }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F3F3F1'; e.currentTarget.style.color = '#8A9096'; e.currentTarget.style.borderColor = '#C9CDD1' }}
              >
                {uploading ? <span>{t('detail.uploading')}</span> : (
                  <>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>{t('detail.addMorePhotos')}</span>
                  </>
                )}
              </button>
            )}
          </div>
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
              justifyContent: 'space-between', marginBottom: 4,
            }}>
              {mealItems.length > 0 ? (
                <div style={{
                  fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {mealItems.map(v => tagLabel(t, 'meal', v)).join(' · ')}
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
              marginBottom: authorName || addedDate || savedToMineDate || (recipe.copied_from && recipe.is_modified) ? 6 : 10,
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
              ? t('detail.originalEdited', { author: originalAuthor })
              : t('detail.changedOriginal')}
          </p>
        )}

        {/* Byline — "by @user · Added on <date>", for every recipe (own and others') */}
        {(authorName || addedDate || savedToMineDate) && (
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.82rem',
            color: 'var(--text-tertiary)', marginBottom: 14,
            letterSpacing: '0.01em', lineHeight: 1.5,
          }}>
            {(authorName || addedDate) && (
              <p style={{ margin: 0 }}>
                {authorName && t('detail.by', { author: authorName })}
                {authorName && addedDate && ' · '}
                {addedDate && t('detail.addedOn', { date: addedDate })}
              </p>
            )}
            {savedToMineDate && (
              <p style={{ margin: 0 }}>{t('detail.addedToMineOn', { date: savedToMineDate })}</p>
            )}
          </div>
        )}

        {recipe.description && (
          <p
            className="text-[1.0625rem] md:text-[0.95rem]"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}
          >{recipe.description}</p>
        )}

        {/* ── Key facts: time / servings / cuisine as distinct groups ──
            2-up grid on mobile, one divided row on desktop. Label (small caps)
            over value, so each reads as its own piece of information. */}
        {(totalTimeText || prepTimeText || recipe.serves || recipe.cuisine) && (
          <div
            className="flex flex-wrap gap-y-4"
            style={{
              padding: '16px 0', margin: '4px 0 18px',
              borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)',
            }}
          >
            {totalTimeText && (
              <div className="pl-3 ml-3 border-l border-[#E0E8EA] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.totalTime')}</div>
                <div className="text-[0.95rem] lg:text-[1.0625rem]" style={factValue}>{totalTimeText}</div>
              </div>
            )}
            {prepTimeText && (
              <div className="pl-3 ml-3 border-l border-[#E0E8EA] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.prepTime')}</div>
                <div className="text-[0.95rem] lg:text-[1.0625rem]" style={factValue}>{prepTimeText}</div>
              </div>
            )}
            {recipe.serves ? (
              <div className="pl-3 ml-3 border-l border-[#E0E8EA] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.serves')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <button
                    onClick={() => setScaledServings(s => Math.max(1, (s || recipe.serves) - 1))}
                    aria-label={t('detail.fewer')}
                    style={stepperBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0'; e.currentTarget.style.borderColor = '#0C3D4E' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-soft)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="text-[0.95rem] lg:text-[1.0625rem]" style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                    minWidth: 18, textAlign: 'center',
                  }}>
                    {scaledServings ?? recipe.serves}
                  </span>
                  <button
                    onClick={() => setScaledServings(s => (s || recipe.serves) + 1)}
                    aria-label={t('detail.more')}
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
                  >{t('detail.reset')}</button>
                )}
                </div>
              </div>
            ) : null}
            {recipe.cuisine && (
              <div className="basis-full first:pl-0 lg:basis-auto lg:ml-6 lg:pl-6 lg:border-l lg:border-[#E0E8EA] lg:first:ml-0 lg:first:border-l-0 lg:first:pl-0">
                <div style={factLabel}>{t('detail.cuisine')}</div>
                <div className="text-[0.95rem] lg:text-[1.0625rem]" style={factValue}>{recipe.cuisine}</div>
              </div>
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
              return <span key={d} style={{ ...pill, ...s }}>{tagLabel(t, 'dietary', d)}</span>
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
          }}>{t('detail.method')}</div>
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
          onSaved={handleSheetSaved}
        />
      )}
    </div>
  )
}
