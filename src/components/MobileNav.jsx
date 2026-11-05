import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'

/* Phone-only navigation: bottom tab bar + floating Add button + bottom sheets.
   Rendered by Browse only on phone-sized screens (see useIsPhone). */

// Height of the system navigation bar. In the Android app the shell sets --sazon-bottom-inset (the page
// is drawn underneath that bar); in browsers it falls back to the browser's own safe-area inset.
const SAFE_BOTTOM = 'var(--sazon-bottom-inset, env(safe-area-inset-bottom, 0px))'
const NAV_HEIGHT = 59

/* ─── ICONS (24px, 2.2 stroke, round caps/joins, currentColor) ──────────────────────────── */
const svgProps = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}
const ICONS = {
  mine: (    // open book, soft corners
    <svg {...svgProps}><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 14.5z" /><path d="M21 6.5A2.5 2.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a2.5 2.5 0 0 0 2.5-2.5z" /></svg>
  ),
  favourites: (    // same heart as the recipe cards (Browse.jsx HeartIcon), with the nav's thicker stroke
    <svg {...svgProps}><g transform="translate(12 13) scale(0.9) translate(-12 -13)"><path vectorEffect="non-scaling-stroke" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></g></svg>
  ),
  collections: (    // rounded folder
    <svg {...svgProps}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.4c.5 0 1 .2 1.3.6L11.3 7h7.2A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z" /></svg>
  ),
  public: (    // compass with a rounded needle
    <svg {...svgProps}><circle cx="12" cy="12" r="9.5" /><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" /></svg>
  ),
}
function PlusIcon() {
  return <svg {...svgProps} width="26" height="26" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

/* ─── BOTTOM SHEET ────────────────────────────────────────────────────── */
// Slides up from the bottom; closes on backdrop tap, Escape, or the handle. Rendered in a portal
// so it sits above everything regardless of where it's used.
export function BottomSheet({ open, onClose, label, children }) {
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
          position: 'absolute', inset: 0, background: 'rgba(6,30,39,0.45)',
          opacity: shown ? 1 : 0, transition: 'opacity 200ms ease',
        }}
      />
      <div
        ref={sheetRef}
        role="dialog" aria-modal="true" aria-label={label}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'var(--sazon-bottom-inset, env(safe-area-inset-bottom, 0px))',
          background: '#FFFFFF', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 30px rgba(12,61,78,0.18)',
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
        color: danger ? '#B42318' : 'var(--text-primary)',
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
          bottom: `calc(${NAV_HEIGHT}px + ${SAFE_BOTTOM} + 16px)`,
          width: 68, height: 68, borderRadius: 18,   // between the M3 baseline (56) and Expressive medium (80) sizes
          background: '#E3EED6', color: '#0C3D4E', border: 'none', cursor: 'pointer',   // light container, teal icon (inverse of the bar)
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',   // Material 3 elevation, kept small
        }}
      ><PlusIcon /></button>

      <nav
        aria-label="Main"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
          // Brand teal, see-through so cards show faintly behind it while scrolling, with a very light blur (1px)
          background: 'rgba(12,61,78,0.87)',
          backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)',
          paddingBottom: SAFE_BOTTOM,
        }}
      >
        <div style={{ display: 'flex', height: NAV_HEIGHT }}>
          {tabs.map(tab => {
            const on = active === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                aria-current={on ? 'page' : undefined}
                style={{
                  flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', paddingTop: 3,   // nudges the icons 3px lower
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  color: on ? '#F9F6F0' : 'rgba(249,246,240,0.7)',
                  fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: on ? 700 : 500,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 52, height: 30, borderRadius: 15,
                  background: on ? 'rgba(227,238,214,0.6)' : 'transparent', transition: 'background 150ms',
                  color: on ? '#0C3D4E' : 'inherit',
                }}>
                  {ICONS[tab.key]}
                  {dots[tab.key] && (
                    <span
                      role="img" aria-label={t('explore.newDot')}
                      style={{ position: 'absolute', top: 3, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#F9F6F0', border: '1.5px solid #0C3D4E' }}
                    />
                  )}
                </span>
                <span style={{ maxWidth: '100%', padding: '0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
export const BOTTOM_NAV_CLEARANCE = `calc(${NAV_HEIGHT + 100}px + ${SAFE_BOTTOM})`
