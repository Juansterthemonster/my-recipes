# Mi Sazón — Style Guide v2

> Design system reference for the Mi Sazón recipe app. Use this alongside CLAUDE.md when making UI changes. Last updated: v2.0 (auth + social release).

---

## Colour palette

### Brand greens
| Token | Hex | Usage |
|---|---|---|
| `--green-primary` | `#5E7C3F` | Primary buttons, active nav links, brand identity |
| `--green-dark` | `#2C3D1C` | Headings, primary body text (`--text-primary` alias) |
| `--green-mid` | `#4A6230` | Primary button hover state |
| `--green-light` | `#EBF0E4` | Hover states, tag chips, recipe card colour block |
| `--green-tint` | `#F4F7F0` | Vegetarian dietary tag background |

### Accent palette
| Token | Hex | Usage |
|---|---|---|
| `--violet-accent` | `#8661C1` | Selected filter pills, pescatarian tag text |
| `--violet-light` | `#EDE8F7` | Unselected filter pills bg, pescatarian tag bg |
| `--amber-accent` | `#FCBA04` | Dietary selector active border (form only) |
| `--amber-light` | `#FFFBEB` | Dietary selector active background (form only) |
| `--ruby-red` | `#A31621` | Error text — errors and validation only, nothing else |
| `--ruby-light` | `#FDF2F3` | Error block background |
| `--graphite` | `#2C302E` | Meal type selector active border + text (form only) |
| `--graphite-light` | `#F2F3F2` | Meal type selector active background (form only) |

### Surfaces & neutrals
| Token | Hex | Usage |
|---|---|---|
| `--cream` | `#F9F6F0` | Page background (all screens) |
| `--cream-mid` | `#F2EDE4` | Gluten free tag bg, ghost button background |
| `--white` | `#FFFFFF` | Card surfaces, form inputs, vegan tag bg |
| `--border` | `#C8C8C8` | Input field borders |
| `--border-soft` | `#E3E3E3` | Card borders, section dividers |

### Text
| Token | Hex | Notes |
|---|---|---|
| `--text-primary` | `#2C3D1C` | Same as `--green-dark` |
| `--text-secondary` | `#6B7A5A` | Body copy, labels, secondary info — AA accessible |
| `--text-tertiary` | `#9EAB8C` | Decorative accents only — do not use for readable text |

### v2 inline values (not yet in tokens)
| Value | Hex | Usage |
|---|---|---|
| Wordmark colour | `#0C3D4E` | "MI SAZÓN" text in all navbars |
| Heart fill | `#D7191D` | Liked/favourited state on all cards and Detail page |
| Add photo bg | `#EFEFED` | No-photo placeholder background in Detail (owner view) |
| Frosted overlay bg | `rgba(0,0,0,0.24)` | blurBtn — action buttons on top of recipe photos |
| Error inline | `#A03030` | Inline error text inside error blocks (slightly lighter than `--ruby-red`) |
| Error block border | `#F5BABA` | Error block border (softer than `--ruby-red`) |
| Error block bg | `#FFF0F0` | Error block bg in auth screens (slightly warmer than `--ruby-light`) |

---

## Typography

### Typefaces
| Role | Font | Weights | Notes |
|---|---|---|---|
| Display / headings | Fraunces | 400 | Serif, used for recipe names, screen titles, editorial moments |
| Body / UI / labels | Plus Jakarta Sans | 300, 400, 500, 600 | Sans-serif, all UI chrome, labels, body copy |

### Wordmark "MI SAZÓN"
```
font-family: var(--font-body)   /* Plus Jakarta Sans */
font-weight: 800
color: #0C3D4E
letter-spacing: 0.06em
text-transform: uppercase
line-height: 1
```
- Post-login nav: `font-size: 1.45rem`
- Auth screens (sign in / sign up / reset password): `font-size: 1.15rem`

### Screen headings (auth screens)
```
font-family: var(--font-display)   /* Fraunces */
font-weight: 400
font-size: 1.8rem
color: var(--text-primary)
line-height: 1.15
letter-spacing: -0.01em
text-align: center
```

