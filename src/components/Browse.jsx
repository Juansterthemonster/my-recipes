import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const EMOJIS = ['🍝','🥘','🥗','🍳','🫕','🌮','🍜','🥩','🍲','🫔','🥪','🍱']
function getEmoji(name) { return EMOJIS[name ? name.charCodeAt(0) % EMOJIS.length : 0] }

/* ─── NAV ─────────────────────────────────────────────────────────────────────
   Background: forest green (--green-primary)
   App name:   white
   CTA button: white text, white 1.5px border, transparent fill
   Full-width breakout on desktop via the same negative-margin pattern as before.
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
      {/* Wordmark — white on green */}
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '1.25rem', fontWeight: 800,
        color: '#FFFFFF', letterSpacing: '0.06em',
        textTransform: 'uppercase', lineHeight: 1,
      }}>MI SAZÓN</span>

      {/* CTA — white outline, white text, no fill */}
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

/* ─── FILTER BAR ──────────────────────────────────────────────────────────────
   The outer container is full-width (same edge-to-edge breakout as the Nav on
   desktop) so the cream background visually connects to the header band.
   The inner content (search input + pills) is constrained to max-w-2xl so the
   actual controls stay compact and readable — they don't stretch to 1400px.
*/
function FilterBar({ search, onSearch, filter, onFilter, filters }) {
  return (
    /* Outer shell — full-width breakout on desktop, same as Nav */
    <div
      style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-soft)' }}
      className="
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        px-5 pt-3 pb-4
      "
    >
      {/* Inner content — constrained width so controls stay compact */}
      <div className="w-full lg:max-w-2xl">
        <div className="mb-3">
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
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '0.75rem', fontFamily: 'var(--font-body)',
                fontWeight: filter === f.key ? 600 : 400,
                padding: '7px 16px', borderRadius: 'var(--r-full)', cursor: 'pointer',
                border: '1.5px solid var(--violet-accent)',
                background: filter === f.key ? 'var(--violet-accent)' : 'var(--violet-light)',
                color: filter === f.key ? '#FFFFFF' : '#3D2B6B',
                transition: 'all 180ms', whiteSpace: 'nowrap',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── RECIPE CARD ─────────────────────────────────────────────────────────────
   Layout: text content LEFT, emoji tile RIGHT (reversed from before).
   Height consistency:
     • height:'100%' fills the grid cell — all cards in a row stretch to the
       tallest one automatically via CSS grid row alignment.
     • Recipe name is clamped to 2 lines (WebkitLineClamp) so the name's height
       contribution is always ≤ 2 × lineHeight, bounding worst-case card height.
     • The emoji tile is a fixed 44×44 square — it never changes size.
   No chevron, no hover effects, no transitions — flat and static.
*/
function RecipeCard({ recipe, onClick }) {
  const fmtTime = (mins) => {
    if (!mins) return null
    const h = Math.floor(mins / 60), m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    return h > 0 ? `${h}h` : `${m}m`
  }

  // Total time shown on card; prep time shown separately below
  const totalTimeLabel = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `${fmtTime(recipe.total_time_min)}–${fmtTime(recipe.total_time_max)}`
      : fmtTime(recipe.total_time_min)
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)',
        borderRadius: 8,                /* reduced from 14 → 8px */
        border: '1px solid var(--border-soft)',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
      }}
    >
      {/* LEFT — text content */}
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Name — mobile: 1.0625rem (17px), desktop: 1rem (16px); clamped to 2 lines */}
        <div
          className="text-[1.0625rem] md:text-[1rem]"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400, color: 'var(--text-primary)',
            lineHeight: 1.25, marginBottom: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{recipe.name}</div>

        {/* Time labels — plain text, no icons */}
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

        {/* Dietary tags — same pill style as recipe details page */}
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
                  /* Exact pill style from Detail.jsx */
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

      {/* RIGHT — emoji tile, fixed size, top-aligned, no chevron */}
      <div style={{
        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
        background: 'var(--cream)', border: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.35rem',
        marginTop: 1,   /* optical alignment with first text line */
      }}>{getEmoji(recipe.name)}</div>
    </div>
  )
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: '15',  label: '~15 min' },
  { key: '30',  label: '~30 min' },
  { key: '45',  label: '~45 min' },
]

export default function Browse({ onSelect, onAdd }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchRecipes() }, [])

  async function fetchRecipes() {
    setLoading(true)
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
    if (!error) setRecipes(data || [])
    setLoading(false)
  }

  const filtered = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    const t = r.active_time_mins || r.total_time_min
    if (filter === '15') return t && t <= 15
    if (filter === '30') return t && t <= 30
    if (filter === '45') return t && t <= 45
    return true
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Nav onAdd={onAdd} />
      <FilterBar
        search={search} onSearch={setSearch}
        filter={filter} onFilter={setFilter}
        filters={FILTERS}
      />

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
              {recipes.length === 0 ? 'Tap Add recipe to get started' : 'Try a different filter'}
            </div>
          </div>
        ) : (
          /* items-stretch ensures every grid cell is the same height as the tallest
             in its row — combined with height:'100%' on each card, all cards match */
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
