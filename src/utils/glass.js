// Glass look shared by the round buttons and the pill buttons (Edit, Add, profile, filter, sort…)
export const GLASS = {
  background: 'linear-gradient(145deg, var(--glass-a), var(--glass-b))',
  backdropFilter: 'blur(10px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(10px) saturate(1.5)',
  border: '1px solid var(--glass-edge)',
  boxShadow: '0 0 0 1px rgba(12,61,78,0.07), 0 3px 10px rgba(12,61,78,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
}

// iOS-style frosted glass for dialogs (spotlight tour card, "what's new" sheet): see-through, strongly
// blurred, bright edge. Fill only — add the border/shadow where it is used.
export const FROST_FILL = {
  background: 'var(--frost-fill)',   // flat, so the tour triangle matches the card exactly
  backdropFilter: 'blur(28px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
}
export const FROST_EDGE = 'var(--frost-edge)'
export const FROST_DIM = 'var(--frost-dim)'