### Sub-headings / supporting copy (auth screens)
```
font-family: var(--font-body)
font-size: 0.9rem
color: var(--text-secondary)
line-height: 1.5
text-align: center
```

### Form labels
```
font-family: var(--font-body)
font-size: 0.68rem
font-weight: 500
letter-spacing: 0.08em
text-transform: uppercase
color: var(--text-secondary)
margin-bottom: 6px
display: block
```

### Recipe card — title
```
font-family: var(--font-display)
font-size: 1.2rem (mobile) / 1rem (desktop)
color: var(--text-primary)
```

### Recipe card — eyebrow (meal type)
```
font-family: var(--font-body)
font-size: 0.65rem
font-weight: 500
letter-spacing: 0.06em
text-transform: uppercase
color: var(--text-secondary)
```

---

## Border radius

| Token | Value | Used for |
|---|---|---|
| `--r-sm` | `8px` | Input fields, small interactive elements |
| `--r-md` | `14px` | Medium cards |
| `--r-lg` | `22px` | Large cards, ingredient blocks, method blocks |
| `--r-full` | `999px` | Buttons, pills, tags |

---

## Spacing & layout

### Page background
All screens: `background: #F9F6F0` (`--cream`)

### Content width
- Mobile: full width with `px-5` padding
- Max width: `max-w-2xl` on most screens, `max-w-[1400px]` on browse/detail

### Full-bleed nav breakout (desktop)
```css
lg:w-screen
lg:-ml-[max(0px,calc((100vw-1400px)/2))]
lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
```

### Nav bar
- Background: `#F9F6F0` (same as page — not a contrasting bar)
- Position: `sticky top-0 z-10`
- Padding: `px-5 py-[14px]`

### Auth screen content container
```
max-width: 420px
margin: 20px auto 0
padding: 0 20px 40px
```

### Auth form card
```
background: var(--white)
border-radius: var(--r-lg)
border: 1px solid var(--border-soft)
padding: 24px
```

---

## Buttons

### Primary button
```
background: var(--green-primary)
color: var(--text-on-dark)   /* white */
border: none
border-radius: var(--r-full)
font-family: var(--font-body)
font-size: 0.9rem
font-weight: 500
padding: 12px 22px
letter-spacing: 0.02em
cursor: pointer
transition: background 180ms
```
Hover: `background: var(--green-mid)`
Disabled: `opacity: 0.6`

### Secondary / ghost button
Background `--cream-mid`, border `--border-soft`, text `--text-secondary`. Used for Cancel actions.

### Link-style button
```
background: none
border: none
padding: 0
font-family: var(--font-body)
font-size: 0.85rem
color: var(--text-secondary)
cursor: pointer
```
Hover: `color: var(--green-primary)` (or teal `#0C3D4E` for auth-screen "forgot password" link)

### Frosted overlay button (blurBtn — Detail page over photos)
```js
const blurBtn = {
  background: 'rgba(0,0,0,0.24)',
  backdropFilter: 'blur(12px)',
  borderRadius: 8,
}
```
Used for heart, bookmark, and other action buttons placed on top of recipe photo backgrounds.

---

## Form inputs

### Text input
```
width: 100%
background: var(--white)
border: 1.5px solid var(--border)
border-radius: 8px
font-family: var(--font-body)
font-size: 1rem
color: var(--text-primary)
padding: 10px 14px
outline: none
transition: border-color 180ms
box-sizing: border-box
```
Focus: `border-color: #999`
Blur: `border-color: var(--border)`

### Password field with eye toggle
- Input has `padding-right: 42px` to clear the toggle button
- Eye toggle button: absolutely positioned, right 12, vertically centred
- Toggle style: `background: none, border: none, cursor: pointer, color: var(--text-secondary)`
- Toggle hover: `color: var(--text-primary)`
- `EyeIcon` component: two SVG states (open eye = visible, struck-through eye = hidden), `strokeWidth: 2`, `strokeLinecap: round`

