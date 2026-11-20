import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/* ─────────────────────────────────────────────────────────────────────────────
   Spotlight — dims the screen, leaves one element lit, and points a small card at it.
   The lit area is a real hole: taps on it reach the element underneath (so "tap the
   photo" works right inside the tour). Taps anywhere else, Esc, or the button close it.
   The card is frosted glass (iOS-style) with a little triangle pointing at the lit element.
   Props: open, getTarget() → element, title, body, buttonLabel, onClose.
   ───────────────────────────────────────────────────────────────────────────── */

const PAD = 4          // breathing room around the lit element
const DIM = 'rgba(6,30,39,0.34)'   // light, like an iOS dimmed backdrop
const CARD_MAX = 340
const ARROW_W = 24, ARROW_H = 12

// Same frosted-glass fill for the card and its triangle so they read as one piece.
const GLASS_FILL = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))',
  backdropFilter: 'blur(28px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
}

export default function Spotlight({ open, getTarget, title, body, buttonLabel, onClose }) {
  const [rect, setRect] = useState(null)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  useEffect(() => {
    if (!open) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = getTarget?.()
        if (!el) { setRect(null); return }
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        setVp({ w: window.innerWidth, h: window.innerHeight })
      })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, getTarget, onClose])

  if (!open || !rect) return null

  const hole = {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  }
  const bottom = hole.top + hole.height
  const below = vp.h - bottom > 200

  const cardW = Math.min(CARD_MAX, vp.w - 32)
  const cardLeft = (vp.w - cardW) / 2
  const holeCenter = hole.left + hole.width / 2
  const arrowX = Math.max(26, Math.min(cardW - 26, holeCenter - cardLeft))   // keep it off the rounded corners
  const gap = 8 + ARROW_H
  const cardPos = below
    ? { top: bottom + gap }
    : { top: Math.max(12, hole.top - gap), transform: 'translateY(-100%)' }

  // Four invisible panels catch taps outside the hole; the hole itself stays clear.
  const catcher = st => <div onClick={onClose} style={{ position: 'fixed', pointerEvents: 'auto', ...st }} />

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, pointerEvents: 'none' }} role="dialog" aria-modal="true" aria-label={title}>
      {/* dimming + rounded cut-out */}
      <div style={{
        position: 'fixed', top: hole.top, left: hole.left, width: hole.width, height: hole.height,
        borderRadius: 16, boxShadow: `0 0 0 9999px ${DIM}`, border: '2px solid rgba(255,255,255,0.9)',
        boxSizing: 'border-box', pointerEvents: 'none',
      }} />
      {catcher({ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) })}
      {catcher({ top: bottom, left: 0, right: 0, bottom: 0 })}
      {catcher({ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height })}
      {catcher({ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height })}

      <div style={{
        position: 'fixed', left: cardLeft, width: cardW, pointerEvents: 'auto', ...cardPos,
        ...GLASS_FILL, borderRadius: 24, padding: '20px 20px 16px',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: '0 18px 50px rgba(6,30,39,0.28), 0 2px 8px rgba(6,30,39,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      }}>
        {/* triangle pointing at the lit element */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: arrowX - ARROW_W / 2, width: ARROW_W, height: ARROW_H,
          ...(below ? { top: -ARROW_H + 1, clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' }
                    : { bottom: -ARROW_H + 1, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }),
          ...GLASS_FILL,
        }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>{body}</div>
        <button onClick={onClose} style={{
          alignSelf: 'flex-end', marginTop: 14,
          background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
          borderRadius: 999, padding: '8px 20px', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
        }}>{buttonLabel}</button>
      </div>
    </div>,
    document.body
  )
}
