import { useState } from 'react'
import { TOURS, tourSeen, resetTour } from '../utils/tours'
import AdminAccordion from './AdminAccordion'

/* AdminTours — owner tool for the one-time spotlight tours (src/utils/tours.js).
   Tours are remembered per device, so "Reset on this device" makes it appear again the next
   time you open a recipe (on a phone-width screen, with a photo that is cropped). */

const btn = {
  background: 'transparent', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)',
  borderRadius: 999, padding: '7px 16px', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
}

export default function AdminTours() {
  const [, bump] = useState(0)
  const [note, setNote] = useState('')

  function reset(id) {
    resetTour(id)
    setNote('Done. Open any recipe with a photo (phone-width screen) and the tour will appear.')
    bump(n => n + 1)
  }

  return (
    <AdminAccordion title="Spotlight tours" meta={TOURS.length}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
        Each tour shows once per device. Reset it to see it again.
      </div>
      {note && <div style={{ background: 'var(--green-light)', color: 'var(--success-text-dark)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', marginBottom: 12 }}>{note}</div>}
      {TOURS.map((tour, i) => (
        <div key={tour.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)', fontFamily: 'var(--font-body)',
        }}>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tour.id}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{tour.label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {tourSeen(tour.id) ? 'This device: already seen' : 'This device: not seen yet'}
            </div>
          </div>
          <button onClick={() => reset(tour.id)} style={btn}>Reset on this device</button>
        </div>
      ))}
    </AdminAccordion>
  )
}
