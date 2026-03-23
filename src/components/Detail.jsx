import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatTime } from './TimePicker'

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
function IngRow({ ing }) {
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
      {ing.amount && (
        <div style={{ paddingLeft: 12, marginTop: 2 }}>
          <span
            className="text-[0.875rem] md:text-[0.78rem]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >{ing.amount}</span>
        </div>
      )}
    </div>
  )
}

/* ─── INGREDIENT CARD ──────────────────────────────────────────────────────── */
function IngredientCard({ ingredients }) {
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
        {items.map((ing, i) => <IngRow key={i} ing={ing} />)}
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

/* ─── DETAIL ───────────────────────────────────────────────────────────────── */
export default function Detail({ recipe: initialRecipe, onBack, onEdit, onDelete, onAddedToMyRecipes, session }) {
  const [recipe, setRecipe]     = useState(initialRecipe)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [uploading, setUploading] = useState(false)
  // Non-owner interaction state
  const [isLiked, setIsLiked]         = useState(initialRecipe.is_liked ?? false)
  const [isAdded, setIsAdded]         = useState(false)
  const [adding, setAdding]           = useState(false)
  const [originalAuthor, setOriginalAuthor] = useState(null)
  const menuRef       = useRef(null)
  const photoInputRef = useRef(null)

  const isOwner = recipe.user_id === session?.user?.id

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

  async function handleDelete() {
    if (!window.confirm(`Delete "${recipe.name}"?`)) return
    await supabase.from('recipes').delete().eq('id', recipe.id)
    onDelete()
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
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${session.user.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('recipe-photos')
      .upload(path, file, { upsert: true })
    if (uploadErr) { setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-photos')
      .getPublicUrl(path)
    await supabase.from('recipes').update({ photo_url: publicUrl }).eq('id', recipe.id)
    setRecipe(r => ({ ...r, photo_url: publicUrl }))
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
    // Strip client-side-only fields before inserting
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

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const steps       = Array.isArray(recipe.steps) ? recipe.steps : []
  const totalTimeText = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `Total time: ${formatTime(recipe.total_time_min)}–${formatTime(recipe.total_time_max)}`
      : `Total time: ${formatTime(recipe.total_time_min)}`
    : null
  const prepTimeText = recipe.active_time_mins
    ? `Prep time: ${formatTime(recipe.active_time_mins)}`
    : null

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
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Recipes
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Edit button — owners only */}
          {isOwner && (
            <button onClick={() => onEdit(recipe)} style={{
              fontSize: '0.82rem', fontWeight: 500, padding: '7px 18px',
              borderRadius: 'var(--r-full)', border: '1.5px solid #0C3D4E',
              background: 'transparent', color: '#0C3D4E',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>Edit</button>
          )}

          {/* "Already saved" label — non-owners only, shown once added */}
          {!isOwner && isAdded && (
            <span style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontStyle: 'italic',
            }}>
              Saved to my recipes
            </span>
          )}

          {/* Add to my recipes — non-owners only, hidden once already added */}
          {!isOwner && !isAdded && (
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

          {/* Kebab menu — owners only */}
          {isOwner && (
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
          )}
        </div>
      </div>

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
            {isOwner ? (
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
            ) : (
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
            )}
          </div>
        ) : (
          /* No photo — "Add photo" clickable placeholder (owners) or nothing (visitors) */
          <>
            {/* Hidden file input */}
            <input
              ref={photoInputRef}
              type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {isOwner ? (
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
                    gap: 10,
                    color: '#9CA3AF',
                    fontFamily: 'var(--font-body)',
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

                {/* Heart — blurBtn style on top of placeholder */}
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
            ) : null}
          </>
        )}

        {recipe.meal_type && (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).length > 0 && (
          <div style={{
            fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)', marginBottom: 8,
          }}>
            {(Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).join(' · ')}
          </div>
        )}

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

        {(recipe.serves || recipe.cuisine) && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
            {[recipe.serves && `Serves ${recipe.serves}`, recipe.cuisine].filter(Boolean).join(' · ')}
          </p>
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

      {ingredients.length > 0 && <IngredientCard ingredients={ingredients} />}

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
    </div>
  )
}
