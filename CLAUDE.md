# Mi Sazón — Claude Context File

> Keep this file up to date after every session. It's what Claude reads first to get oriented.

---

## What this app is

**Mi Sazón** — a personal digital recipe book with social sharing. Mobile-first React app with a warm, editorial design system. Built as a personal project; live on Vercel and connected to Supabase.

- **Live URL:** https://my-recipes-juansterthemonsters-projects.vercel.app (check Vercel dashboard for exact URL)
- **GitHub:** https://github.com/Juansterthemonster/my-recipes
- **Local dev:** `cd ~/Documents/projects/my-recipes && npm run dev` → http://localhost:5173

---

## Tech stack

| Layer       | Choice                                          |
|-------------|-------------------------------------------------|
| Frontend    | React 19 + Vite 8                               |
| Styling     | Tailwind CSS 3 + CSS custom properties (tokens) |
| Database    | Supabase (Postgres, free tier)                  |
| Storage     | Supabase Storage (`recipe-photos` bucket)       |
| Auth        | Supabase Auth (email/password)                  |
| Fonts       | Fraunces (display) + Plus Jakarta Sans (body/UI)|
| Hosting     | Vercel                                          |

---

## Project structure

```
my-recipes/
  src/
    index.css              CSS tokens (:root), Tailwind imports, number input resets
    App.jsx                View router (browse / detail / add / edit / reset), session handling, toast state
    supabase.js            Supabase client init
    components/
      AuthScreen.jsx       Sign in, sign up, forgot password, email verification — all auth modes
      ResetPassword.jsx    Password reset form (shown after clicking email reset link)
      Browse.jsx           Nav, tabs (My recipes / Liked / Explore), masonry grid, empty states
      Detail.jsx           Recipe detail view, photo upload, like/bookmark actions, kebab menu
      RecipeForm.jsx       Add/edit form with photo upload, ingredients, steps, time/serves
      TimePicker.jsx       toMins(), fromMins(), formatTime() helpers
      Toast.jsx            Animated bottom-left success toast
  supabase_migration_username.sql   SQL to create profiles table (run once in Supabase SQL editor)
  CLAUDE.md               ← this file
  STYLEGUIDE_v2.md        Full design system reference (colours, type, icons, components)
  README.md               Public-facing setup docs
```

---

## Design system (source of truth: index.css)

See `STYLEGUIDE_v2.md` for the complete visual reference. Quick token lookup:

### Colours
| Token | Hex | Role |
|---|---|---|
| `--green-primary` | `#5E7C3F` | Primary CTA, brand green |
| `--green-dark` | `#2C3D1C` | Headings, primary text |
| `--green-mid` | `#4A6230` | Button hover |
| `--green-light` | `#EBF0E4` | Hover states, chips, pill bg |
| `--green-tint` | `#F4F7F0` | Vegetarian tag bg |
| `--violet-accent` | `#8661C1` | Filter pills selected, pescatarian text |
| `--violet-light` | `#EDE8F7` | Filter pills unselected, pescatarian bg |
| `--amber-accent` | `#FCBA04` | Dietary selector active state (form) |
| `--amber-light` | `#FFFBEB` | Dietary active bg |
| `--ruby-red` | `#A31621` | Error messages, form validation only |
| `--ruby-light` | `#FDF2F3` | Error block bg |
| `--graphite` | `#2C302E` | Meal type selector active state (form) |
| `--graphite-light` | `#F2F3F2` | Meal type active bg |
| `--cream` | `#F9F6F0` | Page background |
| `--cream-mid` | `#F2EDE4` | Gluten free tag bg, ghost btn bg |
| `--white` | `#FFFFFF` | Card surfaces |
| `--text-primary` | `#2C3D1C` | Main text |
| `--text-secondary` | `#6B7A5A` | Body text, secondary labels |
| `--text-tertiary` | `#9EAB8C` | Decorative only |
| `--border` | `#C8C8C8` | Input borders |
| `--border-soft` | `#E3E3E3` | Card borders, dividers |

**v2 additions (not yet in tokens — used as inline hex):**
- Heart fill: `#D7191D` — liked/favourited state on cards and Detail
- Frosted overlay buttons: `background: rgba(0,0,0,0.24), backdropFilter: blur(12px), borderRadius: 8` (called `blurBtn` in Detail.jsx)

### Typography
- **Display/headings:** Fraunces, weight 400 (regular + italic)
- **Body/UI/labels:** Plus Jakarta Sans, weights 300/400/500/600
- **Wordmark "MI SAZÓN":** Plus Jakarta Sans, weight 800, `0C3D4E`, letterSpacing 0.06em, uppercase
  - Post-login nav: `1.45rem`
  - Auth screens: `1.15rem`

