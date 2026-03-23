import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

/* ─── NAV ──────────────────────────────────────────────────────────────────── */
function Nav({ onAdd, session, onSignOut, username }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div
      style={{ background: '#F9F6F0', position: 'sticky', top: 0, zIndex: 10 }}
      className="
        px-5 py-[14px] flex items-center justify-between
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
      "
    >
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '1.45rem', fontWeight: 800,
        color: '#0C3D4E', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
      }}>MI SAZÓN</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onAdd} style={{
          background: 'transparent', color: '#0C3D4E',
          border: '1.5px solid #0C3D4E', borderRadius: 'var(--r-full)',
          fontFamily: 'var(--font-body)', fontSize: '0.82rem',
          fontWeight: 500, letterSpacing: '0.05em',
          padding: '9px 22px', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center',
        }}>Add recipe</button>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Account menu"
            style={{
              width: 34, height: 34,
              background: 'none', border: 'none',
              color: '#0C3D4E', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              borderRadius: 6, transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><KebabIcon /></button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--white)', border: '1px solid var(--border-soft)',
              borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              minWidth: 160, zIndex: 100, overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', borderBottom: '1px solid var(--border-soft)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
              }}>
                {username ? `@${username}` : session?.user?.email}
              </div>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── FILTER ICON ───────────────────────────────────────────────────────────── */
function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {/* Row 1 — handle at left */}
      <line x1="4" y1="6" x2="6.5" y2="6" />
      <circle cx="9" cy="6" r="2.5" />
      <line x1="11.5" y1="6" x2="20" y2="6" />
      {/* Row 2 — handle at right */}
      <line x1="4" y1="12" x2="12.5" y2="12" />
      <circle cx="15" cy="12" r="2.5" />
      <line x1="17.5" y1="12" x2="20" y2="12" />
      {/* Row 3 — handle at left */}
      <line x1="4" y1="18" x2="6.5" y2="18" />
      <circle cx="9" cy="18" r="2.5" />
      <line x1="11.5" y1="18" x2="20" y2="18" />
    </svg>
  )
}

/* ─── SEARCH BAR ───────────────────────────────────────────────────────────── */
function SearchBar({ search, onSearch, filtersOpen, onToggleFilters, hasActiveFilters }) {
  const filterActive = filtersOpen || hasActiveFilters
  return (
    <div
      style={{ background: '#F9F6F0' }}
      className="
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        px-5 py-3
      "
    >
      <div className="w-full lg:max-w-2xl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text" placeholder="Search recipes…"
          value={search} onChange={e => onSearch(e.target.value)}
          className="search-input"
          style={{
            flex: 1, minWidth: 0,
            background: '#FFFFFF', border: '1.5px solid var(--border-soft)',
            borderRadius: 'var(--r-full)', fontFamily: 'var(--font-body)',
            fontSize: '0.95rem', color: '#6B7280',
            padding: '10px 18px', outline: 'none',
          }}
        />
        <button
          onClick={onToggleFilters}
          aria-label={filtersOpen ? 'Close filters' : 'Open filters'}
          style={{
            flexShrink: 0,
            width: 42, height: 42,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: filterActive ? '#0C3D4E' : '#FFFFFF',
            border: `1.5px solid ${filterActive ? '#0C3D4E' : 'var(--border-soft)'}`,
            borderRadius: 'var(--r-full)',
            color: filterActive ? '#F9F6F0' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background 150ms, border-color 150ms, color 150ms',
          }}
        >
          <FilterIcon />
        </button>
      </div>
    </div>
  )
}

/* ─── FILTER CONSTANTS ──────────────────────────────────────────────────────── */
const DIETARY_FILTERS   = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten free', 'Keto']
const MEAL_TYPE_FILTERS = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side']
const TIME_FILTERS      = [
  { label: 'Under 15 mins', maxMins: 15 },
  { label: 'Under 30 mins', maxMins: 30 },
  { label: 'Under 1 h',     maxMins: 60 },
]

