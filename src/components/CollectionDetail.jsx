import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MyRecipeCard, PublicRecipeCard } from './RecipeCards'

/* ─── REMOVE CONFIRMATION MODAL ─────────────────────────────────────────────── */
function RemoveConfirmModal({ onConfirm, onCancel }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301,
        background: '#F9F6F0',
        borderRadius: 16,
        padding: '28px 24px',
        width: 'min(360px, calc(100vw - 48px))',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4,
        }}>
          This will remove the recipe from your collection but not delete the recipe.
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '0.88rem',
          color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5,
        }}>
          Would you like to remove it or keep it?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: 'transparent', border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 500,
            }}
          >Keep</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: '#0C3D4E', border: 'none',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600,
            }}
          >Remove</button>
        </div>
      </div>
    </>
  )
}

/* ─── BACK ARROW ────────────────────────────────────────────────────────────── */
function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

/* ─── COLLECTION DETAIL ─────────────────────────────────────────────────────── */
/*
  Props:
    collection  – the collection object from Browse state
                  { id, name, recipe_count, photos }
    session     – Supabase session
    onBack      – navigate back to the My Collections tab
    onSelect    – open a recipe in Detail view
*/
export default function CollectionDetail({ collection, session, onBack, onSelect }) {
  const [recipes,      setRecipes]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [removeTarget, setRemoveTarget] = useState(null)   // recipe to confirm-remove

  useEffect(() => { fetchMembers() }, [collection.id])

  async function fetchMembers() {
    setLoading(true)

    // Single query: collection_recipes joined to the full recipes row
    const { data: crData, error } = await supabase
      .from('collection_recipes')
      .select('recipe_id, added_at, recipes(*)')
      .eq('collection_id', collection.id)
      .order('added_at', { ascending: false })

    if (error || !crData) { setLoading(false); return }

    const allRecipes = crData.map(row => row.recipes).filter(Boolean)

    // Recipes that belong to another user need is_liked + author_username
    const publicRecipes = allRecipes.filter(r => r.user_id !== session.user.id)

    let likedSet   = new Set()
    let profileMap = {}

    if (publicRecipes.length > 0) {
      const pubIds    = publicRecipes.map(r => r.id)
      const authorIds = [...new Set(publicRecipes.map(r => r.user_id).filter(Boolean))]

      const [likesRes, profilesRes] = await Promise.all([
        supabase.from('likes').select('recipe_id')
          .eq('user_id', session.user.id)
          .in('recipe_id', pubIds),
        authorIds.length > 0
          ? supabase.from('profiles').select('id, username').in('id', authorIds)
          : Promise.resolve({ data: [] }),
      ])

      likedSet   = new Set((likesRes.data   || []).map(l => l.recipe_id))
      profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.username]))
    }

    // Merge enrichment back onto each recipe, preserve added_at ordering
    const enriched = allRecipes.map(r => {
      if (r.user_id === session.user.id) return r
      return {
        ...r,
        is_liked:        likedSet.has(r.id),
        author_username: profileMap[r.user_id] || null,
      }
    })

    setRecipes(enriched)
    setLoading(false)
  }

  /* ── Local optimistic toggles ───────────────────────────────────────────── */
  async function toggleFavourite(recipe, e) {
    e.stopPropagation()
    const newVal = !recipe.is_favourite
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favourite: newVal } : r))
    await supabase.from('recipes').update({ is_favourite: newVal }).eq('id', recipe.id)
  }

  async function toggleLike(recipe, e) {
    e.stopPropagation()
    const newIsLiked = !recipe.is_liked
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_liked: newIsLiked } : r))
    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: session.user.id, recipe_id: recipe.id })
    } else {
      await supabase.from('likes').delete()
        .eq('user_id', session.user.id).eq('recipe_id', recipe.id)
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget) return
    const id = removeTarget.id
    setRemoveTarget(null)
    // Optimistic removal
    setRecipes(prev => prev.filter(r => r.id !== id))
    await supabase.from('collection_recipes')
      .delete()
      .eq('collection_id', collection.id)
      .eq('recipe_id', id)
  }

  const count = recipes.length

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>

      {/* ── Nav ── */}
      <div
        style={{ background: '#F9F6F0', position: 'sticky', top: 0, zIndex: 10 }}
        className="
          px-5 py-[14px] flex items-center justify-between
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 600,
            color: '#0C3D4E', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          <BackArrow />
          Collections
        </button>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-10 lg:px-10">

        {/* Collection name + recipe count */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 400,
            color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 6,
          }}>{collection.name}</h1>
          {!loading && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.85rem',
              color: 'var(--text-secondary)', margin: 0,
            }}>
              {count} {count === 1 ? 'recipe' : 'recipes'}
            </p>
          )}
        </div>

        {/* Recipe grid */}
        {loading ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 20px', textAlign: 'center',
            fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>Loading…</div>
        ) : recipes.length === 0 ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ color: 'var(--green-primary)', marginBottom: 16, opacity: 0.7 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
              color: 'var(--text-primary)', marginBottom: 8,
            }}>This collection is empty</div>
            <div style={{
              fontSize: '0.85rem', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', lineHeight: 1.5, maxWidth: 260,
            }}>Open any recipe and use the menu to add it here.</div>
          </div>
        ) : (
          <div className="masonry-grid">
            {recipes.map(recipe => (
              <div key={recipe.id} className="masonry-item">
                {recipe.user_id === session.user.id ? (
                  <MyRecipeCard
                    recipe={recipe}
                    onClick={() => onSelect(recipe)}
                    onToggleFavourite={e => toggleFavourite(recipe, e)}
                    onRemove={e => { e.stopPropagation(); setRemoveTarget(recipe) }}
                  />
                ) : (
                  <PublicRecipeCard
                    recipe={recipe}
                    onClick={() => onSelect(recipe)}
                    onToggleLike={e => toggleLike(recipe, e)}
                    onRemove={e => { e.stopPropagation(); setRemoveTarget(recipe) }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove confirmation modal — position:fixed, lives outside layout tree */}
      {removeTarget && (
        <RemoveConfirmModal
          onConfirm={handleConfirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}
