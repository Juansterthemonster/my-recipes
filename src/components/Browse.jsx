import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import MasonryGrid from './MasonryGrid'
import { useI18n, tagLabel, translate } from '../i18n'

/* ─── NAV ──────────────────────────────────────────────────────────────────── */
function Nav({ onAdd, onAddCollection, session, onSignOut, username, onProfile }) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen,  setAddOpen]  = useState(false)
  const menuRef = useRef(null)
  const addRef  = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (addRef.current  && !addRef.current.contains(e.target))  setAddOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addItemStyle = {
    display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
    fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'background 150ms', whiteSpace: 'nowrap',
  }

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
        <div ref={addRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAddOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={addOpen}
            style={{
              background: 'transparent', color: '#0C3D4E',
              border: '1.5px solid #0C3D4E', borderRadius: 'var(--r-full)',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem',
              fontWeight: 500, letterSpacing: '0.05em',
              padding: '9px 22px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center',
            }}
          >{t('nav.add')}</button>

          {addOpen && (
            <div role="menu" style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--white)', border: '1px solid var(--border-soft)',
              borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              minWidth: 170, zIndex: 100, overflow: 'hidden',
            }}>
              <button
                role="menuitem"
                onClick={() => { setAddOpen(false); onAdd() }}
                style={{ ...addItemStyle, borderBottom: '1px solid var(--border-soft)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >{t('nav.addRecipe')}</button>
              <button
                role="menuitem"
                onClick={() => { setAddOpen(false); onAddCollection() }}
                style={addItemStyle}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >{t('nav.addCollection')}</button>
            </div>
          )}
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={t('nav.accountMenu')}
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
                onClick={() => { setMenuOpen(false); onProfile() }}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                  border: 'none', borderBottom: '1px solid var(--border-soft)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >{t('nav.profile')}</button>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  fontSize: '0.9rem', color: 'var(--text-primary)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >{t('nav.signOut')}</button>
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
  const { t } = useI18n()
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
          type="text" placeholder={t('browse.searchPlaceholder')}
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
          aria-label={filtersOpen ? t('browse.closeFilters') : t('browse.openFilters')}
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
  { label: 'Under 15 mins', tkey: 'filter.time.15', maxMins: 15 },
  { label: 'Under 30 mins', tkey: 'filter.time.30', maxMins: 30 },
  { label: 'Under 1 h',     tkey: 'filter.time.60', maxMins: 60 },
]

/* ─── FILTER BAR ───────────────────────────────────────────────────────────── */
function PillGroup({ label, options, active, onToggle, renderLabel = o => o }) {
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
            >{renderLabel(opt)}</button>
          )
        })}
      </div>
    </div>
  )
}

function FilterBar({ activeDietary, activeMealTypes, activeTime, onToggleDietary, onToggleMealType, onToggleTime }) {
  const { t } = useI18n()
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
        label={t('filter.dietary')}
        options={DIETARY_FILTERS}
        renderLabel={o => tagLabel(t, 'dietary', o)}
        active={activeDietary}
        onToggle={onToggleDietary}
      />
      <PillGroup
        label={t('filter.mealType')}
        options={MEAL_TYPE_FILTERS}
        renderLabel={o => tagLabel(t, 'meal', o)}
        active={activeMealTypes}
        onToggle={onToggleMealType}
      />
      <PillGroup
        label={t('filter.time')}
        options={TIME_FILTERS.map(f => f.label)}
        renderLabel={o => t(TIME_FILTERS.find(f => f.label === o)?.tkey || '')}
        active={activeTime}
        onToggle={onToggleTime}
      />
    </div>
  )
}

/* ─── TAB BAR ──────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'mine',        tkey: 'tab.mine' },
  { key: 'favourites',  tkey: 'tab.favourites' },
  { key: 'collections', tkey: 'tab.collections' },
  { key: 'public',      tkey: 'tab.public' },
]

function TabBar({ active, onChange, dots = {} }) {
  const { t } = useI18n()
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
            <span style={{ paddingBottom: 10, position: 'relative' }}>
              {t(tab.tkey)}
              {dots[tab.key] && (
                <span
                  role="img" aria-label={t('explore.newDot')}
                  style={{
                    position: 'absolute', top: -3, right: -10,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#0C3D4E',
                  }}
                />
              )}
            </span>
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
  if (h > 0 && m > 0) return `${h}h ${m}${translate('time.min')}`
  return h > 0 ? `${h}h` : `${m}${translate('time.min')}`
}

/* ─── PORTRAIT CARD CONSTANTS ──────────────────────────────────────────────── */
/*
  Image cards:   2:3 aspect ratio, dark overlay, all-white text.
  No-image cards: no aspect ratio (height = content), Ivory bg, Dark Teal text.
*/

