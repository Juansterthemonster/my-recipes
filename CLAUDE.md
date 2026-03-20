# Mi Sazón — Claude Context File

> Keep this file up to date after every session. It's what Claude reads first to get oriented.

---

## What this app is

**Mi Sazón** — a personal digital recipe book. Mobile-first React app with a clean, warm design system. Built over 4 weeks as a personal project; now live on Vercel and connected to Supabase.

- **Live URL:** (add your Vercel URL here)
- **GitHub:** (add your repo URL here)
- **Local dev:** `cd ~/Documents/projects/my-recipes && npm run dev` → http://localhost:5173

---

## Tech stack

| Layer       | Choice                                          |
|-------------|-------------------------------------------------|
| Frontend    | React 19 + Vite 8                               |
| Styling     | Tailwind CSS 3 + CSS custom properties (tokens) |
| Database    | Supabase (Postgres, free tier)                  |
| Fonts       | Fraunces (display) + Plus Jakarta Sans (body/UI)|
| Hosting     | Vercel                                          |

---

## Project structure

```
my-recipes/
  src/
    index.css              CSS tokens (:root), Tailwind imports, number input resets
    App.jsx                View router (browse / detail / add / edit), toast state
    supabase.js            Supabase client init
    components/
      Browse.jsx           Nav, FilterBar, RecipeCard — the list screen
      Detail.jsx           IngRow, IngredientCard, kebab menu — recipe detail view
      RecipeForm.jsx       TimeSection, TimeBox — add/edit form
      TimePicker.jsx       toMins(), fromMins(), formatTime() helpers
      Toast.jsx            Animated bottom-left success toast
  CLAUDE.md               ← this file
  README.md               Public-facing setup docs
```

---

## Design system (source of truth: index.css)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--green-primary` | `#5E7C3F` | Primary CTA, brand, nav bg |
| `--green-dark` | `#2C3D1C` | Headings, primary text |
| `--green-mid` | `#4A6230` | Button hover |
| `--green-light` | `#EBF0E4` | Hover states, chips, pill bg |
| `--green-tint` | `#F4F7F0` | Vegetarian tag bg |
| `--violet-accent` | `#8661C1` | Filter pills selected, pescatarian text |
| `--violet-light` | `#EDE8F7` | Filter pills unselected, pescatarian bg |
| `--amber-accent` | `#FCBA04` | Alerts, callouts |
| `--amber-light` | `#FFF6D6` | Amber tag bg, meal type bg |
| `--cream` | `#F9F6F0` | Page background |
| `--cream-mid` | `#F2EDE4` | Gluten free tag bg, ghost btn bg |
| `--white` | `#FFFFFF` | Card surfaces, vegan tag bg |
| `--text-primary` | `#2C3D1C` | Main text |
| `--text-secondary` | `#6B7A5A` | Body text, secondary labels (AA compliant) |
| `--text-tertiary` | `#9EAB8C` | Decorative only (fails AA alone) |
| `--border` | `#C8C8C8` | Input borders |
| `--border-soft` | `#E3E3E3` | Card borders, dividers |

### Typography
- **Display/headings:** Fraunces, weight 400 (regular + italic)
- **Body/UI/labels:** Plus Jakarta Sans, weights 300/400/500/600

### Radius
| Token | Value | Used for |
|---|---|---|
| `--r-sm` | `8px` | Inputs, small cards |
| `--r-md` | `14px` | Medium cards |
| `--r-lg` | `22px` | Large cards, ingredient/method blocks |
| `--r-full` | `999px` | Buttons, pills, tags |

### Dietary tag colours
| Tag | Background | Text |
|---|---|---|
| Vegetarian | `--green-tint` | `--green-primary` |
| Vegan | `--white` + `--border-soft` border | `--text-secondary` |
| Pescatarian | `--violet-light` | `--violet-accent` |
| Gluten free | `--cream-mid` | `--text-secondary` |
| Meal type | `--amber-light` | `#8A6500` |