### Error block
```
background: #FFF0F0
border: 1px solid #F5BABA
color: #A03030
font-size: 0.85rem
padding: 12px 16px
border-radius: 8px
font-family: var(--font-body)
margin-bottom: 16px
```

---

## Tags & pills

### Dietary tags (Detail view — read-only)
| Tag | Background | Text colour |
|---|---|---|
| Vegetarian | `var(--green-tint)` `#F4F7F0` | `var(--green-primary)` `#5E7C3F` |
| Vegan | `var(--white)` + `var(--border-soft)` border | `var(--text-secondary)` |
| Pescatarian | `var(--violet-light)` `#EDE8F7` | `var(--violet-accent)` `#8661C1` |
| Gluten free | `var(--cream-mid)` `#F2EDE4` | `var(--text-secondary)` |

### Form selector active states
| Selector | Type | Active border | Active bg | Active text |
|---|---|---|---|---|
| Dietary | Single-select (radio-style) | `#FCBA04` Amber Gold | `#FFFBEB` | `#7A5C00` |
| Meal type | Multi-select (checkbox-style) | `#2C302E` Graphite | `#F2F3F2` | `#2C302E` |

---

## Icons

All icons are inline SVG. No icon library dependency. Consistent attributes across all icons:

```
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
```

### Icon inventory
| Name | Size | Used in | Description |
|---|---|---|---|
| `HeartIcon` | 18×18 | Browse cards, Detail | Heart outline / filled (`#D7191D` when active) |
| `BookmarkIcon` | 18×18 | Browse cards, Detail | Bookmark outline / filled |
| `ClockIcon` | 14×14 | Browse cards | Clock face for time display |
| `KebabIcon` | 18×18 | Detail header | Three vertical dots overflow menu |
| `EyeIcon` | 18×18 | AuthScreen, ResetPassword | Open/closed eye for password visibility |
| `TrashIcon` | 15×15 | RecipeForm | Trash can for removing photo |
| `CameraIcon` | 22×22 | Detail (no-photo) | Camera body for "Add photo" placeholder |
| `CompassIcon` | 40×40 | Browse empty (Explore) | Compass rose for Explore empty state |
| `PlusCircleIcon` | 40×40 | Browse empty (My recipes) | Plus in circle for Add recipe prompt |

**Heart fill colour:** `#D7191D` — used exclusively for the liked/active heart state. Not `--ruby-red`.

---

## Cards

### Recipe card (Browse — My recipes + Explore)
- Background: `var(--white)`
- Border: `1px solid var(--border-soft)`
- Border radius: `var(--r-lg)` 22px
- Structure (top to bottom): photo or colour block → meal_type eyebrow → recipe name → meta row (time, cuisine)
- Photo: full-width, aspect-ratio based, `object-fit: cover`
- Colour block (no photo): `background: var(--green-light)` `#EBF0E4`, `minHeight: 80px`

### Public recipe card (Explore tab)
- Same as above, plus `by @username` attribution line
- Attribution style: `font-size: 0.7rem`, `color: var(--text-secondary)`, `margin-top: 2px`
- Attribution rendered in both the photo-exists and no-photo branches

---

## Empty states

Three empty state designs, one per Browse tab:

### My recipes (EmptyMyRecipes)
- Icon: Plus-circle SVG, `40×40`, `color: var(--text-tertiary)`
- Heading: "No recipes yet"
- Body: "Everything you cook, in one place. Add your first recipe to get started."
- CTA: the entire card is clickable → triggers `onAdd()`
- Card style: white bg, `--border-soft` border, `--r-lg` radius, `24px` padding, centered, `cursor: pointer`
- Hover: `background: var(--green-light)`, `border-color: var(--green-primary)`

### Liked (EmptyLiked)
- Icon: Heart SVG, `40×40`, `color: #D7191D`
- Heading: "Nothing liked yet"
- Body: "Tap the heart on any recipe to save it here."
- Static — not clickable

