import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import { FROST_FILL, FROST_EDGE, FROST_DIM } from '../utils/glass'

/* Phone-only navigation: bottom tab bar + floating Add button + bottom sheets.
   Rendered by Browse only on phone-sized screens (see useIsPhone). */

// Height of the system navigation bar. In the Android app the shell sets --sazon-bottom-inset (the page
// is drawn underneath that bar); in browsers it falls back to the browser's own safe-area inset.
const SAFE_BOTTOM = 'var(--sazon-bottom-inset, env(safe-area-inset-bottom, 0px))'
const NAV_HEIGHT = 62   // the floating pill
const NAV_GAP = 10      // space between the pill and the bottom edge / system bar

/* ─── ICONS — drawn to match the iOS tab bar's SF Symbols: outline when idle, filled when selected ── */
const svgProps = {
  width: 26, height: 26, viewBox: '0 0 24 24', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}
const fillOf = on => (on ? 'currentColor' : 'none')
const ICONS = {
  mine: on => (    // book / book.fill — open book
    <svg {...svgProps} fill={fillOf(on)}>
      <path d="M12 7.2C11 5.4 9.3 4.8 7.3 4.8 5.3 4.8 3.3 5.4 3.3 7.4V17.6C4.9 16.4 6.8 16 8.8 16.1 10.2 16.2 11.3 16.8 12 18.2Z" />
      <path d="M12 7.2C13 5.4 14.7 4.8 16.7 4.8 18.7 4.8 20.7 5.4 20.7 7.4V17.6C19.1 16.4 17.2 16 15.2 16.1 13.8 16.2 12.7 16.8 12 18.2Z" />
    </svg>
  ),
  favourites: on => (    // heart / heart.fill
    <svg {...svgProps} fill={fillOf(on)}>
      <path d="M12 20.2C5.6 15.9 3.2 12.6 3.2 9.1 3.2 6.5 5.2 4.6 7.6 4.6 9.5 4.6 11.1 5.6 12 7.2 12.9 5.6 14.5 4.6 16.4 4.6 18.8 4.6 20.8 6.5 20.8 9.1 20.8 12.6 18.4 15.9 12 20.2Z" />
    </svg>
  ),
  collections: on => (    // square.grid.2x2 / .fill
    <svg {...svgProps} fill={fillOf(on)}>
      <rect x="3.8" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="3.8" y="13.2" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="13.2" width="7" height="7" rx="1.9" />
    </svg>
  ),
  public: on => (    // compass (the original Explore icon), drawn at the same weight as the others; filled when selected
    <svg {...svgProps} fill="none">
      {on ? (
        <>
          <defs>
            <mask id="nav-compass-cut">
              <rect width="24" height="24" fill="#fff" />
              <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" fill="#000" stroke="#000" strokeWidth="1.2" />
            </mask>
          </defs>
          <circle cx="12" cy="12" r="9.2" fill="currentColor" mask="url(#nav-compass-cut)" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9.2" />
          <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" />
        </>
      )}
    </svg>
  ),
}
function PlusIcon() {
  return <svg {...svgProps} fill="none" width="26" height="26" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

/* ─── BOTTOM SHEET ────────────────────────────────────────────────────── */
// Slides up from the bottom; closes on backdrop tap, Escape, or the handle. Rendered in a portal
// so it sits above everything regardless of where it's used.
export function BottomSheet({ open, onClose, label, children, glass = false, background = 'var(--surface)' }) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const shown = open && entered   // sliding in/out is driven by this
  // Drag down to close: follow the finger while dragging, then close if pulled far/fast enough
  const sheetRef = useRef(null)
  const drag = useRef({ y: 0, t: 0, active: false })
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  function onTouchStart(e) {
    const atTop = (sheetRef.current?.scrollTop || 0) <= 0
    drag.current = { y: e.touches[0].clientY, t: Date.now(), active: atTop }
  }
  function onTouchMove(e) {
    if (!drag.current.active) return
    const dy = e.touches[0].clientY - drag.current.y
    if (dy > 0) { setDragging(true); setDragY(dy) } else if (dragY !== 0) { setDragY(0) }
  }
  function onTouchEnd() {
    if (!drag.current.active) return
    drag.current.active = false
    const dy = dragY
    const speed = dy / Math.max(1, Date.now() - drag.current.t)   // px per ms
    setDragging(false)
    setDragY(0)
    if (dy > 90 || (dy > 30 && speed > 0.5)) onClose()
  }

  useEffect(() => {
    if (open) {
      let id2
      const id1 = requestAnimationFrame(() => {
        setMounted(true)
        id2 = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      })
      return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
    }
    // closing: let the slide-out finish, then unmount
    const id = setTimeout(() => { setMounted(false); setEntered(false) }, 220)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [mounted, onClose])

  if (!mounted) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 250 }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: glass ? FROST_DIM : 'rgba(6,30,39,0.45)',
          opacity: shown ? 1 : 0, transition: 'opacity 200ms ease',
        }}
      />
      <div
        ref={sheetRef}
        role="dialog" aria-modal="true" aria-label={label}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'var(--sazon-bottom-inset, env(safe-area-inset-bottom, 0px))',
          ...(glass
            ? { ...FROST_FILL, border: `1px solid ${FROST_EDGE}`, borderBottom: 'none', boxShadow: '0 -8px 40px rgba(6,30,39,0.22)' }
            : { background, boxShadow: '0 -8px 30px rgba(12,61,78,0.18)' }),
          borderRadius: '20px 20px 0 0',
          padding: '10px 16px 16px',
          transform: shown ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          maxHeight: '85vh', overflowY: 'auto', overscrollBehavior: 'contain',
        }}
      >
        <button
          onClick={onClose} aria-label="Close"
          style={{ display: 'block', margin: '0 auto 6px', padding: '8px 40px', background: 'none', border: 'none', cursor: 'pointer' }}
        ><span style={{ display: 'block', width: 40, height: 4, borderRadius: 2, background: 'var(--border-soft)' }} /></button>
        {children}
      </div>
    </div>,
    document.body
  )
}

