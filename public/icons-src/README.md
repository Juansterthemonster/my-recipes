# App icon source

These SVGs are the source of truth for the app icons in `public/icons/`
and `public/apple-touch-icon.png`. They use the "MI SAZÓN" wordmark
(Plus Jakarta Sans ExtraBold, matching the Nav wordmark style) set on
two lines, white on the dark teal brand color (#0C3D4E).

- `icon-any.svg` — circle badge, used for the regular (non-maskable)
  192/512 PNG icons.
- `icon-maskable.svg` — full-bleed square, used for the maskable 512
  PNG icon (Android safe-zone compliant) and the Apple touch icon.

To regenerate the PNGs after editing these, rasterize each at the
sizes referenced in `public/manifest.json` and `index.html`
(192, 512, 512-maskable, 180 apple-touch-icon). Requires a renderer
with real font/text support — Plus Jakarta Sans ExtraBold must be
installed for the wordmark to render; a plain `convert` (ImageMagick)
without librsvg/pango will silently drop the text.
