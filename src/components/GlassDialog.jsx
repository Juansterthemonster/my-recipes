import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useIsPhone } from '../utils/useIsPhone'
import { BottomSheet } from './MobileNav'
import { FROST_FILL, FROST_EDGE, FROST_DIM } from '../utils/glass'

/* Frosted-glass dialog: a bottom sheet on phones, a centred card on larger screens.
   Used by the announcements and the collection cover picker. */
export default function GlassDialog({ open, onClose, label, children, maxWidth = 440 }) {
  const isPhone = useIsPhone()
  useEffect(() => {
    if (!open || isPhone) return   // the bottom sheet handles Esc itself
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, isPhone, onClose])

  if (isPhone) return <BottomSheet glass open={open} onClose={onClose} label={label}>{children}</BottomSheet>
  if (!open) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: FROST_DIM }} />
      <div role="dialog" aria-modal="true" aria-label={label} style={{
        position: 'relative', width: '100%', maxWidth, maxHeight: '85vh', overflowY: 'auto',
        ...FROST_FILL, border: `1px solid ${FROST_EDGE}`, borderRadius: 24, padding: '28px 24px 22px',
        boxShadow: '0 18px 50px rgba(6,30,39,0.28), 0 2px 8px rgba(6,30,39,0.10)',
      }}>{children}</div>
    </div>,
    document.body
  )
}
