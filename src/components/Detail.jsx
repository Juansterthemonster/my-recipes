import { useState, useRef, useEffect } from 'react'
import { GLASS } from '../utils/glass'
import { supabase } from '../supabase'
import { formatTime } from './TimePicker'
import { scaleIngredient } from '../utils/scaleIngredient'
import { useI18n, tagLabel } from '../i18n'
import { compressImage, snapshotFile } from '../utils/compressImage'
import { uploadToR2 } from '../utils/uploadToR2'
import { slugify } from '../utils/slugify'
import { getNativeShare } from '../utils/inApp'
import Spotlight from './Spotlight'
import GlassDialog from './GlassDialog'
import { tourSeen, markTourSeen } from '../utils/tours'

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
        color: 'var(--text-primary)', borderRadius: 8, transition: 'background 150ms, color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-08)'}
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
// Desktop photo strip: 2:3 tiles, 520px tall
const DESK_TILE_W = 347
const DESK_GAP = 12

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
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
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
  const [counts,       setCounts]       = useState({})
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
      const cols = colRes.data || []
      setCollections(cols)
      if (cols.length) {
        const { data: rows } = await supabase.from('collection_recipes').select('collection_id').in('collection_id', cols.map(c => c.id))
        const tally = {}
        ;(rows || []).forEach(r => { tally[r.collection_id] = (tally[r.collection_id] || 0) + 1 })
        setCounts(tally)
      }
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

  const groupCard = {
    background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 14, overflow: 'hidden',
  }
  const closeIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  return (
    <GlassDialog solid open onClose={onClose} label={t('detail.addToCollection')} maxWidth={520}>
      {/* Styled like the iOS "Add to collection" sheet: grouped rounded lists, name + recipe count per row.
          Android layout kept: tick on the right, Save at the bottom. The sheet itself (GlassDialog → BottomSheet on
          phones) provides the drag handle, drag-to-close and scrolling. */}
      <div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '6px 6px 14px', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2,
            color: 'var(--text-primary)',
          }}>{t('detail.addToCollection')}</span>
          <button
            onClick={onClose}
            aria-label={t('detail.close')}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              background: 'var(--neutral-bg)', border: 'none', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{closeIcon}</button>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* New collection */}
          <div style={groupCard}>
            {showInput ? (
              <div style={{ padding: '10px 12px 10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={newColRef}
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowInput(false); setNewColName('') } }}
                  placeholder={t('detail.collectionName')}
                  maxLength={60}
                  style={{
                    flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-primary)', padding: '8px 0',
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newColName.trim() || creating}
                  style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--r-full)',
                    background: newColName.trim() ? 'var(--green-primary)' : 'var(--border-soft)',
                    color: newColName.trim() ? 'var(--on-primary-white)' : 'var(--text-tertiary)',
                    border: 'none', cursor: newColName.trim() ? 'pointer' : 'default',
                    fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600,
                    transition: 'background 150ms, color 150ms',
                  }}
                >{creating ? t('detail.creating') : t('detail.create')}</button>
                <button
                  onClick={() => { setShowInput(false); setNewColName('') }}
                  aria-label={t('detail.close')}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6, display: 'flex' }}
                >{closeIcon}</button>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56,
                  padding: '0 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--font-body)', fontSize: '0.97rem', fontWeight: 600, color: 'var(--text-primary)',
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--green-light)', color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                {t('detail.newCollection')}
              </button>
            )}
          </div>

          {/* Collection list */}
          {loading ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{t('browse.loading')}</div>
          ) : collections.length === 0 ? (
            <div style={{ padding: '20px 20px 28px', textAlign: 'center', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{t('detail.createFirst')}</div>
          ) : (
            <div style={groupCard}>
              {collections.map((col, i) => {
                const checked = checkedIds.has(col.id)
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleCheck(col.id)}
                    role="checkbox"
                    aria-checked={checked}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                      width: '100%', minHeight: 64, padding: '10px 16px', textAlign: 'left',
                      background: checked ? 'var(--green-tint)' : 'none', border: 'none', cursor: 'pointer',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                      transition: 'background 150ms',
                    }}
                  >
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '0.97rem', fontWeight: 500, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{col.name}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {t('col.recipeCount', { count: counts[col.id] || 0 })}
                      </span>
                    </span>
                    {/* Tick on the right (circle, like the iOS selection mark) */}
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      border: `1.75px solid ${checked ? 'var(--green-primary)' : 'var(--text-tertiary)'}`,
                      background: checked ? 'var(--green-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 150ms, border-color 150ms',
                    }}>
                      {checked && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="var(--on-primary-white)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer — Save */}
        <div style={{ position: 'sticky', bottom: 0, padding: '10px 0 16px', background: 'var(--cream)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '15px', borderRadius: 'var(--r-full)',
              background: hasChanges ? 'var(--green-primary)' : 'var(--border-soft)',
              color: hasChanges ? 'var(--on-primary-white)' : 'var(--text-tertiary)',
              border: 'none', cursor: hasChanges ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)', fontSize: '0.97rem', fontWeight: 600,
              transition: 'background 150ms, color 150ms', opacity: saving ? 0.7 : 1,
            }}
          >{saving ? t('col.saving') : t('col.save')}</button>
        </div>
      </div>
    </GlassDialog>
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
  onRequireAccount = null,   // signed-out visitor tapped something that needs an account
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
  // Starter recipes (given to every account): "by @creator · Added on <date>", never "edited by you".
  const isStarter = !!recipe.starter_by
  const isCopy = isOwner && !!recipe.copied_from && !isStarter
  const authorName = isStarter ? recipe.starter_by : isCopy ? originalAuthor : (isOwner ? username : recipe.author_username)
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
  // Phones/tablets: tap the photo to show all of it (it is cropped to a 260px band by default).
  // The page just grows — the recipe moves down — no lightbox. Tap again to crop it back.
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoOpenH, setPhotoOpenH] = useState(260)
  const singlePhotoRef = useRef(null)
  function measurePhoto() {
    const box = photos.length > 1 ? photoScrollRef.current : singlePhotoRef.current
    if (!box || !box.clientWidth) return
    const img = (photos.length > 1 ? box.children[activePhoto] : box)?.querySelector('img')
    if (!img || !img.naturalWidth) return
    setPhotoOpenH(Math.round(box.clientWidth * img.naturalHeight / img.naturalWidth))
  }
  useEffect(() => {
    if (!photoOpen) return
    measurePhoto()
    window.addEventListener('resize', measurePhoto)
    return () => window.removeEventListener('resize', measurePhoto)
  }, [photoOpen, activePhoto])
  // One-time spotlight tour: "tap the photo to see all of it". Phones/tablets only, only when the
  // photo really is cropped, only until it has been seen once (see src/utils/tours.js).
  const [photoTour, setPhotoTour] = useState(false)
  const getPhotoBox = () => (photos.length > 1 ? photoScrollRef.current : singlePhotoRef.current)
  function endPhotoTour() {
    if (!photoTour) return
    markTourSeen('photo-expand')
    setPhotoTour(false)
  }
  useEffect(() => {
    if (isDesktopPhotoView || photos.length === 0 || tourSeen('photo-expand')) return
    let tries = 0
    let timer = setTimeout(function check() {
      const box = getPhotoBox()
      const img = box?.querySelector('img')
      if (!box || !img) return
      if (!img.naturalWidth) { if (++tries < 4) timer = setTimeout(check, 1000); return }   // still loading
      const fullHeight = box.clientWidth * img.naturalHeight / img.naturalWidth
      if (fullHeight > box.clientHeight + 24) setPhotoTour(true)   // only when there is more to see
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id, isDesktopPhotoView])
  // Desktop (lg+): every photo is a 2:3 tile in one horizontal strip with 8px side margins. When they don't all fit,
  // a cut-off photo runs right to the edge (no margin there), so it is clear there is more, and prev/next arrows scroll.
  const deskStripRef = useRef(null)
  const [deskNav, setDeskNav] = useState({ prev: false, next: false })
  function updateDeskNav() {
    const el = deskStripRef.current
    if (!el) return
    const prev = el.scrollLeft > 4
    const next = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setDeskNav(d => (d.prev === prev && d.next === next ? d : { prev, next }))
  }
  useEffect(() => {
    const id = requestAnimationFrame(updateDeskNav)
    window.addEventListener('resize', updateDeskNav)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', updateDeskNav) }
  }, [photos.length, isDesktopPhotoView])
  // The photos' own clip: a side where a photo is cut off is square (no rounded corner), so it looks like it continues.
  // (The grey background behind them keeps its rounded corners.)
  const deskRadius = (() => {
    const left = deskNav.prev ? '0' : 'var(--r-lg)'
    const right = deskNav.next ? '0' : 'var(--r-lg)'
    return `${left} ${right} ${right} ${left}`
  })()
  function scrollDesk(dir) {
    // a little less than one tile, so the photo you just passed still peeks in at the edge
    deskStripRef.current?.scrollBy({ left: dir * (DESK_TILE_W + DESK_GAP - 56), behavior: 'smooth' })
  }
  const photoBoxStyle = {
    height: photoOpen ? photoOpenH : 260, transition: 'height 260ms ease', cursor: 'pointer',
  }
  const photoToggleProps = {
    role: 'button', tabIndex: 0, 'aria-expanded': photoOpen,
    onClick: () => { setPhotoOpen(o => !o); endPhotoTour() },
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPhotoOpen(o => !o); endPhotoTour() } },
  }
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
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { e.target.value = ''; return }
    setUploading(true)
    // Copy into memory now — picker handles on Android can expire mid-upload
    const files = await Promise.all(picked.slice(0, room).map(snapshotFile))
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

  // Make the photo being viewed the cover (first photo) without opening the editor.
  const [settingCover, setSettingCover] = useState(false)
  const canSetCover = isOwner && !readOnly && photoOpen && !isDesktopPhotoView && photos.length > 1 && activePhoto > 0
  async function handleSetCover(index = activePhoto) {
    if (!isOwner || readOnly || settingCover || index < 1 || index >= photos.length) return
    const picked = photos[index]
    const newPhotos = [picked, ...photos.filter((_, i) => i !== index)]
    setSettingCover(true)
    const { error } = await supabase.from('recipes').update({ photos: newPhotos, photo_url: newPhotos[0] }).eq('id', recipe.id)
    setSettingCover(false)
    if (error) { onToast?.(t('detail.coverFailed'), 'error'); return }
    setRecipe(r => ({ ...r, photos: newPhotos, photo_url: newPhotos[0] }))
    setActivePhoto(0)
    photoScrollRef.current?.scrollTo({ left: 0 })
    deskStripRef.current?.scrollTo({ left: 0 })
    onToast?.(t('detail.coverSet'))
  }

  async function handleTogglePublic() {
    const newVal = !recipe.is_public
    await supabase.from('recipes').update({ is_public: newVal }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, is_public: newVal }))
    setMenuOpen(false)
  }

  async function handleToggleLike() {
    if (!session?.user) { onRequireAccount?.('like', recipe); return }
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
    if (!session?.user) { onRequireAccount?.('save', recipe); return }
    if (isAdded || adding) return
    setAdding(true)
    const { id, created_at, updated_at, last_opened_at: _opened, short_code: _code, starter_by: _starter, author_username, is_liked: _liked, ...rest } = recipe
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
    // New links: /recipe/lemon-chicken-k7x2 (cosmetic name + the recipe's 4-char short code).
    // Recipes without a code yet (SQL not run) fall back to the older /recipe/<slug>/<id> link.
    const slug = slugify(recipe.name).slice(0, 50).replace(/-+$/, '')
    const url = recipe.short_code
      ? `${window.location.origin}/recipe/${slug ? `${slug}-` : ''}${recipe.short_code}`
      : `${window.location.origin}/recipe/${slug ? `${slug}/` : ''}${recipe.id}`

    /* ── Tier 1: native share sheet (iOS Safari, Android Chrome, etc.) ──────
       navigator.share() works on mobile over HTTP as well as HTTPS, so it's
       the most reliable path on phones. We only treat AbortError (user
       dismissed the sheet) as a non-error; anything else falls through.      */
    // In the Android app, the web Share API isn't available — use the native share sheet plugin.
    const nativeShare = getNativeShare()
    if (nativeShare) {
      try {
        await nativeShare.share({ title: recipe.name, text: recipe.name, url, dialogTitle: recipe.name })
        return
      } catch (err) {
        if (/cancel/i.test(String(err?.message || err))) return   // user dismissed the sheet
        // Anything else: fall through to the clipboard
      }
    }
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
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>

      {/* ── Nav ── */}
      {readOnly ? (
        /* Read-only nav: wordmark + Sign in CTA */
        <div
          style={{ background: 'var(--cream)' }}
          className="
            px-5 py-[14px] flex items-center justify-between sticky top-0 z-10
            lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
            lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
            lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
          "
        >
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '0.06em',
            textTransform: 'uppercase', fontSize: '1.15rem', lineHeight: 1,
          }}>MI SAZÓN</span>
          <button
            onClick={onSignIn}
            style={{
              ...GLASS,
              fontSize: '0.82rem', fontWeight: 500, padding: '8px 18px',
              borderRadius: 'var(--r-full)', color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >{t('detail.signInToSave')}</button>
        </div>
      ) : (
        /* Normal nav */
        <div
          style={{ background: 'var(--cream)' }}
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
            color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
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
                  ...GLASS,
                  fontSize: '0.82rem', fontWeight: 500, padding: '8px 18px',
                  borderRadius: 'var(--r-full)', color: 'var(--text-primary)',
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
                      justifyContent: 'center', flexShrink: 0, color: 'var(--text-primary)',
                      borderRadius: 6, transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-08)'}
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
                      background: 'var(--surface)', border: '1px solid var(--border-soft)',
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
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)' }}
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
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)' }}
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
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)' }}
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
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      >
                        {recipe.is_public ? t('detail.makePrivate') : t('detail.makePublic')}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => { setMenuOpen(false); handleDelete() }}
                        style={{
                          display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                          fontSize: '0.9rem', color: 'var(--danger-menu)', background: 'none', border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms, color 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-hover)'; e.currentTarget.style.color = 'var(--on-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--danger-menu)' }}
                      >{t('detail.deleteRecipe')}</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── NON-OWNER (logged in) actions ── */}
            {!isOwner && (session?.user || onRequireAccount) && (
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
                      ...GLASS,
                      fontSize: '0.82rem', fontWeight: 500, padding: '8px 18px',
                      borderRadius: 'var(--r-full)', color: 'var(--text-primary)',
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
                    onClick={() => session?.user ? setMenuOpen(o => !o) : onRequireAccount?.('collection', recipe)}
                    aria-label={t('detail.moreOptions')}
                    style={{
                      width: 34, height: 34,
                      background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, color: 'var(--text-primary)',
                      borderRadius: 6, transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-08)'}
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
                      background: 'var(--surface)', border: '1px solid var(--border-soft)',
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
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)' }}
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

      {/* ── Header card ──
          Desktop (lg+): two columns. Left (1/3): the recipe info. Right (2/3): the photos (or the owner's "Add photo"
          tile), so the top of the page is more visual. Below lg nothing changes: photos on top, info under. */}
      <div
        className={`mx-4 mt-4 lg:mx-10${(photos.length > 0 || isOwner) ? ' lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8 lg:items-start' : ''}`}
        style={{
        background: photos.length > 0 ? 'var(--surface)' : 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        border: photos.length > 0 ? '1px solid var(--border-soft)' : '1px solid var(--border-card)',
        padding: '24px',
        position: 'relative',
      }}>

        {/* Desktop: a very subtle well behind the photos, so the room for more photos is faintly visible
            when there are only one or two (instead of blank space). */}
        <div className={`lg:col-start-2 lg:row-start-1 min-w-0${photos.length > 0 ? ' lg:bg-[var(--neutral-bg-2)] lg:rounded-[var(--r-lg)] lg:py-2 lg:overflow-hidden' : ''}`}>
        {photos.length > 0 ? (
          /* Photo(s) present — heart sits top-right over the image (blur style).
             A swipeable carousel with dot indicators renders only when there is
             more than one photo; a single photo renders exactly as before. */
          <div
            className="lg:!m-0 lg:!w-fit lg:!max-w-full"
            style={{ position: 'relative', margin: '-24px -24px 10px', overflow: 'hidden', borderRadius: isDesktopPhotoView ? deskRadius : 'var(--r-lg) var(--r-lg) 0 0' }}
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
                      display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory',
                      WebkitOverflowScrolling: 'touch', ...photoBoxStyle,
                    }}
                    {...photoToggleProps}
                  >
                    {photos.map((url, i) => (
                      <div key={url + i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}>
                        <img
                          src={url} alt={t('detail.photoAlt', { name: recipe.name, n: i + 1 })}
                          onLoad={i === activePhoto ? measurePhoto : undefined}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </>
            ) : (
              <div ref={singlePhotoRef} className="lg:hidden" style={photoBoxStyle} {...photoToggleProps}>
                <img
                  src={photos[0]} alt={recipe.name}
                  onLoad={measurePhoto}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Desktop (lg+): all photos as 2:3 tiles in one strip. Same controls whatever the count: "Add photos"
                top-left, heart top-right, and on every photo but the first a "Use as cover" button. */}
            <div
              ref={deskStripRef} onScroll={updateDeskNav}
              className="hidden lg:flex pill-row"
              style={{ gap: DESK_GAP, overflowX: 'auto', overflowY: 'hidden', paddingLeft: 8, paddingRight: 8 }}
            >
              {photos.map((url, i) => (
                <div key={url + i} style={{
                  position: 'relative', flex: `0 0 ${DESK_TILE_W}px`, aspectRatio: '2/3',
                  borderRadius: 'var(--r-lg)', overflow: 'hidden', background: '#000',
                }}>
                  <img
                    src={url} alt={t('detail.photoAlt', { name: recipe.name, n: i + 1 })} draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {isOwner && !readOnly && i > 0 && (
                    <button
                      type="button" onClick={() => handleSetCover(i)} disabled={settingCover}
                      style={{
                        ...blurBtn, position: 'absolute', left: 12, bottom: 12, gap: 6, padding: '9px 14px', color: '#fff',
                        borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 500,
                        cursor: settingCover ? 'default' : 'pointer', opacity: settingCover ? 0.7 : 1,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                    >{t('detail.useAsCover')}</button>
                  )}
                </div>
              ))}
            </div>
            {/* Very soft shadow on the side where a photo is cut off, to suggest it continues */}
            {isDesktopPhotoView && (
              <>
                <div aria-hidden style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0, width: 56, pointerEvents: 'none',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.16), rgba(0,0,0,0))',
                  opacity: deskNav.prev ? 1 : 0, transition: 'opacity 180ms',
                }} />
                <div aria-hidden style={{
                  position: 'absolute', top: 0, bottom: 0, right: 0, width: 56, pointerEvents: 'none',
                  background: 'linear-gradient(to left, rgba(0,0,0,0.16), rgba(0,0,0,0))',
                  opacity: deskNav.next ? 1 : 0, transition: 'opacity 180ms',
                }} />
              </>
            )}
            {isDesktopPhotoView && deskNav.prev && (
              <button
                type="button" onClick={() => scrollDesk(-1)} aria-label={t('detail.prevPhoto')}
                style={{ ...blurBtn, position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: 38, height: 38, color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            )}
            {isDesktopPhotoView && deskNav.next && (
              <button
                type="button" onClick={() => scrollDesk(1)} aria-label={t('detail.nextPhoto')}
                style={{ ...blurBtn, position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: 38, height: 38, color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
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
                      background: i === activePhoto ? 'var(--surface)' : 'rgba(255,255,255,0.45)',
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

            {isOwner && !readOnly && (photos.length < MAX_PHOTOS || canSetCover) && (
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
              {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={triggerAddPhotos}
                disabled={uploading}
                aria-label={t('detail.addMorePhotosLabel')}
                style={{
                  ...blurBtn, gap: 6,
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
              {canSetCover && (
                <button
                  type="button"
                  onClick={() => handleSetCover()}
                  disabled={settingCover}
                  style={{
                    ...blurBtn, gap: 6, padding: '9px 14px', color: '#fff', borderRadius: 'var(--r-full)',
                    fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 500,
                    cursor: settingCover ? 'default' : 'pointer', opacity: settingCover ? 0.7 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                >
                  {t('detail.useAsCover')}
                </button>
              )}
              </div>
            )}

            {!readOnly && (
              isOwner ? (
                <button
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
                  style={{ ...blurBtn, position: 'absolute', top: 12, right: 12, padding: 10,
                    color: recipe.is_favourite ? 'var(--heart)' : '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
                >
                  <HeartIcon filled={recipe.is_favourite} />
                </button>
              ) : (session?.user || onRequireAccount) ? (
                <button
                  onClick={handleToggleLike}
                  aria-label={isLiked ? t('card.unlike') : t('card.like')}
                  style={{ ...blurBtn, position: 'absolute', top: 12, right: 12, padding: 10,
                    color: isLiked ? 'var(--heart)' : '#fff' }}
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
              <div className="lg:!m-0 lg:!rounded-[var(--r-lg)]" style={{
                position: 'relative',
                margin: '-24px -24px 10px',
                borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
                overflow: 'hidden',
              }}>
                <button
                  type="button"
                  className="lg:!h-[280px]"
                  onClick={() => !uploading && photoInputRef.current?.click()}
                  style={{
                    width: '100%', height: 100,
                    background: 'var(--neutral-bg)',
                    border: 'none',
                    cursor: uploading ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 10, color: 'var(--neutral-fg)', fontFamily: 'var(--font-body)',
                    transition: 'background 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = 'var(--neutral-bg-hover)'; e.currentTarget.style.color = 'var(--placeholder)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--neutral-bg)'; e.currentTarget.style.color = 'var(--neutral-fg)' }}
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
                    color: recipe.is_favourite ? 'var(--heart)' : '#fff',
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

        </div>

        <div className="lg:col-start-1 lg:row-start-1 min-w-0">
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
              marginBottom: authorName || addedDate || savedToMineDate || (recipe.copied_from && recipe.is_modified && !isStarter) ? 6 : 10,
              letterSpacing: '-0.01em',
            }}>{recipe.name}</h1>

        {/* Modification notice — directly under recipe name */}
        {recipe.copied_from && recipe.is_modified && !isStarter && (
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
              <div className="pl-3 ml-3 border-l border-[var(--border-soft)] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.totalTime')}</div>
                <div className="text-[0.95rem] lg:text-[1.0625rem]" style={factValue}>{totalTimeText}</div>
              </div>
            )}
            {prepTimeText && (
              <div className="pl-3 ml-3 border-l border-[var(--border-soft)] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.prepTime')}</div>
                <div className="text-[0.95rem] lg:text-[1.0625rem]" style={factValue}>{prepTimeText}</div>
              </div>
            )}
            {recipe.serves ? (
              <div className="pl-3 ml-3 border-l border-[var(--border-soft)] first:pl-0 first:ml-0 first:border-l-0 lg:pl-6 lg:ml-6">
                <div style={factLabel}>{t('detail.serves')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <button
                    onClick={() => setScaledServings(s => Math.max(1, (s || recipe.serves) - 1))}
                    aria-label={t('detail.fewer')}
                    style={stepperBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)'; e.currentTarget.style.borderColor = 'var(--green-primary)' }}
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
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--on-primary)'; e.currentTarget.style.borderColor = 'var(--green-primary)' }}
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
              <div className="basis-full first:pl-0 lg:basis-auto lg:ml-6 lg:pl-6 lg:border-l lg:border-[var(--border-soft)] lg:first:ml-0 lg:first:border-l-0 lg:first:pl-0">
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
                'Vegan':        { background: 'var(--surface)',        color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' },
                'Pescatarian':  { background: 'var(--violet-light)', color: 'var(--violet-accent)' },
              }[d] || {}
              return <span key={d} style={{ ...pill, ...s }}>{tagLabel(t, 'dietary', d)}</span>
            })}
          </div>
        )}
        </div>

      </div>

      {/* ── Ingredients (with scaling) ── */}
      {ingredients.length > 0 && (
        <IngredientCard ingredients={ingredients} scaleFactor={scaleFactor} />
      )}

      {/* ── Method ── */}
      {steps.length > 0 && (
        <div className="mx-4 mt-3 lg:mx-10" style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
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

      <Spotlight
        open={photoTour}
        getTarget={getPhotoBox}
        title={t('tour.photo-expand.title')}
        body={t('tour.photo-expand.body')}
        buttonLabel={t('tour.gotIt')}
        onClose={endPhotoTour}
      />

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