/* Overlay for image cards only: concentrated in the bottom quarter.
   The top ~55 % of the photo is completely clear; the scrim fades in
   steeply over the lower ~40 % so text at the bottom stays readable. */
const OVERLAY_IMAGE =
  'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.80) 12%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0) 44%)'

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
  const { t } = useI18n()
  const hasPhoto = !!recipe.photo_url
  const mealTypeLabel = recipe.meal_type
    ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).map(v => tagLabel(t, 'meal', v)).join(' · ')
    : null
  const dietaryLabel = recipe.dietary && recipe.dietary.length > 0
    ? tagLabel(t, 'dietary', Array.isArray(recipe.dietary) ? recipe.dietary[0] : recipe.dietary)
    : null

  /* ── IMAGE CARD: 2:3 ratio, absolute layout, white text ── */
  if (hasPhoto) {
    return (
      <div onClick={onClick} style={{
        position: 'relative', aspectRatio: '2/3',
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
      }}>
        <img src={recipe.photo_url} alt={recipe.name} loading="lazy" decoding="async" style={{
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
            aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
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
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-body)', marginBottom: 5,
            }}>{mealTypeLabel}</div>
          )}
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
            color: '#fff', lineHeight: 1.25, marginBottom: (dietaryLabel || recipe.is_public) ? 5 : 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{recipe.name}</div>
          {(dietaryLabel || recipe.is_public) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {recipe.is_public && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                  background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)',
                  borderRadius: 999, padding: '2px 8px',
                  backdropFilter: 'blur(4px)',
                }}>{t('card.public')}</span>
              )}
              {dietaryLabel && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}>
                  {dietaryLabel}
                </span>
              )}
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
          aria-label={recipe.is_favourite ? t('card.removeFav') : t('card.addFav')}
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
          color: '#0C3D4E', lineHeight: 1.25, marginBottom: (dietaryLabel || recipe.is_public) ? 5 : 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{recipe.name}</div>
        {(dietaryLabel || recipe.is_public) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {recipe.is_public && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                background: 'var(--green-light)', color: 'var(--green-primary)',
                borderRadius: 999, padding: '2px 8px',
              }}>{t('card.public')}</span>
            )}
            {dietaryLabel && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(12,61,78,0.55)', fontFamily: 'var(--font-body)' }}>
                {dietaryLabel}
              </span>
            )}
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
function NewBadge({ onPhoto = false }) {
  const { t } = useI18n()
  return (
    <span style={{
      display: 'inline-block', marginBottom: 8,
      background: onPhoto ? '#FFFFFF' : '#0C3D4E', color: onPhoto ? '#0C3D4E' : '#F9F6F0',
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 999, fontFamily: 'var(--font-body)',
    }}>{t('explore.new')}</span>
  )
}

