import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FROST_FILL, FROST_EDGE, FROST_DIM } from '../utils/glass'

/* ─────────────────────────────────────────────────────────────────────────────
   Spotlight — dims the screen, leaves one element lit, and points a small card at it.
   The lit area is a real hole: taps on it reach the element underneath (so "tap the
   photo" works right inside the tour). Taps anywhere else, Esc, or the button close it.
   The card is frosted glass (iOS-style) with a little triangle pointing at the lit element.
   Props: open, getTarget() → element, title, body, buttonLabel, onClose, onGotIt (optional: the button
   calls this instead of onClose, so "Got it" can be told apart from tapping outside or Esc).
   ───────────────────────────────────────────────────────────────────────────── */

const PAD = 4          // breathing room around the lit element
const DIM = FROST_DIM   // light, like an iOS dimmed backdrop
const CARD_MAX = 340
const ARROW_W = 24, ARROW_H = 12
const CARD_EDGE = FROST_EDGE
const ARROW_EDGE = CARD_EDGE

const GLASS_FILL = FROST_FILL   // same frosted glass as the card and its triangle

export default function Spotlight({ open, getTarget, title, body, buttonLabel, onClose, onGotIt }) {
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
  const holeCenter = hole.left + hole.width / 2
  // Sit the card under (or over) the lit element, not in the middle of the screen: on a wide desktop window
  // a centred card would float far away from a small target. On phones the card is nearly full width, so this
  // lands in the same place as before.
  const cardLeft = Math.max(16, Math.min(vp.w - cardW - 16, holeCenter - cardW / 2))
  const arrowX = Math.max(26, Math.min(cardW - 26, holeCenter - cardLeft))   // keep it off the rounded corners
  const gap = 8 + ARROW_H
  const cardPos = below
    ? { top: bottom + gap }
    : { top: Math.max(12, hole.top - gap), transform: 'translateY(-100%)' }

  // Triangle shape, and the card outline with a notch where the triangle's base sits.
  const tri = below ? 'polygon(50% 0, 0 100%, 100% 100%)' : 'polygon(0 0, 100% 0, 50% 100%)'
  const x1 = arrowX - ARROW_W / 2, x2 = arrowX + ARROW_W / 2
  const k = 1.41   // edge thickness measured along the base
  const W = ARROW_W, H = ARROW_H
  const chevron = below
    ? `polygon(${W/2}px 0, ${W}px ${H}px, ${W-k}px ${H}px, ${W/2}px ${k}px, ${k}px ${H}px, 0 ${H}px)`
    : `polygon(${W/2}px ${H}px, ${W}px 0, ${W-k}px 0, ${W/2}px ${H-k}px, ${k}px 0, 0 0)`
  const ringClip = below
    ? `polygon(0 0, ${x1}px 0, ${x1}px 4px, ${x2}px 4px, ${x2}px 0, 100% 0, 100% 100%, 0 100%)`
    : `polygon(0 0, 100% 0, 100% 100%, ${x2}px 100%, ${x2}px calc(100% - 4px), ${x1}px calc(100% - 4px), ${x1}px 100%, 0 100%)`

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
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '20px 20px 16px',
      }}>
        {/* The card, its outline and the triangle are separate layers, all frosted directly over the
            page (a glass layer nested inside another one would blur differently and look off-colour).
            The outline has a gap where the triangle joins so the edge flows around it. */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: 24, ...GLASS_FILL,
          boxShadow: '0 18px 50px rgba(6,30,39,0.28), 0 2px 8px rgba(6,30,39,0.10)',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none',
          border: `1px solid ${CARD_EDGE}`, boxSizing: 'border-box', clipPath: ringClip,
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', left: arrowX - ARROW_W / 2, width: ARROW_W, height: ARROW_H + 0.5,
          ...(below ? { top: -ARROW_H } : { bottom: -ARROW_H }),
          clipPath: tri, ...GLASS_FILL,
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', left: arrowX - ARROW_W / 2, width: ARROW_W, height: ARROW_H,
          ...(below ? { top: -ARROW_H } : { bottom: -ARROW_H }),
          clipPath: chevron, background: CARD_EDGE,
        }} />

        <div style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ position: 'relative', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>{body}</div>
        <button onClick={onGotIt || onClose} style={{
          position: 'relative', alignSelf: 'flex-end', marginTop: 14,
          background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
          borderRadius: 999, padding: '8px 20px', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
        }}>{buttonLabel}</button>
      </div>
    </div>,
    document.body
  )
}
