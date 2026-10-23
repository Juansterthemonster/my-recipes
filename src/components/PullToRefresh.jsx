import { useEffect, useRef } from 'react'
import { IN_APP_WEBVIEW } from '../utils/inApp'

/* Pull-to-refresh for the Android app shell only (a normal browser already has its own).
   Pull down from the very top of the page and release past the threshold → the page reloads.
   Ignored while a modal is open (body scroll locked) or when the touch starts inside something that
   can scroll itself (horizontal pill rows, scrollable panels). */
const THRESHOLD = 70
const MAX_PULL = 110

function insideScroller(el) {
  while (el && el !== document.body && el !== document.documentElement) {
    const cs = window.getComputedStyle(el)
    const scrollsY = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight
    const scrollsX = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth
    if (scrollsX || (scrollsY && el.scrollTop > 0)) return true
    el = el.parentElement
  }
  return false
}

export default function PullToRefresh() {
  const barRef = useRef(null)

  useEffect(() => {
    if (!IN_APP_WEBVIEW) return
    document.documentElement.style.overscrollBehaviorY = 'contain'   // no stretch/glow, we draw our own
    const bar = barRef.current
    let startY = null
    let pull = 0
    let busy = false

    const draw = (px, spinning) => {
      if (!bar) return
      bar.style.opacity = px > 6 || spinning ? '1' : '0'
      bar.style.transform = `translate(-50%, ${px - 52}px)`
      const arrow = bar.firstChild
      if (arrow) {
        arrow.style.transform = spinning ? '' : `rotate(${Math.min(px / THRESHOLD, 1) * 180}deg)`
        arrow.style.animation = spinning ? 'sazon-ptr-spin 0.8s linear infinite' : 'none'
      }
    }

    const onStart = e => {
      if (busy || e.touches.length !== 1) { startY = null; return }
      if (window.scrollY > 0 || document.body.style.overflow === 'hidden' || insideScroller(e.target)) { startY = null; return }
      startY = e.touches[0].clientY
      pull = 0
    }
    const onMove = e => {
      if (startY === null || busy) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0 || window.scrollY > 0) { pull = 0; draw(0, false); return }
      pull = Math.min(dy * 0.5, MAX_PULL)
      draw(pull, false)
    }
    const onEnd = () => {
      if (startY === null || busy) return
      startY = null
      if (pull >= THRESHOLD) {
        busy = true
        draw(56, true)
        setTimeout(() => window.location.reload(), 200)
      } else {
        draw(0, false)
      }
      pull = 0
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (!IN_APP_WEBVIEW) return null
  return (
    <>
      <style>{'@keyframes sazon-ptr-spin{to{transform:rotate(360deg)}}'}</style>
      <div
        ref={barRef}
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: '50%', zIndex: 60, width: 40, height: 40,
          borderRadius: '50%', background: '#0C3D4E', color: '#F9F6F0', opacity: 0,
          transform: 'translate(-50%, -52px)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </div>
    </>
  )
}
