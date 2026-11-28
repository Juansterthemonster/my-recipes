# Mi Sazón — Handoff v3.0

**Session date:** 2026-03-26
**Commit:** `855b944`
**Branch:** `main` (deployed to Vercel)

---

## What was built in this session

### 1. Recipe scaling (`src/utils/scaleIngredient.js` + `Detail.jsx`)

A pure utility `scaleIngredient(amount, factor)` handles the full range of cooking-notation input:

- Mixed numbers with vulgar fractions (`1½`, `2¾`)
- Slash fractions (`1/2`, `3/4`)
- Mixed slash fractions (`1 1/2`)
- Plain numbers and decimals
- Ranges (`2–3 cups`) — both bounds scaled
- Trailing rest strings (` cups`, ` tbsp`, etc.) preserved

Output rounds to the nearest "cooking fraction" from a lookup table (`⅛ ¼ ⅓ ½ ⅔ ¾`) and falls back to one decimal place if the value is far from any standard fraction. Returns `{ result: string, unscalable: boolean }` — the `unscalable` flag is `true` for strings it can't parse (e.g. "to taste", "a handful").

In `Detail.jsx`:
- `scaledServings` state (init: `recipe.serves`); computed `scaleFactor = scaledServings / recipe.serves`
- `+` / `−` stepper buttons next to the serves count (square, 26×26, SVG stroke icons, dark teal active state)
- "Reset" dotted-underline link appears only when scaling is active
- `IngredientCard` receives `scaleFactor` and applies `scaleIngredient` per ingredient
- `WarnIcon` (amber triangle, 13×13) shown next to unscalable amounts
- `IngRow` accepts `scaledAmount` and `warn` props

### 2. Share public links

**`vercel.json`** (new file in project root):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Required for SPA deep-link routing on Vercel — without it, direct `/recipe/:id` hits return 404.

**`App.jsx`** changes:
- On mount: `window.location.pathname.match(/^\/recipe\/([0-9a-f-]{36})$/i)` sets `shareRecipeId`
- `useEffect` fetches the public recipe + author username from Supabase when `shareRecipeId` is set
- Second `useEffect`: if a logged-in session arrives while a share link is open, redirects to normal Detail view (replaces URL to `/#detail`) so the user doesn't stay in read-only mode
- `exitShareView()` clears share state and replaces URL to `/`
- Render order: loading → reset → share-link → auth → normal app

**`Detail.jsx`** read-only mode:
- New props: `readOnly = false`, `onSignIn`, `onToast`
- When `readOnly`: nav shows wordmark + "Sign in to save" pill button; heart hidden; photo upload hidden; add-to-my-recipes hidden
- `isOwner` is forced false for read-only views
- Share icon (see below) still visible in read-only mode for easy re-sharing

**`handleCopyLink` — 3-tier fallback:**
1. `navigator.share()` — native OS share sheet (works on HTTP mobile); `AbortError` silently ignored
2. `navigator.clipboard.writeText()` — Clipboard API (requires HTTPS / secure context)
3. `textarea + execCommand('copy')` — works on HTTP local network

On clipboard success: `setLinkCopied(true)` (2 s), calls `onToast?.('Recipe link copied')`.

**Share icon (`ShareBtn` component):**
- 44×44 touch target, Android-style share icon (3 circles + 2 connector lines)
- Toggles to checkmark SVG for 2 s after successful clipboard copy
- Color: `#0C3D4E` (dark teal), `borderRadius: 8`
- **Placement:** Inside the recipe card's eyebrow row (same flex container as the meal-type label), `marginRight: -12` so the right edge sits 12px from the card edge — matching the heart button's `right: 12`
- Shown only when `recipe.is_public && !readOnly`
- If no meal-type exists but the recipe is public, the eyebrow row still renders with an empty `<span>` on the left and the share icon on the right

### 3. User profiles (`src/components/Profile.jsx`)

New standalone component, rendered from `App.jsx` when `view === 'profile'`.

Props: `session`, `username`, `onBack`, `onSignOut`, `onUsernameChange`

**Stats section:**
- Two Fraunces `2rem` numerals: public recipe count and "times copied" (how many other users copied your recipes)
- Fetched via `count: 'exact', head: true` queries + `IN` aggregate on `copied_from`

