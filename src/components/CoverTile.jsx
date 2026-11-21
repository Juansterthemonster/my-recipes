/* A selectable photo tile for the collection cover pickers — styled after the iOS app:
   2:3 (same shape as the collection card, so photos are cropped the way they will appear),
   the chosen tile is full brightness with a thin white ring and a glass check badge in the
   corner; the others are slightly dimmed and a touch smaller. */
export default function CoverTile({ selected, onClick, label, children, background = 'var(--white)' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      style={{
        position: 'relative', aspectRatio: '2/3', width: '100%', minWidth: 0, padding: 0, cursor: 'pointer',
        borderRadius: 10, overflow: 'hidden', background,
        border: 'none',
        boxShadow: selected ? 'inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 1px rgba(12,61,78,0.15)' : 'inset 0 0 0 1px var(--border-soft)',
        opacity: selected ? 1 : 0.7,
        transform: selected ? 'scale(1)' : 'scale(0.96)',
        transition: 'opacity 250ms ease, transform 250ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 250ms ease',
      }}
    >
      {children}
      {/* the ring sits above the image */}
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none',
        boxShadow: selected ? 'inset 0 0 0 2px rgba(255,255,255,0.9)' : 'inset 0 0 0 1px var(--border-soft)',
        transition: 'box-shadow 250ms ease',
      }} />
      <span aria-hidden="true" style={{
        position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        background: 'rgba(62,146,191,0.62)',
        backdropFilter: 'blur(10px) saturate(1.6)', WebkitBackdropFilter: 'blur(10px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 2px 8px rgba(6,30,39,0.25)',
        opacity: selected ? 1 : 0, transform: selected ? 'scale(1)' : 'scale(0.4)',
        transition: 'opacity 250ms ease, transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
      </span>
    </button>
  )
}