function PublicRecipeCard({ recipe, onClick, onToggleLike, isNew = false }) {
  const { t } = useI18n()
  const hasPhoto = !!recipe.photo_url
  const mealTypeLabel = recipe.meal_type
    ? (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).map(v => tagLabel(t, 'meal', v)).join(' · ')
    : null
  const dietaryLabel = recipe.dietary && recipe.dietary.length > 0
    ? tagLabel(t, 'dietary', Array.isArray(recipe.dietary) ? recipe.dietary[0] : recipe.dietary)
    : null

  /* ── IMAGE CARD ── */
  if (hasPhoto) {
    return (
      <div onClick={onClick} style={{
        position: 'relative', aspectRatio: '2/3',
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
      }}>
        <img src={recipe.photo_url} alt={recipe.name} loading="lazy" decoding="async" style={{
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
            aria-label={recipe.is_liked ? t('card.unlike') : t('card.like')}
            style={{ ...blurBtn, padding: 10, color: recipe.is_liked ? '#D7191D' : '#fff', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
          ><HeartIcon filled={recipe.is_liked} /></button>
        </div>

        {/* Bottom: eyebrow → title → dietary → attribution */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 16px', zIndex: 2 }}>
          {isNew && <NewBadge onPhoto />}
          {mealTypeLabel && (
            <div style={{
              fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)',
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
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}>
              {dietaryLabel}
            </div>
          )}
          {recipe.author_username && (
            <div style={{
              fontSize: '0.68rem', fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.55)',
              marginTop: 6, letterSpacing: '0.01em',
            }}>
              {t('card.by', { author: recipe.author_username })}
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
          aria-label={recipe.is_liked ? t('card.unlike') : t('card.like')}
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
        {isNew && <NewBadge />}
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
            {t('card.by', { author: recipe.author_username })}
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
  const { t } = useI18n()
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
      }}>{t('empty.mine.title')}</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5,
      }}>{t('empty.mine.body')}</div>
    </button>
  )
}

/* Liked — no liked recipes yet */
function EmptyLiked() {
  const { t } = useI18n()
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
      }}>{t('empty.liked.title')}</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5, maxWidth: 260,
      }}>{t('empty.liked.body')}</div>
    </div>
  )
}

/* Explore — no public recipes yet */
function EmptyExplore() {
  const { t } = useI18n()
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
      }}>{t('empty.explore.title')}</div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', lineHeight: 1.5, maxWidth: 280,
      }}>{t('empty.explore.body')}</div>
    </div>
  )
}

/* ─── COLLECTION PHOTO GRID ─────────────────────────────────────────────────
   Renders up to 4 recipe photos in a 2×2 grid. Empty cells fall back to the
   app's teal primary colour so the card always has a consistent visual weight.  */
function CollectionPhotoGrid({ photos = [], cover = null }) {
  // A user-chosen cover replaces the collage with one full image
  if (cover) {
    return (
      <div style={{ height: '100%', background: 'var(--green-primary)',  overflow: 'hidden' }}>
        <img src={cover} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }
  const slots = [photos[0] || null, photos[1] || null, photos[2] || null, photos[3] || null]
  const hasAnyPhoto = photos.length > 0

  if (!hasAnyPhoto) {
    return (
      <div style={{
        height: '100%',
        background: 'var(--green-primary)',
        
      }} />
    )
  }

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: 2,
      background: 'var(--green-primary)', // shows through gaps + fills empty cells
      
      overflow: 'hidden',
    }}>
      {slots.map((url, i) => (
        url
          ? <img key={i} src={url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div key={i} style={{ background: 'var(--green-primary)' }} />
      ))}
    </div>
  )
}

/* ─── COLLECTION EDIT MODAL ─────────────────────────────────────────────────
   Centred overlay used for both "New collection" and "Edit collection".
   Fields: name (required), description (optional) and — when editing — a cover
   photo picked from the recipes already in the collection.
   Accepts an async onSave({ name, description, cover }) callback — caller is
   responsible for the DB write and for closing the modal.                    */