**Change username:**
- Debounced uniqueness check (400 ms) against `profiles` table — works pre-session for anon reads
- `usernameStatus`: `null | 'checking' | 'available' | 'taken' | 'invalid'`
- On save: updates both `profiles` table row AND `auth.user_metadata.username`
- Calls `onUsernameChange(newName)` in `App.jsx` to update nav display without reload

**Change password:**
- Two `PasswordField` components (new password + confirm), eye-toggle on both
- Calls `supabase.auth.updateUser({ password })`
- Green success banner on save; error message on failure

**Sign out:** Outline button, hover lifts border to `#0C3D4E`

**Navigation:** "← Recipes" back button (same style as Detail back button)

**`Browse.jsx`** — dropdown now includes "Profile & settings" option above "Sign out" (separated by `border-bottom`). `onProfile` prop added to `Nav` and `Browse`.

**`App.jsx`** — `openProfile()` pushes `#profile` to history; `handlePop` handles `profile` state; Profile render passes `onUsernameChange` callback.

### 4. UI refinements (Detail.jsx)

- **Share icon placement:** In eyebrow row with meal-type label (not the nav, not the title flex row) — natural vertical alignment with label text, consistent right-edge spacing with heart
- **Stepper buttons:** Square (`borderRadius: 6`), `1.5px solid var(--border-soft)`, SVG stroke icons (`strokeWidth="2"`, `strokeLinecap="round"`, 14×14), active state: dark teal bg + white icon (matching kebab menu item hover)

### 5. WiFi local dev (`vite.config.js`)

```js
server: { host: true }
```
Makes the Vite dev server bind to `0.0.0.0` so it's reachable at the Mac's local IP on any device on the same network (useful for mobile testing).

---

## Files changed

| File | Status | Notes |
|---|---|---|
| `src/App.jsx` | Modified | Share link routing, profile view, onToast prop to Detail |
| `src/components/Detail.jsx` | Modified | Scaling, share, read-only mode, share icon, stepper UI |
| `src/components/Browse.jsx` | Modified | `onProfile` prop, "Profile & settings" dropdown item |
| `src/components/Profile.jsx` | **New** | Full profile page component |
| `src/utils/scaleIngredient.js` | **New** | Pure scaling utility |
| `vercel.json` | **New** | SPA rewrite rule for deep links |
| `vite.config.js` | Modified | `server.host = true` |

---

## Architecture decisions made

**`scaleIngredient` as a pure utility** — kept outside React so it can be unit-tested independently and reused anywhere (e.g. RecipeForm could eventually show a live scaled preview).

**Share link routing via `window.location.pathname`** — not React Router (the app uses manual History API throughout). On mount in `App.jsx`, a regex match checks the path and sets `shareRecipeId`. A redirect effect handles the logged-in case.

**3-tier share fallback** — `navigator.share` first because it's the only method that works reliably on mobile HTTP. The textarea `execCommand` fallback covers local network dev (HTTP) where the Clipboard API is unavailable.

**Share icon in eyebrow row** — tried nav placement (v3 early), then absolute positioning in the header card (two attempts), both had vertical alignment issues. Putting it as a flex sibling of the meal-type label gives exact alignment with zero hacks.

**Profile page as a separate view** — not a modal or drawer, to keep the routing model consistent with the rest of the app (every view gets a `pushState` entry so back navigation works on mobile).

---

## Known issues / watch points

- `cost_usd` column in DB not yet exposed in the UI
- `scaleIngredient` does not handle ingredient amounts that are purely text with no leading number (e.g. "a pinch", "as needed") — returns `unscalable: true` and shows the ⚠ icon; this is the correct behaviour
- Share link read-only view has no skeleton/loading state — there's a brief blank render while the recipe fetches
- Vite/Rolldown build still fails in the Cowork Linux VM; use Node.js bracket-balance check as proxy, real build runs on Mac / Vercel

---

## Suggested v4 ideas (not built)

- Ingredient shopping list — tap ingredients to check them off
- Recipe cost estimate — surface the `cost_usd` field
- Collections / folders — organise recipes beyond the three tabs
- Comment / note on a copied recipe — personal note field alongside the original
- Progressive photo upload — show a thumbnail preview while uploading rather than "Uploading…"
