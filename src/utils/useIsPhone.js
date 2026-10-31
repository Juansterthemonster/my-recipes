import { useState, useEffect } from 'react'

// Phone-sized screens (below Tailwind's md = 768px). The thumb-friendly bottom nav and bottom
// sheets are for these only; larger screens keep the desktop layout.
const QUERY = '(max-width: 767px)'

export function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = e => setPhone(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}