### Radius
| Token | Value | Used for |
|---|---|---|
| `--r-sm` | `8px` | Inputs, small cards |
| `--r-md` | `14px` | Medium cards |
| `--r-lg` | `22px` | Large cards, ingredient/method blocks |
| `--r-full` | `999px` | Buttons, pills, tags |

---

## Supabase schema

### recipes table
```sql
create table recipes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  name             text not null,
  description      text,
  ingredients      jsonb default '[]',   -- [{ name, amount, optional }]
  steps            text[] default '{}',
  active_time_mins integer,              -- prep time in minutes
  total_time_min   integer,              -- total time lower bound
  total_time_max   integer,              -- total time upper bound (optional)
  serves           integer,
  cost_usd         numeric(6,2),
  cuisine          text,
  dietary          text[],               -- ['Vegetarian', 'Gluten free', ...]
  meal_type        text[],               -- ['Breakfast', 'Dinner', ...]
  photo_url        text,                 -- public URL from Supabase Storage
  is_public        boolean default false,
  copied_from      uuid references recipes(id) on delete set null, -- v2: set when "Add to my recipes" copies a public recipe
  created_at       timestamptz default now()
);
```

### likes table (added v2)
```sql
create table public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  recipe_id  uuid references recipes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, recipe_id)
);
-- RLS: authenticated users can INSERT/DELETE their own rows; SELECT own rows
```

### profiles table (added v2 — run `supabase_migration_username.sql`)
```sql
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique not null
               check (char_length(username) between 3 and 20)
               check (username ~ '^[a-zA-Z0-9_-]+$'),
  created_at timestamp with time zone default now()
);
-- RLS: public SELECT (anon reads for uniqueness checks), authenticated INSERT/UPDATE own row
```

### Supabase Storage
- **Bucket:** `recipe-photos` (public)
- **Path pattern:** `{user_id}/{timestamp}.{ext}`
- Upload uses `upsert: true`; public URL retrieved with `getPublicUrl(path)`

---

## Key architecture decisions

### Auth flow (v2)
- Auth state managed entirely in `App.jsx` via `supabase.auth.onAuthStateChange`
- `session` state: `undefined` = loading, `null` = signed out, object = signed in
- `view === 'reset'` branch rendered **before** `!session` guard — because Supabase issues a temporary session with the recovery token
- `PASSWORD_RECOVERY` event: `onAuthStateChange` catches it, sets `view='reset'`, renders `<ResetPassword>`
- `ensureProfile()` runs on every sign-in — idempotent, checks for existing row before inserting

### Username
- Collected at signup, stored in `user_metadata.username`
- Profiles row created on first sign-in via `ensureProfile()` in App.jsx
- Displayed as `@username` in nav dropdown and on public recipe cards
- Public SELECT on profiles table enables uniqueness check before the user has a session

### Photo uploads
- Detail page: hidden `<input type="file">` + `useRef`. Clicking the "Add photo" placeholder triggers it
- RecipeForm: same pattern for add/edit flow
- No server-side processing — direct browser → Supabase Storage upload

### Tabs & public recipes
- Three tabs in Browse: **My recipes** (mine), **Liked** (favourites + liked public), **Explore** (all public)
- Public recipe cards show `by @username` — fetched in a single `IN` query on `profiles` after loading public recipes, then merged into a profileMap