function CollectionEditModal({ title, collectionId = null, initial = {}, onSave, onClose }) {
  const { t } = useI18n()
  const [name,        setName]        = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')
  const [cover,       setCover]       = useState(initial.cover_photo_url || null)
  const [coverOptions, setCoverOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [])

  // Load every photo from the recipes in this collection (edit mode only)
  useEffect(() => {
    if (!collectionId) return
    let cancelled = false
    async function loadPhotos() {
      const { data } = await supabase
        .from('collection_recipes')
        .select('recipes(photo_url, photos)')
        .eq('collection_id', collectionId)
      if (cancelled) return
      const urls = []
      for (const row of data || []) {
        const r = row.recipes
        if (!r) continue
        const list = r.photos?.length ? r.photos : (r.photo_url ? [r.photo_url] : [])
        for (const u of list) if (u && !urls.includes(u)) urls.push(u)
      }
      setCoverOptions(urls)
    }
    loadPhotos()
    return () => { cancelled = true }
  }, [collectionId])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError(t('col.nameRequired')); return }
    setError(null)
    setSaving(true)
    await onSave({ name: trimmed, description: description.trim(), cover })
    // onSave closes the modal; setSaving left true to prevent double-clicks
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--white)',
    border: '1.5px solid var(--border-soft)',
    borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-body)',
    fontSize: '0.95rem', color: 'var(--text-primary)',
    padding: '11px 14px', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
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
        width: 'min(380px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 18,
        }}>{title}</div>

        <label style={labelStyle}>{t('col.name')}</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => { setName(e.target.value); if (error) setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder={t('col.namePlaceholder')}
          maxLength={60}
          style={{ ...fieldStyle, borderColor: error ? '#f5baba' : 'var(--border-soft)', marginBottom: error ? 8 : 16 }}
          onFocus={e => e.target.style.borderColor = error ? '#f5baba' : 'var(--green-primary)'}
          onBlur={e => e.target.style.borderColor = error ? '#f5baba' : 'var(--border-soft)'}
        />

        {error && (
          <div style={{
            fontSize: '0.8rem', color: '#a31621', fontFamily: 'var(--font-body)',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <label style={labelStyle}>{t('col.description')} <span style={{ fontWeight: 400 }}>{t('col.optional')}</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('col.descPlaceholder')}
          maxLength={300}
          rows={3}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.45, marginBottom: 16 }}
          onFocus={e => e.target.style.borderColor = 'var(--green-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
        />

        {/* Cover picker — only when editing a collection that has recipe photos */}
        {collectionId && coverOptions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t('col.cover')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {/* Default collage */}
              <button
                type="button"
                onClick={() => setCover(null)}
                aria-label={t('col.useDefault')}
                aria-pressed={cover === null}
                style={{
                  aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer',
                  border: cover === null ? '2.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
                  background: 'var(--white)', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600,
                  lineHeight: 1.15, padding: 4,
                }}
              >{t('col.default')}</button>
              {coverOptions.map(url => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setCover(url)}
                  aria-label={t('col.useThisPhoto')}
                  aria-pressed={cover === url}
                  style={{
                    aspectRatio: '1/1', borderRadius: 8, cursor: 'pointer', padding: 0, overflow: 'hidden',
                    border: cover === url ? '2.5px solid #0C3D4E' : '1.5px solid var(--border-soft)',
                    background: 'var(--green-primary)',
                  }}
                >
                  <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: 'transparent', border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 500,
            }}
          >{t('col.cancel')}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-full)',
              background: '#0C3D4E',
              border: 'none',
              color: '#fff',
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? t('col.saving') : t('col.save')}</button>
        </div>
      </div>
    </>
  )
}

/* ─── COLLECTION CARD ─────────────────────────────────────────────────────────
   Mirrors the recipe photo card: 2:3, photo/collage behind a dark gradient,
   white text on the image. Count pill top-left, kebab top-right, then
   title + description at the bottom.                                          */