/* ─── FILTER BAR ───────────────────────────────────────────────────────────── */
function PillGroup({ label, options, active, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-body)', marginBottom: 8,
      }}>{label}</div>
      <div className="pill-row -mr-5 lg:mr-0" style={{
        display: 'flex', gap: 8, flexWrap: 'nowrap',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {options.map(opt => {
          const isActive = active.includes(opt)
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                borderRadius: 'var(--r-full)',
                border: isActive ? '1.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
                background: isActive ? '#0C3D4E' : 'var(--white)',
                color: isActive ? '#F9F6F0' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'background 150ms, color 150ms, border-color 150ms',
              }}
            >{opt}</button>
          )
        })}
      </div>
    </div>
  )
}

function FilterBar({ activeDietary, activeMealTypes, activeTime, onToggleDietary, onToggleMealType, onToggleTime }) {
  return (
    <div
      style={{ background: '#F9F6F0' }}
      className="
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        px-5 pt-1 pb-2
      "
    >
      <PillGroup
        label="Dietary"
        options={DIETARY_FILTERS}
        active={activeDietary}
        onToggle={onToggleDietary}
      />
      <PillGroup
        label="Meal type"
        options={MEAL_TYPE_FILTERS}
        active={activeMealTypes}
        onToggle={onToggleMealType}
      />
      <PillGroup
        label="Time"
        options={TIME_FILTERS.map(t => t.label)}
        active={activeTime}
        onToggle={onToggleTime}
      />
    </div>
  )
}

/* ─── TAB BAR ──────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'mine',       label: 'My recipes' },
  { key: 'favourites', label: 'Liked' },
  { key: 'public',     label: 'Explore' },
]

function TabBar({ active, onChange }) {
  return (
    <div
      style={{
        background: '#F9F6F0',
        position: 'sticky',
        top: 62,
        zIndex: 9,
        borderBottom: '5px solid #F9F6F0',
      }}
      className="
        lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
        lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
        lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        px-5
      "
    >
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              fontWeight: active === tab.key ? 600 : 400,
              color: active === tab.key ? 'var(--green-primary)' : 'var(--text-secondary)',
              paddingTop: 12, paddingBottom: 0,
              paddingLeft: i === 0 ? 0 : 16, paddingRight: 16,
              transition: 'color 150ms',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
            onMouseEnter={e => { if (active !== tab.key) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { if (active !== tab.key) e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <span style={{ paddingBottom: 10 }}>{tab.label}</span>
            <span style={{
              display: 'block', width: '100%', height: 3,
              background: active === tab.key ? 'var(--green-primary)' : 'transparent',
              borderRadius: '2px 2px 0 0',
            }} />
          </button>
        ))}
      </div>
    </div>
  )
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

/* ─── CLOCK ICON ────────────────────────────────────────────────────────────── */
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

/* ─── BOOKMARK ICON ────────────────────────────────────────────────────────── */
function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/* ─── KEBAB ICON ────────────────────────────────────────────────────────────── */
function KebabIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5"  r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}

/* ─── SECTION LABEL ────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-body)', marginBottom: 14,
    }}>{children}</div>
  )
}

/* ─── SHARED TIME FORMATTER ────────────────────────────────────────────────── */
function fmtTime(mins) {
  if (!mins) return null
  const h = Math.floor(mins / 60), m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  return h > 0 ? `${h}h` : `${m}m`
}

/* ─── PORTRAIT CARD CONSTANTS ──────────────────────────────────────────────── */
/*
  Image cards:   2:3 aspect ratio, dark overlay, all-white text.
  No-image cards: no aspect ratio (height = content), Ivory bg, Dark Teal text.
*/

/* Overlay for image cards only: bottom-1/3 gradient. */
const OVERLAY_IMAGE = 'linear-gradient(to top, #000000E8 0%, #00000099 50%, #00000000 100%)'