---

## Supabase schema

```sql
create table recipes (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  ingredients      jsonb default '[]',   -- [{ name, amount, optional }]
  steps            text[] default '{}',
  active_time_mins integer,              -- prep time in minutes
  total_time_min   integer,              -- total time lower bound
  total_time_max   integer,              -- total time upper bound (optional)
  serves           integer,
  cost_usd         numeric(6,2),         -- not used in UI, kept in DB
  cuisine          text,
  dietary          text[],               -- ['Vegetarian', 'Gluten free', ...]
  meal_type        text[],               -- ['Breakfast', 'Dinner', ...]
  created_at       timestamptz default now()
);
```

---

## Key architecture decisions

- **Styling:** Tailwind for layout/responsive breakpoints. All design tokens in CSS custom properties on `:root`. Inline styles reference tokens (e.g. `color: 'var(--green-primary)'`). This avoids Tailwind specificity fights.
- **Desktop layout:** Full-width nav/filterbar breakout using `lg:w-screen lg:-ml-[calc...]`. Content capped at `max-w-[1400px]`. Recipe grid is 1 col mobile → 2 col tablet → 3 col desktop.
- **Components:** Tightly-coupled subcomponents defined in the same file (e.g. Nav + FilterBar + RecipeCard all in Browse.jsx).
- **Toast:** Mounted in App.jsx above all views. App owns state; passes `onSave(isEdit)` callback down to RecipeForm.
- **Ingredients:** JSONB array `{ name, amount, optional }`. Optional items rendered in their own subsection on Detail.
- **Time fields:** Integer minutes stored. `TimePicker.jsx` exports `toMins(h,m)`, `fromMins(totalMins)`, `formatTime(totalMins)` used everywhere.
- **Emoji:** Deterministic from recipe name (`name.charCodeAt(0) % EMOJIS.length`). No uploads.

---

## Known issues / things to watch

- Time section responsive gap (Total vs Active): flexbox gap has been tricky. If revisiting, use CSS Grid with explicit `column-gap`.
- `mi-sazon/` folder in the projects directory is an empty scaffold — the real code is in `my-recipes/`.

---

## Version history

### v1.0 — MVP (shipped)
- Browse, Detail, Add/Edit screens
- Supabase persistence
- Dietary tags, time filters, search
- Toast notifications
- Deployed to Vercel

### v1.1 — (shipped)
- **Browse cards:** emoji tile → solid `--green-light` block; min-height 80px added
- **Tag hierarchy:** meal_type rendered as muted uppercase eyebrow label above recipe name (Browse + Detail); dietary stays as colour-coded pills; cuisine is detail-only (hidden from cards)
- **Detail header:** amber meal_type pills removed; green-light block replaces emoji; meal_type eyebrow added above `<h1>`
- **Form — Serves:** moved from Ingredients card header → TimeSection (3rd column alongside Prep + Total time)
- **Form — Ingredient rows:** CSS Grid (`1fr 82px 22px`) replaces flex — Name/Amount/Remove columns align consistently across all rows
- **Form — Desktop layout:** two-col grid at `lg` breakpoint — Left: Name+Notes, Cuisine/Dietary/Meal type, Time+Serves · Right: Ingredients, Steps
- **FilterBar → SearchBar:** time filter pills (~15m, ~30m, ~45m) removed; search-only

### v2.0 — Planned
- Auth + user accounts
- Share recipes with others

---

## How to work with Claude (Cowork)

1. **Give Claude folder access** — in Cowork, share your `~/Documents/projects` folder at the start of each session.
2. **Point Claude to this file** — just say "check CLAUDE.md" and Claude will read it to get full context instantly.
3. **Update this file after each session** — add completed features to the version history, note new decisions or known issues.
4. **For UI changes** — paste the component name and describe what you want. Claude can read and edit the actual `.jsx` files directly.
5. **For DB changes** — Claude can write the Supabase SQL migration for you to run in the Supabase SQL editor.