### Explore (EmptyExplore)
- Icon: Compass SVG, `40×40`, `color: var(--text-tertiary)`
- Heading: "Nothing to explore yet"
- Body: "Public recipes from all users will appear here."
- Static — not clickable

**Shared empty state card styles:**
```
background: var(--white)
border: 1px solid var(--border-soft)
border-radius: var(--r-lg)
padding: 40px 24px
text-align: center
max-width: 320px
margin: 60px auto 0
```

---

## Auth screens

All auth modes share the `AuthShell` wrapper component:

### AuthShell
- Background: `#F9F6F0` (cream), `min-height: 100vh`
- Nav: sticky top, same background, wordmark at `1.15rem`
- Content container: `max-width: 420px`, `margin: 20px auto 0`, `padding: 0 20px 40px`

### Modes and their headings
| Mode | Heading | Subheading |
|---|---|---|
| Sign in | "Welcome back" | "Sign in to Mi Sazón." |
| Sign up | "Create your account" | "Join Mi Sazón and start saving your recipes." |
| Verify | "Check your inbox" | "We sent a confirmation link to [email]. Click it to activate your account." |
| Forgot password | "Reset your password" | "Enter your email and we'll send you a reset link." |
| Forgot sent | "Check your inbox" | "If an account exists for [email], we've sent a reset link. Check your spam folder if you don't see it." |

### Password reset flow
1. User clicks "Forgot your password?" (right-aligned below password input, sign-in only)
2. Enters email → `handleForgot` calls `supabase.auth.resetPasswordForEmail` with `redirectTo: window.location.origin + '/'`
3. Always transitions to `forgot-sent` (never reveals whether email exists)
4. User clicks link in email → browser redirects to `/` with recovery token
5. `onAuthStateChange` catches `PASSWORD_RECOVERY` event → `setView('reset')` (before `!session` guard)
6. `<ResetPassword>` renders → user enters and confirms new password
7. `supabase.auth.updateUser({ password })` → on success, `onDone()` → home screen

**Localhost requirement:** `http://localhost:5173` and `http://localhost:5173/` must be added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs for reset links to work locally.

---

## Masonry grid (Browse)

```css
/* Mobile */
columns: 2;
gap: 12px;

/* Tablet (md) */
columns: 3;

/* Desktop (lg) */
columns: 4;
```

Cards use `break-inside: avoid` and `margin-bottom: 12px`.

---

## Tabs (Browse)

```
Tab labels: My recipes · Liked · Explore
Font: var(--font-body), 0.85rem, weight 500
Active: color var(--text-primary), border-bottom 2px solid var(--green-primary)
Inactive: color var(--text-secondary)
First tab: padding-left: 0 (flush left)
Other tabs: padding-left: 16px
```

---

## Toast notification

- Position: bottom-left, `fixed`, `z-50`
- Background: `var(--green-dark)` / white text
- Border radius: `var(--r-sm)` 8px
- Padding: `12px 16px`
- Animation: slides up on appear, slides down on hide
- Auto-hides after ~3 seconds
- Triggered by: save recipe, edit recipe

---

## Design principles

1. **Warm, not clinical.** The cream background and green palette feel kitchen-friendly and personal, not app-like.
2. **Typography does the heavy lifting.** Fraunces for recipe names and headings creates editorial warmth. Jakarta Sans keeps UI chrome legible and modern.
3. **Colour is purposeful, not decorative.** Each accent colour has exactly one role. Amber = dietary selection. Graphite = meal type selection. Ruby = errors only. Violet = filter pills. Heart red = liked state.
4. **Frosted glass for layered UI.** When buttons sit on top of photos, use the `blurBtn` pattern (rgba overlay + backdrop-filter) rather than solid backgrounds.
5. **Empty states as invitations.** Each empty state tells you what the tab is for and gives a nudge to fill it. The My Recipes empty state is clickable.
6. **Auth feels like the rest of the app.** Same page colour, same wordmark, same font system — the auth screens are part of Mi Sazón, not a generic login page bolted on.
