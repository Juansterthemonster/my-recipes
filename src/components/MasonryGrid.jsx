import React, { useEffect, useRef, useState } from 'react'

/* ─── MASONRY GRID ──────────────────────────────────────────────────────────
   Columns match .masonry-grid (2 → 3 at 768px → 4 at 1024px, 0.75rem gap).
   Each card goes into the currently SHORTEST column, so there are no blank
   gaps under short (no-photo) cards and the order stays natural even with only
   a few cards. (Plain CSS columns fill one column to the tallest card's height
   first, which stacks short cards together when there are few items.)

   Heights are estimated per item (estimateHeight) just to choose a column;
   the cards themselves lay out naturally.                                    */
const GAP = 12

function columnsFor(viewportWidth) {
  return viewportWidth >= 1024 ? 4 : viewportWidth >= 768 ? 3 : 2
}

export default function MasonryGrid({ items, getKey, estimateHeight, renderItem }) {
  const ref = useRef(null)
  const [layout, setLayout] = useState({ cols: columnsFor(window.innerWidth), width: 0 })

  useEffect(() => {
    function measure() {
      setLayout({ cols: columnsFor(window.innerWidth), width: ref.current?.clientWidth || 0 })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const { cols, width } = layout
  const colWidth = width ? (width - GAP * (cols - 1)) / cols : 180

  const columns = Array.from({ length: cols }, () => [])
  const heights = new Array(cols).fill(0)
  for (const item of items) {
    let shortest = 0
    for (let i = 1; i < cols; i++) if (heights[i] < heights[shortest]) shortest = i
    columns[shortest].push(item)
    heights[shortest] += estimateHeight(item, colWidth) + GAP
  }

  return (
    <div ref={ref} style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
      {columns.map((col, i) => (
        <div key={i} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: GAP }}>
          {col.map(item => <div key={getKey(item)}>{renderItem(item)}</div>)}
        </div>
      ))}
    </div>
  )
}