/*
  Prep-time pill — shown on all recipe cards instead of the dietary tag.
  onPhoto=true  → white border + white text (over photo overlay)
  onPhoto=false → Bell Blue border + Bell Blue text (on white card bg)
  Background is always slightly transparent white.
  Returns null when no time data is available.
*/
function PrepTimePill({ mins, onPhoto = false }) {
  if (!mins) return null
  const accent = onPhoto ? '#FFFFFF' : '#3E92BF'
  const bgStyle = onPhoto
    ? { background: 'rgba(0,0,0,0.24)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
    : { background: 'rgba(255,255,255,0.22)' }
  return (
    <span style={{
      ...bgStyle, color: accent,
      border: `1.5px solid ${accent}`,
      borderRadius: 'var(--r-full)', padding: '8px 12px',
      fontSize: '0.72rem', fontWeight: 500,
      fontFamily: 'var(--font-body)', lineHeight: 1,
      whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <ClockIcon />
      {fmtTime(mins)}
    </span>
  )
}

/* Reusable backdrop-blur icon button (heart / actions) */
const blurBtn = {
  background: 'rgba(0,0,0,0.24)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 8,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 150ms, color 150ms',
}

/* ─── MY RECIPE CARD ───────────────────────────────────────────────────────── */
function MyRecipeCard({ recipe, onClick, onToggleFavourite }) {
  const hasPhoto = !!recipe.photo_url
  const mealTypeLabel = recipe.meal_type
    ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).join(' · ')
    : null
  const dietaryLabel = recipe.dietary && recipe.dietary.length > 0
    ? (Array.isArray(recipe.dietary) ? recipe.dietary[0] : recipe.dietary)
    : null

  /* ── IMAGE CARD: 2:3 ratio, absolute layout, white text ── */
  if (hasPhoto) {
    return (
      <div onClick={onClick} style={{
        position: 'relative', aspectRatio: '2/3',
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
      }}>
        <img src={recipe.photo_url} alt={recipe.name} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: OVERLAY_IMAGE }} />

        {/* Top row: pill (left) + heart (right) */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div><PrepTimePill mins={recipe.total_time_min} onPhoto /></div>
          <button
            onClick={onToggleFavourite}
            aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            style={{ ...blurBtn, padding: 10, color: recipe.is_favourite ? '#D7191D' : '#fff', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
          ><HeartIcon filled={recipe.is_favourite} /></button>
        </div>

        {/* Bottom: eyebrow → title → dietary */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 16px', zIndex: 2 }}>
          {mealTypeLabel && (
            <div style={{
              fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-body)', marginBottom: 5,
            }}>{mealTypeLabel}</div>
          )}
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
            color: '#fff', lineHeight: 1.25, marginBottom: dietaryLabel ? 5 : 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{recipe.name}</div>
          {dietaryLabel && (
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-body)' }}>
              {dietaryLabel}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── NO-IMAGE CARD: content-height, white bg, Dark Teal text ── */
  return (
    <div onClick={onClick} style={{
      position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
      background: '#FFFFFF', border: '1px solid #D1D5DB',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top row: pill + heart */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '12px 12px 0',
      }}>
        <div><PrepTimePill mins={recipe.total_time_min} /></div>
        <button
          onClick={onToggleFavourite}
          aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: recipe.is_favourite ? '#D7191D' : '#0C3D4E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, borderRadius: 6, transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        ><HeartIcon filled={recipe.is_favourite} /></button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: 28 }} />

      {/* Bottom: eyebrow → title → dietary */}
      <div style={{ padding: '0 14px 16px' }}>
        {mealTypeLabel && (
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(12,61,78,0.5)',
            fontFamily: 'var(--font-body)', marginBottom: 5,
          }}>{mealTypeLabel}</div>
        )}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
          color: '#0C3D4E', lineHeight: 1.25, marginBottom: dietaryLabel ? 5 : 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{recipe.name}</div>
        {dietaryLabel && (
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(12,61,78,0.55)', fontFamily: 'var(--font-body)' }}>
            {dietaryLabel}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PUBLIC RECIPE CARD ───────────────────────────────────────────────────── */
/*
  Mirrors MyRecipeCard. Top-right shows a like heart (same pattern as My recipes).
  Liking adds the recipe to the user's Liked tab without copying it to My recipes.
*/
function PublicRecipeCard({ recipe, onClick, onToggleLike }) {
  const hasPhoto = !!recipe.photo_url
  const mealTypeLabel = recipe.meal_type
    ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).join(' · ')
    : null
  const dietaryLabel = recipe.dietary && recipe.dietary.length > 0
    ? (Array.isArray(recipe.dietary) ? recipe.dietary[0] : recipe.dietary)
    : null

  /* ── IMAGE CARD ── */
  if (hasPhoto) {
    return (
      <div onClick={onClick} style={{
        position: 'relative', aspectRatio: '2/3',
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
      }}>
        <img src={recipe.photo_url} alt={recipe.name} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: OVERLAY_IMAGE }} />

        {/* Top row: pill (left) + heart (right) */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div><PrepTimePill mins={recipe.total_time_min} onPhoto /></div>
          <button
            onClick={onToggleLike}
            aria-label={recipe.is_liked ? 'Unlike recipe' : 'Like recipe'}
            style={{ ...blurBtn, padding: 10, color: recipe.is_liked ? '#D7191D' : '#fff', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
          ><HeartIcon filled={recipe.is_liked} /></button>
        </div>

        {/* Bottom: eyebrow → title → dietary → attribution */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 16px', zIndex: 2 }}>
          {mealTypeLabel && (
            <div style={{
              fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-body)', marginBottom: 5,
            }}>{mealTypeLabel}</div>
          )}
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
            color: '#fff', lineHeight: 1.25, marginBottom: dietaryLabel ? 5 : 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{recipe.name}</div>
          {dietaryLabel && (
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-body)' }}>
              {dietaryLabel}
            </div>
          )}
          {recipe.author_username && (
            <div style={{
              fontSize: '0.68rem', fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.55)',
              marginTop: 6, letterSpacing: '0.01em',
            }}>
              by @{recipe.author_username}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── NO-IMAGE CARD ── */
  return (
    <div onClick={onClick} style={{
      position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
      background: '#FFFFFF', border: '1px solid #D1D5DB',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top row: pill + heart */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '12px 12px 0',
      }}>
        <div><PrepTimePill mins={recipe.total_time_min} /></div>
        <button
          onClick={onToggleLike}
          aria-label={recipe.is_liked ? 'Unlike recipe' : 'Like recipe'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: recipe.is_liked ? '#D7191D' : '#0C3D4E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, borderRadius: 6, transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        ><HeartIcon filled={recipe.is_liked} /></button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: 28 }} />

      {/* Bottom: eyebrow → title → dietary → attribution */}
      <div style={{ padding: '0 14px 16px' }}>
        {mealTypeLabel && (
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(12,61,78,0.5)',
            fontFamily: 'var(--font-body)', marginBottom: 5,
          }}>{mealTypeLabel}</div>
        )}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
          color: '#0C3D4E', lineHeight: 1.25, marginBottom: dietaryLabel ? 5 : 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{recipe.name}</div>
        {dietaryLabel && (
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(12,61,78,0.55)', fontFamily: 'var(--font-body)' }}>
            {dietaryLabel}
          </div>
        )}
        {recipe.author_username && (
          <div style={{
            fontSize: '0.68rem', fontFamily: 'var(--font-body)',
            color: 'var(--text-tertiary)',
            marginTop: 6, letterSpacing: '0.01em',
          }}>
            by @{recipe.author_username}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── EMPTY STATES ──────────────────────────────────────────────────────────── */

/* Generic — search returns no matches */
function EmptyState({ title, sub }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 14,
      border: '1px solid var(--border-soft)',
      padding: '36px 20px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{sub}</div>
    </div>
  )
}

/* My Recipes — first-time user, clickable */
function EmptyMyRecipes({ onAdd }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      style={{
        width: '100%', background: 'var(--white)', borderRadius: 14,
        border: '1.5px dashed var(--border)',
        padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        transition: 'border-color 150ms, background 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-primary)'; e.currentTarget.style.background = 'var(--cream)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--white)' }}
    >
      <div style={{ color: 'var(--green-primary)', marginBottom: 16 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 8,
      }}>Your recipes live here</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5,
      }}>Add your first one and start building your collection.</div>
    </button>
  )
}

/* Liked — no liked recipes yet */
function EmptyLiked() {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 14,
      border: '1px solid var(--border-soft)',
      padding: '48px 24px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ color: '#D7191D', marginBottom: 16, opacity: 0.8 }}>
        <svg width="30" height="30" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 8,
      }}>Nothing liked yet</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5, maxWidth: 260,
      }}>Tap the heart on any recipe to like it. Your liked recipes will show up right here.</div>
    </div>
  )
}

/* Explore — no public recipes yet */
function EmptyExplore() {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 14,
      border: '1px solid var(--border-soft)',
      padding: '48px 24px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ color: 'var(--green-primary)', marginBottom: 16 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 8,
      }}>Nothing to explore yet</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5, maxWidth: 280,
      }}>When other cooks share recipes publicly, you'll find them here. Like what you discover and it saves to your Liked page.</div>
    </div>
  )
}

