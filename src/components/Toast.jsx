import { useEffect, useState } from 'react'

export default function Toast({ message, visible, onHide }) {
  const [rendered, setRendered] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const [translateY, setTranslateY] = useState(12)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      requestAnimationFrame(() => {
        setTimeout(() => {
          setOpacity(1)
          setTranslateY(0)
        }, 10)
      })
      const hideTimer = setTimeout(() => {
        setOpacity(0)
        setTranslateY(-12)
        setTimeout(() => {
          setRendered(false)
          onHide()
        }, 300)
      }, 2800)
      return () => clearTimeout(hideTimer)
    }
  }, [visible])

  if (!rendered) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: 20,
      transform: `translateY(${translateY}px)`,
      opacity,
      transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 999,
      pointerEvents: 'none',
      width: 'calc(100% - 40px)',
      maxWidth: 360,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 'var(--r-md)',
        background: 'var(--green-light)',
        color: 'var(--green-primary)',
        boxShadow: '0 4px 20px rgba(44, 61, 28, 0.12)',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--green-primary)',
          flexShrink: 0, display: 'inline-block', marginTop: 5,
        }} />
        <div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.82rem',
            fontWeight: 500, color: 'var(--green-primary)', marginBottom: 2,
          }}>{message.title}</div>
          {message.sub && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '0.75rem',
              color: 'var(--green-primary)', opacity: 0.75,
            }}>{message.sub}</div>
          )}
        </div>
      </div>
    </div>
  )
}
