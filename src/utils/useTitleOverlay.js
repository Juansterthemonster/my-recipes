import { useRef, useState, useEffect } from 'react'

/* Photo recipe cards: the dark gradient behind the title is a fixed share of the card height, which is
   enough for one or two lines. When the recipe name needs three lines the text block gets taller, so the
   gradient is rebuilt from the measured height of the text block and reaches higher, keeping it readable.
   Names of one or two lines keep the normal gradient.

   const { nameRef, blockRef, overlay } = useTitleOverlay(OVERLAY_IMAGE, recipe.photo_url)
   (the second argument re-attaches the measuring when the card changes between photo and no-photo)
     nameRef  → the title element       blockRef → the whole text block at the bottom of the card
     overlay  → the CSS background for the gradient layer */
export function useTitleOverlay(baseOverlay, watch) {
  const nameRef = useRef(null)
  const blockRef = useRef(null)
  const [overlay, setOverlay] = useState(baseOverlay)

  useEffect(() => {
    const block = blockRef.current
    if (!block || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const name = nameRef.current
      if (!name) return
      const lineH = parseFloat(getComputedStyle(name).lineHeight) || 25
      const lines = Math.round(name.scrollHeight / lineH)
      const h = block.offsetHeight
      const next = lines >= 3
        ? `linear-gradient(to top, rgba(0,0,0,0.90) 0px, rgba(0,0,0,0.82) ${Math.round(h * 0.5)}px, rgba(0,0,0,0.34) ${Math.round(h * 0.9)}px, rgba(0,0,0,0) ${h + 44}px)`
        : baseOverlay
      setOverlay(prev => (prev === next ? prev : next))
    }
    // Runs once on observe, and again whenever the block's size changes (column width, web font loading)
    const ro = new ResizeObserver(measure)
    ro.observe(block)
    return () => ro.disconnect()
  }, [baseOverlay, watch])

  return { nameRef, blockRef, overlay }
}
