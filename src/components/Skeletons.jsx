import { useI18n } from '../i18n'

/* Loading placeholders shaped like the real cards: same proportions, rounded corners, pill +
   heart at the top, and fake eyebrow / title / tag lines at the bottom, with a soft shimmer
   (.skeleton in index.css). They use the same .masonry-grid as the real lists, so the layout
   doesn't jump when the real cards arrive. */

const ghost = { background: 'rgba(255,255,255,0.55)', borderRadius: 999 }   // light shapes on the photo-style card

// Like MyRecipeCard / PublicRecipeCard with a photo: 2:3, pill + heart on top, text at the bottom
function PhotoCardSkeleton() {
  return (
    <div aria-hidden="true" className="skeleton" style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ ...ghost, width: 62, height: 30 }} />
        <div style={{ ...ghost, width: 38, height: 38, borderRadius: '50%' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 14px 16px' }}>
        <div style={{ ...ghost, width: '38%', height: 8, marginBottom: 9 }} />
        <div style={{ ...ghost, width: '88%', height: 18, marginBottom: 7 }} />
        <div style={{ ...ghost, width: '58%', height: 18, marginBottom: 11 }} />
        <div style={{ ...ghost, width: '30%', height: 10 }} />
      </div>
    </div>
  )
}

// Like the no-photo card: white, thin border, content height
function PlainCardSkeleton({ spacer = 34 }) {
  return (
    <div aria-hidden="true" style={{
      borderRadius: 8, background: '#FFFFFF', border: '1px solid #D1D5DB',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 0' }}>
        <div className="skeleton" style={{ width: 62, height: 30, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
      </div>
      <div style={{ minHeight: spacer }} />
      <div style={{ padding: '0 14px 16px' }}>
        <div className="skeleton" style={{ width: '36%', height: 8, borderRadius: 999, marginBottom: 9 }} />
        <div className="skeleton" style={{ width: '86%', height: 18, borderRadius: 999, marginBottom: 7 }} />
        <div className="skeleton" style={{ width: '54%', height: 18, borderRadius: 999, marginBottom: 11 }} />
        <div className="skeleton" style={{ width: '28%', height: 10, borderRadius: 999 }} />
      </div>
    </div>
  )
}

// A mix of photo and no-photo cards in an uneven rhythm, like a real list
const RECIPE_PATTERN = [
  ['photo'], ['plain', 34], ['photo'], ['photo'], ['plain', 70], ['photo'],
  ['plain', 48], ['photo'], ['photo'], ['plain', 30], ['photo'], ['plain', 60],
]

export function RecipeGridSkeleton() {
  const { t } = useI18n()
  return (
    <div className="masonry-grid" role="status" aria-busy="true" aria-label={t('browse.loading')}>
      {RECIPE_PATTERN.map(([kind, spacer], i) => (
        <div key={i} className="masonry-item">
          {kind === 'photo' ? <PhotoCardSkeleton /> : <PlainCardSkeleton spacer={spacer} />}
        </div>
      ))}
    </div>
  )
}

// Collections: cards with a title + "N recipes" line and the options button
const COLLECTION_HEIGHTS = ['3/4', '1/1', '1/1', '3/4', '4/3', '1/1']

export function CollectionGridSkeleton() {
  const { t } = useI18n()
  return (
    <div className="masonry-grid" role="status" aria-busy="true" aria-label={t('browse.loading')}>
      {COLLECTION_HEIGHTS.map((ratio, i) => (
        <div key={i} className="masonry-item">
          <div aria-hidden="true" className="skeleton" style={{ position: 'relative', aspectRatio: ratio, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, ...ghost, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 14px 16px' }}>
              <div style={{ ...ghost, width: '70%', height: 18, marginBottom: 9 }} />
              <div style={{ ...ghost, width: '34%', height: 10 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Shared-recipe page while it loads: photo, title, chips, ingredient and step lines
export function DetailSkeleton() {
  const { t } = useI18n()
  const line = (w, h = 12, mb = 10) => <div className="skeleton" style={{ width: w, height: h, borderRadius: 999, marginBottom: mb }} />
  return (
    <div role="status" aria-busy="true" aria-label={t('browse.loading')} style={{ background: '#F9F6F0', minHeight: '100vh' }}>
      <div className="mx-auto max-w-2xl px-5 pt-5 pb-10" aria-hidden="true">
        <div className="skeleton" style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, marginBottom: 20 }} />
        {line('28%', 9, 12)}
        {line('82%', 24, 8)}
        {line('56%', 24, 18)}
        <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
          {[78, 92, 70].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 999 }} />)}
        </div>
        {line('34%', 14, 16)}
        {['92%', '78%', '85%', '66%', '88%', '72%'].map((w, i) => <div key={i}>{line(w, 12, 12)}</div>)}
        <div style={{ height: 14 }} />
        {line('26%', 14, 16)}
        {['100%', '94%', '68%', '100%', '90%', '58%'].map((w, i) => <div key={i}>{line(w, 12, 12)}</div>)}
      </div>
    </div>
  )
}
