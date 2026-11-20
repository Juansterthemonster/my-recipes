// Glass look shared by the round buttons and the pill buttons (Edit, Add, profile, filter, sort…)
export const GLASS = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,255,255,0.4))',
  backdropFilter: 'blur(10px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(10px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 0 0 1px rgba(12,61,78,0.07), 0 3px 10px rgba(12,61,78,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
}

// iOS-style frosted glass for dialogs (spotlight tour card, "what's new" sheet): see-through, strongly
// blurred, bright edge. Fill only — add the border/shadow where it is used.
export const FROST_FILL = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))',
  backdropFilter: 'blur(28px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
}
export const FROST_EDGE = 'rgba(255,255,255,0.75)'
export const FROST_DIM = 'rgba(6,30,39,0.34)'
