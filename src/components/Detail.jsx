import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { formatTime } from './TimePicker'

const EMOJIS = ['🍝','🥘','🥗','🍳','🫕','🌮','🍜','🥩','🍲','🫔','🥪','🍱']
function getEmoji(name) { return EMOJIS[name ? name.charCodeAt(0) % EMOJIS.length : 0] }

const pill = {
  fontSize: '0.72rem', padding: '5px 13px', borderRadius: 'var(--r-full)',
  background: 'var(--green-light)', color: 'var(--green-primary)',
  border: 'none', fontFamily: 'var(--font-body)', fontWeight: 500,
}

/* ─── INGREDIENT ROW ──────────────────────────────────────────────────────────
   Each IngRow is a self-contained cell rendered inside a 4-col outer grid.
   Inside each cell, a 2-track grid (name | amount) aligns text cleanly:
   - Left track (1fr): bullet + ingredient name, wraps naturally if long
   - Right track (auto): amount, right-aligned, never wraps
   Using an inner grid (not flexbox justify-between) means the amount column
   is sized to its widest value within each cell — no jagged right edges.
*/
function IngRow({ ing }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      columnGap: 8,
      alignItems: 'baseline',
      padding: '6px 0',
      borderBottom: '1px solid var(--border-soft)',
    }}>
      {/* Left — bullet + name */}
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
      {/* Right — amount, right-aligned */}
      <span
        className="text-[0.9375rem] md:text-[0.8rem]"
        style={{
          color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap', textAlign: 'right',
        }}
      >{ing.amount || ''}</span>
    </div>
  )
}

/* ─── INGREDIENT CARD ─────────────────────────────────────────────────────────
   Outer grid: 1 col mobile, 4 col tablet+desktop.
   gap-x-[14px] gives exactly 14px between columns as requested.
   Each cell = one IngRow (self-contained name+amount pair).
*/
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
        {items.map((ing, i) => (
          <IngRow key={i} ing={ing} />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 lg:mx-10" style={{
      background: 'var(--white)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-soft)', padding: '20px 24px',
    }}>
      <div style={{ ...sectionLabelStyle, color: 'var(--text-tertiary)', marginBottom: 14 }}>
        Ingredients
      </div>

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

export default function Detail({ recipe, onBack, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleDelete() {
    if (!window.confirm(`Delete "${recipe.name}"?`)) return
    await supabase.from('recipes').delete().eq('id', recipe.id)
    onDelete()
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const activeLabel = recipe.active_time_mins ? `${formatTime(recipe.active_time_mins)} prep` : null
  const totalLabel = recipe.total_time_min
    ? recipe.total_time_max && recipe.total_time_max !== recipe.total_time_min
      ? `${formatTime(recipe.total_time_min)}–${formatTime(recipe.total_time_max)} total`
      : `${formatTime(recipe.total_time_min)} total`
    : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>

      {/* ── Nav — forest green bg, white text/buttons/icon, full-width on desktop ── */}
      <div
        style={{ background: 'var(--green-primary)' }}
        className="
          px-5 py-4 flex items-center justify-between sticky top-0 z-10
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        {/* Back link — white */}
        <button onClick={onBack} style={{
          fontSize: '0.9rem', color: '#FFFFFF',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>← Recipes</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Edit button — white outline, white text */}
          <button onClick={() => onEdit(recipe)} style={{
            fontSize: '0.82rem', fontWeight: 500, padding: '7px 18px',
            borderRadius: 'var(--r-full)', border: '1.5px solid rgba(255,255,255,0.7)',
            background: 'transparent', color: '#FFFFFF',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>Edit</button>

          {/* Kebab menu — white vertical dots */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="More options"
              style={{
                width: 34, height: 34, borderRadius: 'var(--r-full)',
                border: '1.5px solid rgba(255,255,255,0.7)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, color: '#FFFFFF',
              }}
            >
              {/* Vertical kebab — three dots stacked, white */}
              <svg width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="2" cy="2"  r="1.75" fill="currentColor" />
                <circle cx="2" cy="8"  r="1.75" fill="currentColor" />
                <circle cx="2" cy="14" r="1.75" fill="currentColor" />
              </svg>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--white)', border: '1px solid var(--border-soft)',
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                minWidth: 150, zIndex: 100, overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setMenuOpen(false); handleDelete() }}
                  style={{
                    display: 'block', width: '100%', padding: '13px 18px', textAlign: 'left',
                    fontSize: '0.9rem', color: '#C0392B', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >Delete recipe</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="mx-4 mt-4 lg:mx-10" style={{
        background: 'var(--white)', borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-soft)', padding: '24px',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'var(--cream)', border: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', marginBottom: 16,
        }}>{getEmoji(recipe.name)}</div>

        <h1
          className="text-[1.5rem] md:text-[1.8rem]"
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 400,
            color: 'var(--text-primary)', lineHeight: 1.15,
            marginBottom: 10, letterSpacing: '-0.01em',
          }}>{recipe.name}</h1>

        {recipe.description && (
          <p
            className="text-[1.0625rem] md:text-[0.95rem]"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}
          >{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {activeLabel && <span style={pill}>{activeLabel}</span>}
          {totalLabel && <span style={pill}>{totalLabel}</span>}
          {recipe.serves && (
            <span style={{ ...pill, background: 'var(--cream-mid)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}>
              Serves {recipe.serves}
            </span>
          )}
          {recipe.cuisine && (
            <span style={{ ...pill, background: 'var(--cream-mid)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}>
              {recipe.cuisine}
            </span>
          )}
          {recipe.meal_type && (Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]).map(mt => (
            <span key={mt} style={{ ...pill, background: 'var(--amber-light)', color: '#8A6500', border: '1px solid #F0D98A' }}>
              {mt}
            </span>
          ))}
          {recipe.dietary && recipe.dietary.map(d => {
            const s = {
              'Gluten free':  { background: 'var(--cream-mid)',    color: 'var(--text-secondary)' },
              'Vegetarian':   { background: 'var(--green-tint)',   color: 'var(--green-primary)' },
              'Vegan':        { background: 'var(--white)',        color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' },
              'Pescatarian':  { background: 'var(--violet-light)', color: 'var(--violet-accent)' },
            }[d] || {}
            return <span key={d} style={{ ...pill, ...s }}>{d}</span>
          })}
        </div>
      </div>

      {/* ── Ingredients — no dividers, two-column name/amount alignment ── */}
      {ingredients.length > 0 && <IngredientCard ingredients={ingredients} />}

      {/* ── Method — single column, full width ── */}
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