### Likes system (v2 — Option A: separate `likes` table)
- `fetchAll` in Browse runs three parallel queries: myRecipes, pubRecipes, `likes` (for current user)
- Builds a `likedIds` Set from the likes query; stamps `is_liked` onto each public recipe object
- `toggleLike` does optimistic UI update then insert/delete on `likes` table
- **Liked tab** shows `myFavs` (my recipes with `is_favourite: true`) + `likedPublicFiltered` (public recipes I've liked)
- Mixed card rendering in Liked tab: `recipe.user_id === session.user.id ? <MyRecipeCard> : <PublicRecipeCard>`
- Chose separate table over reusing `is_favourite` so liked-but-not-owned recipes stay out of My recipes and to enable future like counts

### "Add to my recipes" (v2)
- Non-owner viewing a public recipe sees "Add to my recipes" button in the nav header (styled identical to Edit button)
- `handleAddToMyRecipes` strips client-side fields (`author_username`, `is_liked`), inserts a copy with `copied_from: recipe.id`, `is_public: false`, `user_id: session.user.id`
- Button transitions to "Added ✓" (muted, disabled) after first click — checked on mount via `.maybeSingle()` query for existing `copied_from` row

### Styling approach
- Tailwind for layout/responsive breakpoints
- All design tokens in CSS custom properties on `:root`
- Inline styles reference tokens (e.g. `color: 'var(--green-primary)'`)
- `blurBtn` constant in Detail.jsx for frosted-glass overlay buttons on photo backgrounds

### Desktop layout
- Full-width nav/filterbar breakout: `lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]`
- Content capped at `max-w-[1400px]`
- Recipe grid: masonry via CSS `columns` (2 col → 3 col → 4 col)

### Error styling
- Ruby Red exclusively — `background: #fdf2f3`, `border: 1px solid #f5baba`, `color: #a31621`

---

## Component notes

### AuthScreen.jsx
Handles 5 modes via `mode` state: `'signin' | 'signup' | 'verify' | 'forgot' | 'forgot-sent'`

- `AuthShell` component: shared nav + centred container used across all modes
- `PasswordField` component: input with right-side eye toggle (show/hide password)
- `EyeIcon` component: two-state SVG (open eye / struck-through eye)
- Username field validates: 3–20 chars, `/^[a-zA-Z0-9_-]+$/`, real-time uniqueness check against profiles table
- "Forgot your password?" link: right-aligned below password field in sign-in mode only
- `handleForgot` always redirects to `forgot-sent` — never reveals whether email exists
- `redirectTo` for password reset: `window.location.origin + '/'`

### ResetPassword.jsx
- Standalone component with same `AuthShell` nav as AuthScreen
- Two `PasswordField`s (new + confirm), validation, calls `supabase.auth.updateUser({ password })`
- On success: calls `onDone()` — user already has active session
- On error: message about expired link

### Browse.jsx
- Nav: wordmark at `1.45rem`, dropdown shows `@username` (falls back to email)
- TABS: `[{key:'mine'}, {key:'favourites', label:'Liked'}, {key:'public', label:'Explore'}]`
- First tab is flush-left (paddingLeft: 0), others `paddingLeft: 16`
- `EmptyMyRecipes`: plus-circle SVG, clickable card that triggers onAdd
- `EmptyLiked`: heart SVG (`#D7191D`), static message
- `EmptyExplore`: compass SVG, static message
- **Card top-row alignment:** All four card variants (MyRecipeCard image/no-image, PublicRecipeCard image/no-image) use `alignItems: 'center'` on their top-row flex container so the prep-time tag and heart icon stay vertically centred
- **PublicRecipeCard:** Has its own heart icon (red fill when liked) wired to `onToggleLike`. No bookmark/add-to-recipes action on the card — that lives in Detail nav
- **Attribution colour:** on-photo cards use `rgba(255,255,255,0.55)` (semi-opaque white); no-photo cards use `var(--text-tertiary)`

### Detail.jsx
- `photoInputRef` + `uploading` state for photo upload without navigating to edit
- No-photo state (owner): `#EFEFED` button, `height: 100px`, camera icon, "Add photo" — with blurBtn heart overlaid
- Heart fill colour: `#D7191D`
- **Owner vs non-owner heart:** Owner sees their bookmark heart; non-owner sees a like heart (`isLiked` / `handleToggleLike`) — both use `blurBtn` style on photo, positioned identically
- **Non-owner nav:** "Add to my recipes" button sits next to the back arrow in the header nav, styled identically to the Edit button (same font, padding, border, radius, colour `#0C3D4E`). Shows "Added ✓" in muted state after clicking
- **`by @username` byline:** Renders below `<h1>` at `0.82rem`, `var(--text-tertiary)` — replaces the old "🌍 Public recipe" violet pill badge
- **On-mount fetch for non-owners:** Parallel `.maybeSingle()` queries for `likes` and `recipes(copied_from)` to seed `isLiked` and `isAdded` state

### RecipeForm.jsx
- Photo remove button: trash SVG icon (not ×)
- **Ingredient focus-scroll fix:** Uses `pendingFocusRef = useRef(null)` + a dependency-free `useEffect` that runs after every render. `addIng` sets `pendingFocusRef.current = ingredients.length` before calling `setIngredients`; the effect fires post-DOM-commit, calls `el.focus({ preventScroll: true })` then `el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`. Replaced the old `setTimeout(..., 30)` hack which was firing before the DOM updated.

### Favicon
- `public/favicon.svg`: dark teal `#0C3D4E` circle, white bold "MS" centered (`dominant-baseline="central"`, `text-anchor="middle"`, `font-size="17"`, `letter-spacing="1"`)
- `public/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`: generated with Python Pillow (RGBA, anti-aliased DejaVuSans-Bold)
- `public/favicon.ico`: multi-size ICO bundle
- `index.html`: full link tag stack for all sizes + `<title>Mi Sazón</title>`

---

## Known issues / things to watch

- `mi-sazon/` folder in the projects directory is an empty scaffold — the real code is in `my-recipes/`
- Vite/Rolldown build (`npx vite build`) fails in the Cowork Linux VM — Rolldown's native binary is incompatible with the VM architecture. The real build runs fine on the user's Mac and on Vercel. Use a Node.js syntax check as a proxy
- **Password reset on localhost:** Supabase blocks the redirect unless `http://localhost:5173` and `http://localhost:5173/` are added in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- `cost_usd` column exists in DB but is not exposed in the UI

---

## Version history

### v1.0 — MVP (shipped)
- Browse, Detail, Add/Edit screens
- Supabase persistence
- Dietary tags, time filters, search
- Toast notifications
- Deployed to Vercel

### v1.1 — Polish (shipped ✓)
- CSS Grid layout: 1 col → 2 col → 3 col
- Emoji tile replaced with solid `--green-light` block
- meal_type as muted uppercase eyebrow label
- FilterBar → SearchBar (time pills removed)
- Ingredient rows: stacked name/amount layout
- Form: two-col desktop layout, dietary single-select (Amber Gold), meal type multi-select (Graphite), Ruby Red errors
- Design tokens: Amber Gold, Ruby Red, Graphite added

### v2.0 — Social + Auth (shipped ✓, commit `6a0a7eb`)

**Auth system**
- Email/password sign-in and sign-up
- Username collection at signup with real-time uniqueness validation
- Email confirmation flow with clean verify screen
- Forgot password flow → reset email → password reset form
- Session management in App.jsx with `supabase.auth.onAuthStateChange`
- `PASSWORD_RECOVERY` event handling for reset link flow
- Profiles table in Supabase (`supabase_migration_username.sql`)

**Browse**
- Three tabs: My recipes / Liked / Explore
- Masonry grid (CSS columns)
- Public recipe cards with `by @username` attribution and like heart
- Profile enrichment via batch `IN` query
- Empty states for all three tabs with on-brand SVG icons
- Heart fill colour changed to `#D7191D`
- Wordmark size increased to `1.45rem`
- Card top-row flex changed to `alignItems: 'center'` (all 4 variants) — prep-time tag and heart vertically centred
- Liked tab renders both own favourites and liked public recipes (mixed card types)

**Likes (new `likes` table — Option A)**
- Separate `likes` table (user_id, recipe_id, unique constraint)
- Three parallel queries in `fetchAll`: myRecipes, pubRecipes, likes → builds `likedIds` Set
- Optimistic toggle on heart icon in Explore + Detail
- Liked tab shows union of `myFavs` and `likedPublicFiltered`

**Detail**
- Direct photo upload from detail view (no edit navigation required)
- "Add photo" placeholder for recipes without a photo (owner only)
- Like/bookmark with frosted-glass overlay buttons on photos; non-owner heart wired to `likes` table
- `by @username` byline (quiet, `var(--text-tertiary)`) replaces "🌍 Public recipe" pill badge
- "Add to my recipes" button in nav header (styled like Edit); copies recipe with `copied_from` field; shows "Added ✓" after use
- Removed extra like/add CTA from the info card section

**RecipeForm**
- Trash icon replaces × on photo remove button
- Ingredient focus-after-add scroll fix: `pendingFocusRef` + `useEffect` replaces `setTimeout` hack

**Favicon**
- New `public/favicon.svg`: dark teal `#0C3D4E` circle with centered white "MS"
- PNG exports: 16×16, 32×32, 48×48 (Python Pillow); `.ico` bundle
- `index.html` title set to "Mi Sazón"; full favicon link tag stack added

**Auth screens**
- Consistent header style matching post-login nav (same bg, wordmark colour)
- Password visibility toggles on all password fields
- Clean email confirmation screen (no emoji)
- Forgot password and forgot-sent states

**New files**
- `AuthScreen.jsx` — complete rewrite (was not present in v1)
- `ResetPassword.jsx` — new
- `supabase_migration_username.sql` — new (profiles table + likes table)
- `STYLEGUIDE_v2.md` — new
- `CLAUDE.md` — new (this file)

---

## How to work with Claude (Cowork)

1. **Give Claude folder access** — in Cowork, share your `~/Documents/projects` folder at the start of each session
2. **Point Claude to this file** — say "check CLAUDE.md" and Claude reads it to get full context instantly
3. **Update this file after each session** — add completed features to version history, note new decisions or known issues
4. **For UI changes** — paste the component name and describe what you want. Claude can read and edit the actual `.jsx` files directly
5. **For DB changes** — Claude can write the Supabase SQL migration for you to run in the Supabase SQL editor
6. **For design reference** — see `STYLEGUIDE_v2.md` for the complete visual system
