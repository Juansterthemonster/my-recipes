import { useState } from 'react'
import { thumbSrcSet } from '../utils/thumb'

// <img> for list/grid cards: asks the browser for the 640 or 960px copy that
// fits the card (sizes below), and falls back to the full photo if the small
// copy doesn't exist yet (older recipes) or fails to load.
export default function CardImg({ src, sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw', ...rest }) {
  const [failed, setFailed] = useState(false)
  const srcSet = failed ? undefined : thumbSrcSet(src)
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      onError={srcSet ? () => setFailed(true) : undefined}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  )
}