function CollectionCard({ collection, onClick, onRename, onDelete }) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const count = collection.recipe_count || 0
  const hasDescription = !!collection.description

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Only a user-chosen cover gives the photo card; "Default" is the plain teal card
  const hasImage = !!collection.cover_photo_url

  const kebab = (
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0, pointerEvents: 'auto' }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
            aria-label={t('col.options')}
            style={{ ...blurBtn, padding: 8, color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
          >
            <KebabIcon />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--white)', border: '1px solid var(--border-soft)',
              borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              minWidth: 140, zIndex: 200, overflow: 'hidden',
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onRename() }}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  fontSize: '0.88rem', color: 'var(--text-primary)', background: 'none',
                  border: 'none', borderBottom: '1px solid var(--border-soft)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0C3D4E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-primary)' }}
              >{t('col.edit')}</button>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  fontSize: '0.88rem', color: '#C0392B', background: 'none',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F43F5E'; e.currentTarget.style.color = '#F9F6F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#C0392B' }}
              >{t('col.delete')}</button>
            </div>
          )}
        </div>
  )

  const textBlock = (
    <>
        <div style={{
          fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)',
          fontFamily: 'var(--font-body)', marginBottom: 5,
        }}>{t('col.eyebrow')}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400,
          color: '#fff', lineHeight: 1.25, marginBottom: hasDescription ? 6 : 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{collection.name}</div>
        {hasDescription && (
          <div style={{
            fontSize: '0.78rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.92)',
            fontFamily: 'var(--font-body)',
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{collection.description}</div>
        )}
        {/* Recipe count — same treatment as the dietary label on recipe cards */}
        <div style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)',
          fontFamily: 'var(--font-body)', marginTop: hasDescription ? 8 : 5,
        }}>{t('col.recipeCount', { count })}</div>
    </>
  )

  /* ── NO-IMAGE CARD: content-height like the no-photo recipe card, on Dark Teal ── */
  if (!hasImage) {
    return (
      <div onClick={onClick} style={{
        position: 'relative', borderRadius: 8, cursor: 'pointer',
        background: '#0C3D4E', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          gap: 8, padding: '12px 12px 0',
        }}>
          {kebab}
        </div>
        <div style={{ flex: 1, minHeight: 28 }} />
        <div style={{ padding: '0 14px 16px' }}>
          {textBlock}
        </div>
      </div>
    )
  }

  // Taller, darker gradient when a description needs to stay readable
  const overlay = hasDescription
    ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.86) 22%, rgba(0,0,0,0.5) 46%, rgba(0,0,0,0) 66%)'
    : OVERLAY_IMAGE

  return (
    // Outer wrapper is overflow:visible so the kebab dropdown isn't clipped;
    // the inner layer clips the image to the rounded card shape.
    <div
      onClick={onClick}
      style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 8, cursor: 'pointer' }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', background: 'var(--green-primary)' }}>
        <CollectionPhotoGrid cover={collection.cover_photo_url} />
        <div style={{ position: 'absolute', inset: 0, background: overlay }} />
      </div>

      {/* Top row: count pill (left) + kebab (right) */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8,
        pointerEvents: 'none',
      }}>

        {kebab}
      </div>

      {/* Bottom: eyebrow → title → description */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 16px', zIndex: 2,
        pointerEvents: 'none',
      }}>
        {textBlock}
      </div>
    </div>
  )
}

/* ─── EMPTY COLLECTION CARD ─────────────────────────────────────────────────
   Card-shaped empty state — sits as the first item in the collections grid.
   Matches CollectionCard dimensions (2/3 photo area + bottom info section).  */
function EmptyCollectionCard({ onCreate }) {
  const { t } = useI18n()
  return (
    <div
      onClick={onCreate}
      style={{
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        background: 'var(--white)', border: '1.5px dashed var(--border)',
      }}
    >
      {/* 1/3 the height of a real card (2/3 ratio ÷ 3 = 2/9) */}
      <div style={{
        aspectRatio: '2/1',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '14px 16px',
        background: 'var(--green-tint)',
      }}>
        <div style={{ color: 'var(--green-primary)', opacity: 0.7 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <line x1="12" y1="10" x2="12" y2="16" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3,
          }}>{t('col.newTitle')}</div>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', lineHeight: 1.4,
          }}>{t('col.tapToCreate')}</div>
        </div>
      </div>
    </div>
  )
}