// One big tappable row inside a sheet
export function SheetRow({ onClick, children, trailing, danger = false, last = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        width: '100%', minHeight: 54, padding: '0 8px', textAlign: 'left',
        background: 'none', border: 'none', borderBottom: last ? 'none' : '1px solid var(--border-soft)',
        fontFamily: 'var(--font-body)', fontSize: '1rem', cursor: 'pointer',
        color: danger ? 'var(--danger-alt)' : 'var(--text-primary)',
      }}
    ><span>{children}</span>{trailing}</button>
  )
}

/* ─── BOTTOM TAB BAR + FLOATING ADD ───────────────────────────────────── */
export function BottomNav({ tabs, active, onChange, dots = {}, onAdd }) {
  const { t } = useI18n()
  const [typing, setTyping] = useState(false)

  // Hide while the keyboard is up (search box etc.) so the bar doesn't ride above the keyboard.
  useEffect(() => {
    const isField = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    const onIn  = e => { if (isField(e.target)) setTyping(true) }
    const onOut = () => setTyping(false)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut) }
  }, [])

  // While this bar is on screen it draws behind the system navigation bar itself, so the solid
  // fill used on other screens (index.css .bottom-nav-on) is switched off.
  useEffect(() => {
    document.documentElement.classList.add('bottom-nav-on')
    return () => document.documentElement.classList.remove('bottom-nav-on')
  }, [])

  if (typing) return null
  return (
    <>
      <button
        onClick={onAdd}
        aria-label={t('nav.add')}
        style={{
          position: 'fixed', right: 19, zIndex: 31,
          bottom: `calc(${NAV_HEIGHT + NAV_GAP}px + ${SAFE_BOTTOM} + 14px)`,
          width: 68, height: 68, borderRadius: 18,   // between the M3 baseline (56) and Expressive medium (80) sizes
          background: 'var(--green-light)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer',   // light container, teal icon (inverse of the bar)
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',   // Material 3 elevation, kept small
        }}
      ><PlusIcon /></button>

      <nav
        aria-label="Main"
        style={{
          // Floating glass pill, like the iOS tab bar: inset from the screen edges, fully rounded
          position: 'fixed', left: 14, right: 14, zIndex: 30,
          bottom: `calc(${SAFE_BOTTOM} + ${NAV_GAP}px)`,
          height: NAV_HEIGHT, borderRadius: NAV_HEIGHT / 2, padding: 4,
          background: 'var(--nav-glass)',
          backdropFilter: 'blur(5px) saturate(1.4)', WebkitBackdropFilter: 'blur(5px) saturate(1.4)',
          border: '1px solid var(--nav-edge)',
          boxShadow: 'var(--nav-shadow)',
        }}
      >
        <div style={{ display: 'flex', height: '100%', gap: 2 }}>
          {tabs.map(tab => {
            const on = active === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                aria-current={on ? 'page' : undefined}
                style={{
                  position: 'relative', flex: 1, minWidth: 0, height: '100%', border: 'none', cursor: 'pointer',
                  borderRadius: (NAV_HEIGHT - 8) / 2,
                  background: on ? 'var(--nav-active)' : 'transparent', transition: 'background 180ms',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  color: on ? 'var(--nav-fg-on)' : 'var(--nav-fg)',
                  fontFamily: 'var(--font-body)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.01em',
                  WebkitTapHighlightColor: 'transparent', padding: '0 2px',
                }}
              >
                <span style={{ position: 'relative', display: 'flex' }}>
                  {ICONS[tab.key](on)}
                  {dots[tab.key] && (
                    <span
                      role="img" aria-label={t('explore.newDot')}
                      style={{ position: 'absolute', top: 0, right: -3, width: 9, height: 9, borderRadius: '50%', background: 'var(--heart)', border: '1.5px solid var(--nav-dot-ring)' }}
                    />
                  )}
                </span>
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(`bnav.${tab.key}`)}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// Space to leave under the page content so the last cards aren't hidden by the bar + button.
export const BOTTOM_NAV_CLEARANCE = `calc(${NAV_HEIGHT + NAV_GAP + 100}px + ${SAFE_BOTTOM})`
