/* ─── RecipeCards.jsx ───────────────────────────────────────────────────────
   Shared card components used by both Browse and CollectionDetail.
   Exported so multiple views can render MyRecipeCard / PublicRecipeCard
   without duplicating the definitions.
   ─────────────────────────────────────────────────────────────────────────── */

/* ─── HEART ICON ───────────────────────────────────────────────────────────── */
export function HeartIcon({ filled }) {
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

/* ─── REMOVE-FROM-COLLECTION ICON ──────────────────────────────────────────── */
export function RemoveFromCollectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

/* ─── CLOCK ICON ────────────────────────────────────────────────────────────── */
export function ClockIcon() {
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

/* ─── SHARED TIME FORMATTER ────────────────────────────────────────────────── */
export function fmtTime(mins) {
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

/* Overlay for image cards only: concentrated in the bottom quarter. */
export const OVERLAY_IMAGE =
  'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.80) 12%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0) 44%)'

/* Prep-time pill */
export function PrepTimePill({ mins, onPhoto = false }) {
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
export const blurBtn = {
  background: 'rgba(0,0,0,0.24)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 8,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 150ms, color 150ms',
}

/* ─── MY RECIPE CARD ───────────────────────────────────────────────────────── */
export function MyRecipeCard({ recipe, onClick, onToggleFavourite, onRemove }) {
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

        {/* Top row: pill (left) + action buttons column (right) */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
        }}>
          <div><PrepTimePill mins={recipe.total_time_min} onPhoto /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={onToggleFavourite}
              aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
              style={{ ...blurBtn, padding: 10, color: recipe.is_favourite ? '#D7191D' : '#fff', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
            ><HeartIcon filled={recipe.is_favourite} /></button>
            {onRemove && (
              <button
                onClick={onRemove}
                aria-label="Remove from collection"
                style={{ ...blurBtn, padding: 10, color: '#fff', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              ><RemoveFromCollectionIcon /></button>
            )}
          </div>
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
                }}>Public</span>
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
      {/* Top row: pill + action buttons column */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 8, padding: '12px 12px 0',
      }}>
        <div><PrepTimePill mins={recipe.total_time_min} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label="Remove from collection"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                color: '#0C3D4E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, borderRadius: 6, transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            ><RemoveFromCollectionIcon /></button>
          )}
        </div>
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
              }}>Public</span>
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
export function PublicRecipeCard({ recipe, onClick, onToggleLike, onRemove }) {
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

        {/* Top row: pill (left) + action buttons column (right) */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
        }}>
          <div><PrepTimePill mins={recipe.total_time_min} onPhoto /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={onToggleLike}
              aria-label={recipe.is_liked ? 'Unlike recipe' : 'Like recipe'}
              style={{ ...blurBtn, padding: 10, color: recipe.is_liked ? '#D7191D' : '#fff', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
            ><HeartIcon filled={recipe.is_liked} /></button>
            {onRemove && (
              <button
                onClick={onRemove}
                aria-label="Remove from collection"
                style={{ ...blurBtn, padding: 10, color: '#fff', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.42)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.24)'}
              ><RemoveFromCollectionIcon /></button>
            )}
          </div>
        </div>

        {/* Bottom: eyebrow → title → dietary → attribution */}
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
      {/* Top row: pill + action buttons column */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 8, padding: '12px 12px 0',
      }}>
        <div><PrepTimePill mins={recipe.total_time_min} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label="Remove from collection"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                color: '#0C3D4E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, borderRadius: 6, transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,61,78,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            ><RemoveFromCollectionIcon /></button>
          )}
        </div>
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
