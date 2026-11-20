import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/* ─────────────────────────────────────────────────────────────────────────────
   Spotlight — dims the screen, leaves one element lit, and points a small card at it.
   The lit area is a real hole: taps on it reach the element underneath (so "tap the
   photo" works right inside the tour). Taps anywhere else, Esc, or the button close it.
   Props: open, getTarget() → element, title, body, buttonLabel, onClose.
   ───────────────────────────────────────────────────────────────────────────── */

const PAD = 4          // breathing room around the lit element
const DIM = 'rgba(6,30,39,0.64)'

export default function Spotlight({ open, getTarget, title, body, buttonLabel, onClose }) {
  const [rect, setRect] = useState(null)
  const [vh, setVh] = useState(() => window.innerHeight)

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
        setVh(window.innerHeight)
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
  const below = vh - bottom > 190
  const cardStyle = below
    ? { top: bottom + 16 }
    : { top: Math.max(12, hole.top - 16), transform: 'translateY(-100%)' }

  // Four invisible panels catch taps outside the hole; the hole itself stays clear.
  const catcher = s => <div onClick={onClose} style={{ position: 'fixed', pointerEvents: 'auto', ...s }} />

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
        position: 'fixed', left: 16, right: 16, maxWidth: 360, margin: '0 auto', pointerEvents: 'auto', ...cardStyle,
        background: '#FFFFFF', borderRadius: 18, padding: '18px 20px 16px',
        boxShadow: '0 12px 40px rgba(6,30,39,0.35)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>{body}</div>
        <button onClick={onClose} style={{
          marginTop: 14, width: '100%', background: 'var(--green-primary)', color: '#F9F6F0', border: 'none',
          borderRadius: 999, padding: '12px 16px', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
        }}>{buttonLabel}</button>
      </div>
    </div>,
    document.body
  )
}
