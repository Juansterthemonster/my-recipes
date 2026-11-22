import { useState } from 'react'

/* A small collapsible card for the admin dashboard: the title row toggles the body. */
export default function AdminAccordion({ title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)',
      marginBottom: 12, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
        }}
      >
        <span style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {title}{meta != null ? <span style={{ color: 'var(--text-secondary)' }}> · {meta}</span> : null}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ flexShrink: 0, transition: 'transform 180ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div style={{ padding: '0 18px 16px' }}>{children}</div>}
    </div>
  )
}