/* ─── BROWSE ───────────────────────────────────────────────────────────────── */
export default function Browse({ onSelect, onAdd, session, onSignOut, activeTab, onTabChange, username, onProfile, onSelectCollection }) {
  const { t } = useI18n()
  const [myRecipes, setMyRecipes]         = useState([])
  const [publicRecipes, setPublicRecipes] = useState([])
  const [collections, setCollections]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [activeDietary,   setActiveDietary]   = useState([])
  const [activeMealTypes, setActiveMealTypes] = useState([])
  const [activeTime,      setActiveTime]      = useState([])
  // When this user last opened Explore (profiles.explore_seen_at). undefined = not loaded /
  // column missing (feature stays off, never breaks the page); number = ms timestamp.
  const [exploreSeenAt, setExploreSeenAt] = useState(undefined)
  const [filtersOpen, setFiltersOpen]         = useState(false)

  // ── Collection management modal ───────────────────────────────────────────
  // modalMode: null | 'create' | 'rename'
  const [modalMode,    setModalMode]    = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)

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

  /* ── Search matching ────────────────────────────────────────────────────────
     Checks the recipe name first (fast path), then falls back to scanning
     ingredient names. Both are treated with equal weight — a recipe surfaces
     if either its title OR any ingredient contains the query string.
     No scoring: simple OR logic keeps the implementation readable and fast
     since all data is already in memory.                                      */
  function matchesSearch(recipe, q) {
    if (!q) return true
    if (recipe.name.toLowerCase().includes(q)) return true
    if (Array.isArray(recipe.ingredients)) {
      return recipe.ingredients.some(
        ing => ing.name && ing.name.toLowerCase().includes(q)
      )
    }
    return false
  }

  useEffect(() => { fetchAll() }, [])

  // Load the Explore "last seen" time. First time ever (null) → start counting from now.
  useEffect(() => {
    let cancelled = false
    supabase.from('profiles').select('explore_seen_at').eq('id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        if (data.explore_seen_at) setExploreSeenAt(new Date(data.explore_seen_at).getTime())
        else {
          setExploreSeenAt(Date.now())
          supabase.from('profiles').update({ explore_seen_at: new Date().toISOString() }).eq('id', session.user.id)
        }
      })
    return () => { cancelled = true }
  }, [session.user.id])

  // Opening Explore clears the dot (and remembers it on the profile, so it holds on every device).
  useEffect(() => {
    if (activeTab !== 'public' || loading || exploreSeenAt === undefined) return
    const now = Date.now()
    setExploreSeenAt(now)
    supabase.from('profiles').update({ explore_seen_at: new Date(now).toISOString() }).eq('id', session.user.id)
  }, [activeTab, loading, exploreSeenAt === undefined])

  async function fetchAll() {
    setLoading(true)
    const [myRes, pubRes, likesRes, colRes] = await Promise.all([
      supabase.from('recipes').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('recipes').select('*')
        .eq('is_public', true)
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('likes').select('recipe_id')
        .eq('user_id', session.user.id),
      supabase.from('collections').select('id, name, description, cover_photo_url, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
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

    // ── Collections: fetch member recipe photos + counts in one query ──────
    if (!colRes.error && colRes.data && colRes.data.length > 0) {
      const colData      = colRes.data
      const collectionIds = colData.map(c => c.id)

      const { data: crData } = await supabase
        .from('collection_recipes')
        .select('collection_id, recipes(id, photo_url)')
        .in('collection_id', collectionIds)

      // Group photos + counts by collection_id
      const grouped = {}
      for (const row of crData || []) {
        const cid = row.collection_id
        if (!grouped[cid]) grouped[cid] = { count: 0, photos: [] }
        grouped[cid].count++
        if (row.recipes?.photo_url && grouped[cid].photos.length < 4) {
          grouped[cid].photos.push(row.recipes.photo_url)
        }
      }

      setCollections(colData.map(c => ({
        ...c,
        recipe_count: grouped[c.id]?.count  || 0,
        photos:       grouped[c.id]?.photos || [],
      })))
    } else if (!colRes.error) {
      setCollections([])
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

  // ── Collection CRUD ───────────────────────────────────────────────────────

  async function handleCreateCollection({ name, description }) {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: session.user.id, name, description: description || null })
      .select().single()
    if (!error && data) {
      setCollections(prev => [{ ...data, recipe_count: 0, photos: [] }, ...prev])
      if (activeTab !== 'collections') onTabChange('collections')
    }
    setModalMode(null)
  }

  async function handleRenameCollection({ name, description, cover }) {
    if (!renameTarget) return
    const patch = { name, description: description || null, cover_photo_url: cover || null }
    const { error } = await supabase
      .from('collections')
      .update(patch)
      .eq('id', renameTarget.id)
    if (!error) {
      setCollections(prev => prev.map(c => c.id === renameTarget.id ? { ...c, ...patch } : c))
    }
    setModalMode(null)
    setRenameTarget(null)
  }

  async function handleDeleteCollection(collection) {
    if (!window.confirm(t('col.confirmDelete', { name: collection.name }))) return
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collection.id)
    if (!error) {
      setCollections(prev => prev.filter(c => c.id !== collection.id))
    }
  }

  // Derived state
  const q = search.toLowerCase()
  const myFiltered          = myRecipes.filter(r => matchesSearch(r, q) && matchesFilters(r))
  const myFavs              = myFiltered.filter(r => r.is_favourite)
  const pubFiltered         = publicRecipes.filter(r => matchesSearch(r, q) && matchesFilters(r))
  // Explore is one masonry grid, newest-made-public first. The 4 most recently made-public
  // recipes (overall, even while searching/filtering) carry a NEW tag. made_public_at falls back
  // to created_at until the migration has run.
  const publicAt = r => new Date(r.made_public_at || r.created_at).getTime()
  const latestIds = new Set([...publicRecipes].sort((a, b) => publicAt(b) - publicAt(a)).slice(0, 4).map(r => r.id))
  const pubSorted = [...pubFiltered].sort((a, b) => publicAt(b) - publicAt(a))
  const hasNewExplore = typeof exploreSeenAt === 'number' && activeTab !== 'public'
    && publicRecipes.some(r => publicAt(r) > exploreSeenAt)
  const likedPublicFiltered = publicRecipes.filter(r => r.is_liked && matchesSearch(r, q) && matchesFilters(r))
  const allLiked            = [...myFavs, ...likedPublicFiltered]

  /* Masonry grid — columns defined in index.css .masonry-grid */

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F0' }}>
      <Nav
        onAdd={onAdd}
        onAddCollection={() => setModalMode('create')}
        session={session} onSignOut={onSignOut} username={username} onProfile={onProfile}
      />

      {/* Collection modal — create or edit (name, description, cover).
          Lives at page level so the nav "Add" menu can open it from any tab. */}
      {modalMode && (
        <CollectionEditModal
          title={modalMode === 'create' ? t('col.newTitle') : t('col.editTitle')}
          collectionId={modalMode === 'rename' ? renameTarget?.id : null}
          initial={modalMode === 'rename' ? (renameTarget || {}) : {}}
          onSave={modalMode === 'create' ? handleCreateCollection : handleRenameCollection}
          onClose={() => { setModalMode(null); setRenameTarget(null) }}
        />
      )}
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
      <TabBar active={activeTab} onChange={onTabChange} dots={{ public: hasNewExplore }} />

      <div className="px-4 pt-6 pb-10 lg:px-10">
        {loading ? (
          <div style={{
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--border-soft)',
            padding: '48px 20px', textAlign: 'center',
            fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>{t('browse.loading')}</div>
        ) : (
          <>
            {/* ── MY RECIPES TAB ── */}
            {activeTab === 'mine' && (
              myFiltered.length === 0 ? (
                myRecipes.length === 0
                  ? <EmptyMyRecipes onAdd={onAdd} />
                  : <EmptyState title={t('empty.noMatches')} sub={t('empty.tryDifferent')} />
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

            {/* ── MY COLLECTIONS TAB ── */}
            {activeTab === 'collections' && (
              <>
                {/* Masonry grid — matches recipe card layout and breakpoints exactly */}
                <MasonryGrid
                  items={collections.length > 0 ? collections : [{ id: '__new__', isNewCard: true }]}
                  getKey={col => col.id}
                  estimateHeight={(col, w) => col.isNewCard
                    ? w / 2
                    : col.cover_photo_url ? w * 1.5 : 150 + (col.description ? 44 : 0)}
                  renderItem={col => col.isNewCard ? (
                    /* Empty-state card: only until the first collection exists */
                    <EmptyCollectionCard onCreate={() => setModalMode('create')} />
                  ) : (
                    <CollectionCard
                      collection={col}
                      onClick={() => onSelectCollection && onSelectCollection(col)}
                      onRename={() => { setRenameTarget(col); setModalMode('rename') }}
                      onDelete={() => handleDeleteCollection(col)}
                    />
                  )}
                />
              </>
            )}

            {/* ── PUBLIC RECIPES TAB ── */}
            {activeTab === 'public' && (
              pubFiltered.length === 0 ? (
                publicRecipes.length === 0
                  ? <EmptyExplore />
                  : <EmptyState title={t('empty.noMatches')} sub={t('empty.tryDifferent')} />
              ) : (
                <>
                  <MasonryGrid
                    items={pubSorted}
                    getKey={r => r.id}
                    estimateHeight={(r, w) => r.photo_url ? w * 1.5 : 170}
                    renderItem={recipe => (
                      <PublicRecipeCard
                        recipe={recipe}
                        isNew={latestIds.has(recipe.id)}
                        onClick={() => onSelect(recipe)}
                        onToggleLike={e => toggleLike(recipe, e)}
                      />
                    )}
                  />
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
