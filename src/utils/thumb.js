// Card thumbnails. Photos uploaded to our R2 bucket as `<name>.webp` have
// small copies `<name>_640.webp` and `<name>_960.webp` next to them.
// Anything else (older photos without copies, other hosts) just uses the
// original URL, and <CardImg> falls back to it if a small copy is missing.

export function hasThumbs(url) {
  // Works for any host (the old r2.dev address or a custom image domain): our uploads all live under mi-sazon/.
  return !!(url && url.includes('/mi-sazon/') && /\.webp$/.test(url) && !/_(640|960)\.webp$/.test(url))
}

export function thumbSrcSet(url) {
  if (!hasThumbs(url)) return undefined
  return `${url.replace(/\.webp$/, '_640.webp')} 640w, ${url.replace(/\.webp$/, '_960.webp')} 960w`
}