/* ─── BROWSE ───────────────────────────────────────────────────────────────── */
export default function Browse({ onSelect, onAdd, session, onSignOut, activeTab, onTabChange, username }) {
  const [myRecipes, setMyRecipes]         = useState([])
  const [publicRecipes, setPublicRecipes] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [activeDietary,   setActiveDietary]   = useState([])
  const [activeMealTypes, setActiveMealTypes] = useState([])
  const [activeTime,      setActiveTime]      = useState([])
  const [filtersOpen, setFiltersOpen]         = useState(false)

  // Generic pill toggle — adds the tag if absent, removes it if present
  function makeToggle(setter) {
    return tag => setter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function matchesFilters(recipe) {
    // Dietary — AND: recipe must carry every selected dietary tag
    if (activeDietary.length > 0) {
      const tags = Array.isArray(recipe.dietary) ? recipe.dietary : []
      if (!activeDietary.every(f => tags.includes(f))) return false
    }
    // Meal type — OR: recipe must match at least one selected type
    if (activeMealTypes.length > 0) {
      const types = Array.isArray(recipe.meal_type)
        ? recipe.meal_type
        : recipe.meal_type ? [recipe.meal_type] : []
      if (!activeMealTypes.some(t => types.includes(t))) return false
    }
    // Time — OR: recipe's total time must be within the broadest selected range
    if (activeTime.length > 0) {
      const maxMins = Math.max(
        ...activeTime.map(lbl => TIME_FILTERS.find(t => t.label === lbl)?.maxMins ?? 0)
      )
      const recipeTime = recipe.total_time_min ?? recipe.total_time_max
      if (!recipeTime || recipeTime > maxMins) return false
    }
    return true
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [myRes, pubRes, likesRes] = await Promise.all([
      supabase.from('recipes').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('recipes').select('*')
        .eq('is_public', true)
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('likes').select('recipe_id')
        .eq('user_id', session.user.id),
    ])
    if (!myRes.error) setMyRecipes(myRes.data || [])

    if (!pubRes.error) {
      const pubData  = pubRes.data || []
      const likedIds = new Set((likesRes.data || []).map(l => l.recipe_id))
      // Fetch author usernames for all public recipe creators in one query
      const authorIds = [...new Set(pubData.map(r => r.user_id).filter(Boolean))]
      let profileMap = {}
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds)
        if (profilesData) {
          profileMap = Object.fromEntries(profilesData.map(p => [p.id, p.username]))
        }
      }
      // Attach author_username + is_liked to each public recipe
      setPublicRecipes(pubData.map(r => ({
        ...r,
        author_username: profileMap[r.user_id] || null,
        is_liked: likedIds.has(r.id),
      })))
    }

    setLoading(false)
  }

  async function toggleFavourite(recipe, e) {
    e.stopPropagation()
    const newVal = !recipe.is_favourite
    await supabase.from('recipes').update({ is_favourite: newVal }).eq('id', recipe.id)
    setMyRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favourite: newVal } : r))
  }

  async function toggleLike(recipe, e) {
    e.stopPropagation()
    const newIsLiked = !recipe.is_liked
    // Optimistic update
    setPublicRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_liked: newIsLiked } : r))
    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: session.user.id, recipe_id: recipe.id })
    } else {
      await supabase.from('likes').delete()
        .eq('user_id', session.user.id).eq('recipe_id', recipe.id)
    }
  }

  // Derived state
  const q = search.toLowerCase()
  const myFiltered          = myRecipes.filter(r => r.name.toLowerCase().includes(q) && matchesFilters(r))
  const myFavs              = myFiltered.filter(r => r.is_favourite)
  const pubFiltered         = publicRecipes.filter(r => r.name.toLowerCase().includes(q) && matchesFilters(r))
  const likedPublicFiltered = publicRecipes.filter(r => r.is_liked && r.name.toLowerCase().includes(q) && matchesFilters(r))
  const allLiked            = [...myFavs, ...likedPublicFiltered]

  /* Masonry grid — columns defined in index.css .masonry-grid */

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>
      <Nav onAdd={onAdd} session={session} onSignOut={onSignOut} username={username} />
      <SearchBar
        search={search} onSearch={setSearch}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen(o => !o)}
        hasActiveFilters={activeDietary.length > 0 || activeMealTypes.length > 0 || activeTime.length > 0}
      />
      {filtersOpen && (
        <FilterBar
          activeDietary={activeDietary}   onToggleDietary={makeToggle(setActiveDietary)}
          activeMealTypes={activeMealTypes} onToggleMealType={makeToggle(setActiveMealTypes)}
          activeTime={activeTime}           onToggleTime={makeToggle(setActiveTime)}
        />
      )}
      <TabBar active={activeTab} onChange={onTabChange} />

      <div className="px-4 pt-6 pb-10 lg:px-10">
        {loading ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 20px', textAlign: 'center',
            fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>Loading…</div>
        ) : (
          <>
            {/* ── MY RECIPES TAB ── */}
            {activeTab === 'mine' && (
              myFiltered.length === 0 ? (
                myRecipes.length === 0
                  ? <EmptyMyRecipes onAdd={onAdd} />
                  : <EmptyState title="No matches" sub="Try a different search" />
              ) : (
                <div className="masonry-grid">
                  {myFiltered.map((recipe, idx) => (
                    <div key={recipe.id} className="masonry-item">
                      <MyRecipeCard
                        recipe={recipe}
                        onClick={() => onSelect(recipe)}
                        onToggleFavourite={e => toggleFavourite(recipe, e)}
                      />
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── FAVOURITES TAB ── */}
            {/* Shows own favourited recipes + public recipes the user has liked */}
            {activeTab === 'favourites' && (
              allLiked.length === 0 ? (
                <EmptyLiked />
              ) : (
                <div className="masonry-grid">
                  {allLiked.map(recipe => (
                    <div key={recipe.id} className="masonry-item">
                      {recipe.user_id === session.user.id ? (
                        <MyRecipeCard
                          recipe={recipe}
                          onClick={() => onSelect(recipe)}
                          onToggleFavourite={e => toggleFavourite(recipe, e)}
                        />
                      ) : (
                        <PublicRecipeCard
                          recipe={recipe}
                          onClick={() => onSelect(recipe)}
                          onToggleLike={e => toggleLike(recipe, e)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── PUBLIC RECIPES TAB ── */}
            {activeTab === 'public' && (
              pubFiltered.length === 0 ? (
                publicRecipes.length === 0
                  ? <EmptyExplore />
                  : <EmptyState title="No matches" sub="Try a different search" />
              ) : (
                <div className="masonry-grid">
                  {pubFiltered.map(recipe => (
                    <div key={recipe.id} className="masonry-item">
                      <PublicRecipeCard
                        recipe={recipe}
                        onClick={() => onSelect(recipe)}
                        onToggleLike={e => toggleLike(recipe, e)}
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
