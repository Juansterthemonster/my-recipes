import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/* ─── NAV ─────────────────────────────────────────────────────────────────────
   Background: forest green (--green-primary)
   App name:   white, uppercase
   CTA button: white text, white 1.5px border, transparent fill
   Full-width breakout on desktop via the negative-margin pattern.
*/
function Nav({ onAdd }) {
  return (
    <div
      style={{
        background: 'var(--green-primary)',
        position: 'sticky', top: 0, zIndex: 10,
      }}
      className="
        px-5 py-[14px] flex items-center justify-between
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
      "
    >
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '1.25rem', fontWeight: 800,
        color: '#FFFFFF', letterSpacing: '0.06em',
        textTransform: 'uppercase', lineHeight: 1,
      }}>MI SAZÓN</span>

      <button
        onClick={onAdd}
        style={{
          background: 'transparent',
          color: '#FFFFFF',
          border: '1.5px solid #FFFFFF',
          borderRadius: 'var(--r-full)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.82rem', fontWeight: 500, letterSpacing: '0.05em',
          padding: '9px 22px', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center',
        }}
      >Add recipe</button>
    </div>
  )
}

/* ─── SEARCH BAR ──────────────────────────────────────────────────────────────
   Pill filters removed (v1.1). Search only — cleaner, lets the tag hierarchy
   on cards do the filtering work visually.
   Full-width breakout matches Nav; inner content constrained to max-w-2xl.
*/
function SearchBar({ search, onSearch }) {
  return (
    <div
      style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-soft)' }}
      className="
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        px-5 py-3
      "
    >
      <div className="w-full lg:max-w-2xl">
        <input
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{
            display: 'block', width: '100%',
            background: 'var(--cream)', border: '1.5px solid var(--border-soft)',
            borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)',
            fontSize: '0.95rem', color: 'var(--text-primary)',
            padding: '10px 18px', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

/* ─── RECIPE CARD ─────────────────────────────────────────────────────────────
   Tag hierarchy (v1.1):
     • Meal type: muted uppercase eyebrow label above the name
     • Dietary:   colour-coded pills below the time metadata
     • Cuisine:   detail-only — not shown on cards
   Visual tile (v1.1):
     • Emoji removed. Right tile is a plain --green-light block.
       Keeps the layout's structural rhythm without any dynamic content.
   Layout:
     • height:'100%' + minHeight:80 fills the grid cell and prevents
       single-word recipes collapsing too small.
     • items-stretch on the grid (Browse render) ensures row-uniform heights.
*/
function RecipeCard({ recipe, onClick }) {
  const fmtTime = (mins) => {
    if (!mins) return null
    const h = Math.floor(mins / 60), m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    return h > 0 ? `${h}h` : `${m}m`
  }

  const totalTimeLabel = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `${fmtTime(recipe.total_time_min)}–${fmtTime(recipe.total_time_max)}`
      : fmtTime(recipe.total_time_min)
    : null

  const mealTypeLabel = recipe.meal_type
    ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).join(' · ')
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)',
        borderRadius: 8,
        border: '1px solid var(--border-soft)',
        cursor: 'pointer',
        height: '100%',
        minHeight: 80,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
      }}
    >
      {/* LEFT — text content */}
      <div style={{ minWidth: 0, flex: 1 }}>

        {/* Meal type eyebrow — muted uppercase label, before the recipe name */}
        {mealTypeLabel && (
          <div style={{
            fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', marginBottom: 4,
          }}>{mealTypeLabel}</div>
        )}

        {/* Name — display font, clamped to 2 lines */}
        <div
          className="text-[1.2rem] md:text-[1rem]"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400, color: 'var(--text-primary)',
            lineHeight: 1.25, marginBottom: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >{recipe.name}</div>

        {/* Time metadata — plain text labels, no icons */}
        {(totalTimeLabel || recipe.active_time_mins) && (
          <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {totalTimeLabel && (
              <span
                className="text-[0.875rem] md:text-[0.75rem]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
              >Total time: {totalTimeLabel}</span>
            )}
            {recipe.active_time_mins && (
              <span
                className="text-[0.875rem] md:text-[0.75rem]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
              >Prep time: {fmtTime(recipe.active_time_mins)}</span>
            )}
          </div>
        )}

        {/* Dietary tags — colour-coded pills; cuisine is detail-only */}
        {recipe.dietary && recipe.dietary.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recipe.dietary.map(d => {
              const s = {
                'Gluten free':  { background: 'var(--cream-mid)',    color: 'var(--text-secondary)' },
                'Vegetarian':   { background: 'var(--green-tint)',   color: 'var(--green-primary)' },
                'Vegan':        { background: 'var(--white)',        color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' },
                'Pescatarian':  { background: 'var(--violet-light)', color: 'var(--violet-accent)' },
              }[d] || {}
              return (
                <span key={d} style={{
                  fontSize: '0.72rem', padding: '5px 13px',
                  borderRadius: 'var(--r-full)', fontWeight: 500,
                  fontFamily: 'var(--font-body)', border: 'none',
                  ...s,
                }}>{d}</span>
              )
            })}
          </div>
        )}
      </div>

      {/* RIGHT — solid green-light block; emoji removed (v1.1) */}
      <div style={{
        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
        background: 'var(--green-light)',
        marginTop: 1,
      }} />
    </div>
  )
}

export default function Browse({ onSelect, onAdd }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchRecipes() }, [])

  async function fetchRecipes() {
    setLoading(true)
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
    if (!error) setRecipes(data || [])
    setLoading(false)
  }

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Nav onAdd={onAdd} />
      <SearchBar search={search} onSearch={setSearch} />

      <div className="px-4 pt-5 pb-8 lg:px-10">
        {loading ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 20px', textAlign: 'center',
            fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🍽️</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
              {recipes.length === 0 ? 'No recipes yet' : 'No matches'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {recipes.length === 0 ? 'Tap Add recipe to get started' : 'Try a different search'}
            </div>
          </div>
        ) : (
          /* items-stretch: every card in a row stretches to the tallest one */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onSelect(recipe)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
