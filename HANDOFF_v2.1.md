# Mi Sazón — v2.1 Handoff

## What was built in v2.1

A full social recipe-sharing layer on top of the personal v1 recipe book.

**New features:**
- Auth (Supabase Auth + profiles table for usernames)
- Three-tab Browse: My Recipes / Liked / Explore (public recipes)
- Public / private toggle on recipes
- Like public recipes (saved to Liked tab)
- Add a public recipe to My Recipes (copied with `copied_from` reference)
- "Already saved" indicator on Detail when recipe is already in My Recipes
- Modification notice on Detail when viewing a recipe copied from another user
- Kebab menu on Detail: Edit / Delete / shows `@username`
- Filter system: Dietary · Meal Type · Time (horizontally scrolling pills, collapsible)
- Android/iOS back-button navigation (History API + URL hashes)
- Scroll-to-top on every view transition

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 (Vite) |
| Styling | Tailwind CSS + CSS custom properties (`var(--*)`) |
| Database | Supabase (Postgres + Auth + Storage) |
| Fonts | Fraunces (display) + Plus Jakarta Sans (body) |
| Hosting | Vercel (not yet deployed as of this handoff) |

---

## Supabase schema

```sql
-- Recipes
create table recipes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users,
  name             text not null,
  description      text,
  ingredients      jsonb default '[]',   -- [{ name, amount, optional }]
  steps            text[] default '{}',
  active_time_mins integer,
  total_time_min   integer,
  total_time_max   integer,
  serves           integer,
  cuisine          text,
  dietary          text[],               -- ['Vegetarian','Vegan','Pescatarian','Gluten free','Keto']
  meal_type        text[],               -- ['Breakfast','Lunch','Dinner','Dessert','Snack','Side']
  photo_url        text,
  is_public        boolean default false,
  copied_from      uuid references recipes(id),
  created_at       timestamptz default now()
);

-- User profiles (username)
create table profiles (
  id       uuid primary key references auth.users,
  username text unique
);

-- Likes (public recipes liked by a user)
create table likes (
  user_id   uuid references auth.users,
  recipe_id uuid references recipes(id),
  primary key (user_id, recipe_id)
);
```

---

## File structure

```
src/
  index.css          Design tokens, masonry grid, pill-row scrollbar
  App.jsx            Central router; owns view/toast/activeTab/username state
  supabase.js        Supabase client init
  components/
    Browse.jsx       Nav, SearchBar, FilterBar, TabBar, recipe cards, empty states
    Detail.jsx       Full recipe view, kebab menu, add-to-my-recipes, modification notice
    RecipeForm.jsx   Add / edit form (cuisine, dietary, meal type, time, ingredients, steps)
    TimePicker.jsx   toMins(), fromMins(), formatTime() helpers
    Toast.jsx        Animated success toast (bottom-left)
```

---

## Navigation (History API)

All view transitions use `pushState` + URL hashes so Android/iOS back buttons work:

```js
// In App.jsx
window.history.replaceState({ view: 'browse', tab: 'mine' }, '', '#mine')  // on mount
window.history.pushState({ view: 'browse', tab }, '', `#${tab}`)           // tab switch
window.history.pushState({ view: 'detail', recipe }, '', '#detail')        // open detail
window.history.pushState({ view: 'edit',   recipe }, '', '#edit')          // open edit
window.history.pushState({ view: 'add'            }, '', '#add')           // open add
window.addEventListener('popstate', handlePop)                              // handles back
useEffect(() => { window.scrollTo(0, 0) }, [view])                        // scroll reset
```

---

## Design tokens (index.css :root)

```
--green-primary:  #0C3D4E   Dark Teal — primary brand, buttons, active states
--green-dark:     #061E27   Pressed states
--green-mid:      #1A5E75   Hover on dark teal
--green-light:    #E3EED6   Decorative fills
--green-tint:     #F0F5E8   Tag backgrounds
--violet-accent:  #3E92BF   Blue Bell — secondary accent, public badges
--violet-light:   #D4EBF6   Blue Bell light
--cream:          #FFFDEB   Ivory — page background
--cream-mid:      #F5EFC0   Warm straw — secondary surfaces
--text-primary:   #0C3D4E
--text-secondary: #3D7080
--text-tertiary:  #7DAAB6
--border-soft:    #E0E8EA
--r-full: 999px   (pills)
--r-lg:   14px    (cards)
```

Active/selected pill style: `background: #0C3D4E`, `color: #F9F6F0` (dark teal + cream text).

---

## Key component patterns

**Masonry grid** — CSS columns (NOT grid) with `display: inline-block` on items:
- CSS columns gives true masonry packing (no row-height gaps)
- `inline-block` + `vertical-align: top` fixes iOS Safari phantom top-gap bug
- Never switch this to CSS Grid — it causes random gaps on iOS Safari

**Sticky layout stack:**
- Nav: `position: sticky; top: 0; z-index: 10`
- TabBar: `position: sticky; top: 62px; z-index: 9` (62 = nav height)

**Filter constants (must match RecipeForm exactly):**
```js
DIETARY_FILTERS   = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten free', 'Keto']
MEAL_TYPE_FILTERS = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side']
TIME_FILTERS      = [{ label: 'Under 15 mins', maxMins: 15 }, { label: 'Under 30 mins', maxMins: 30 }, { label: 'Under 1 h', maxMins: 60 }]
```

**Filter logic:** Dietary = AND (all selected tags must match), Meal type = OR, Time = broadest selected range.

**Pill rows (FilterBar):** `flexWrap: nowrap`, `overflowX: auto`, `marginRight: -20px` (bleeds to screen edge), hidden scrollbar via `.pill-row` CSS class.

**Pill heights:**
- Filter pills (PillGroup): `padding: 8px 14px`, `fontSize: 0.78rem`
- Time pill (PrepTimePill on cards): `padding: 8px 12px`, `fontSize: 0.72rem`
- Dietary tags (Detail): `padding: 6px 13px`, `fontSize: 0.72rem`

**Username display:** fetched from `profiles` table in `App.jsx` via `ensureProfileAndLoadUsername()`, passed down as `username` prop. Never read from `session.user_metadata` in components.

**Copied recipe flow:**
- `copied_from` UUID stored on the new recipe row
- Detail fetches original author via two Supabase lookups when `recipe.copied_from` is set
- Shows italic attribution under recipe name: `"Original recipe by @{author} edited by you"`

---

## What's left for v3 (post-publish)

- Deploy to Vercel
- Auth improvements / user accounts polish
- Share recipes with others (direct share link)
- CSS Grid masonry (native) when browser support is sufficient
