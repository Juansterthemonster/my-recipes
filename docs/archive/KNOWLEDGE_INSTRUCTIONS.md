## Sazón — Project Knowledge (v2.1)

**App:** Personal + social recipe book. React (Vite) + Tailwind CSS + Supabase + Vercel.
**Fonts:** Fraunces (display/headings) · Plus Jakarta Sans (body/UI).

---

### Tech stack
React 18 (Vite) · Tailwind CSS + CSS custom properties · Supabase (Postgres + Auth + Storage) · Vercel

---

### Supabase schema

```sql
recipes (id uuid pk, user_id uuid, name text, description text,
  ingredients jsonb,   -- [{ name, amount, optional }]
  steps text[],
  active_time_mins int, total_time_min int, total_time_max int,
  serves int, cuisine text,
  dietary text[],      -- ['Vegetarian','Vegan','Pescatarian','Gluten free','Keto']
  meal_type text[],    -- ['Breakfast','Lunch','Dinner','Dessert','Snack','Side']
  photo_url text, is_public bool, copied_from uuid, created_at timestamptz)

profiles (id uuid pk → auth.users, username text unique)

likes (user_id uuid, recipe_id uuid, primary key (user_id, recipe_id))
```

---

### File structure

```
src/
  index.css        Design tokens (:root), masonry grid, pill-row scrollbar
  App.jsx          Router; owns: view, selectedRecipe, toast, activeTab, username
  supabase.js      Supabase client
  components/
    Browse.jsx     Nav, SearchBar, FilterBar (PillGroup), TabBar, MyRecipeCard, PublicRecipeCard
    Detail.jsx     Recipe detail, kebab menu, add-to-my-recipes, modification notice
    RecipeForm.jsx Add/edit form
    TimePicker.jsx toMins() fromMins() formatTime()
    Toast.jsx      Animated bottom-left toast
```

---

### Design tokens (index.css :root)

```
--green-primary / --text-primary:  #0C3D4E   Dark Teal
--green-dark:                      #061E27
--green-mid:                       #1A5E75   Hover on dark teal
--green-light:                     #E3EED6
--green-tint:                      #F0F5E8
--violet-accent:                   #3E92BF   Blue Bell (secondary accent)
--violet-light:                    #D4EBF6
--cream:                           #FFFDEB   Ivory (page bg)
--cream-mid:                       #F5EFC0
--text-secondary:                  #3D7080
--text-tertiary:                   #7DAAB6
--border-soft:                     #E0E8EA
--r-full: 999px · --r-lg: 14px
```

Active pill: `background #0C3D4E`, `color #F9F6F0`.
Filter icon button (active): same dark teal fill.

---

### Navigation (App.jsx — History API)

Every view transition uses `pushState` + a URL hash so Android/iOS back buttons register a real history entry.

```js
// mount
history.replaceState({ view:'browse', tab:'mine' }, '', '#mine')
// tab switch
history.pushState({ view:'browse', tab }, '', `#${tab}`)
// open detail / edit / add
history.pushState({ view:'detail', recipe }, '', '#detail')
history.pushState({ view:'edit',   recipe }, '', '#edit')
history.pushState({ view:'add'            }, '', '#add')
// back
window.addEventListener('popstate', handlePop)
// scroll reset on every view change
useEffect(() => { window.scrollTo(0,0) }, [view])
```

`username` is fetched from `profiles` table in App.jsx and passed down as prop — never read from `session.user_metadata`.

---

### Masonry grid (index.css)

Uses **CSS columns** (NOT CSS Grid). CSS Grid causes row-height gaps on iOS Safari with mixed-height cards.

```css
.masonry-grid { column-count: 2; column-gap: 0.75rem; }
/* 3 cols ≥768px, 4 cols ≥1024px */

.masonry-item {
  display: inline-block;   /* fixes iOS Safari phantom top-gap bug */
  vertical-align: top;
  width: 100%; margin-bottom: 0.75rem;
  break-inside: avoid; -webkit-column-break-inside: avoid;
}
```

---

### Filter system (Browse.jsx)

```js
DIETARY_FILTERS   = ['Vegetarian','Vegan','Pescatarian','Gluten free','Keto']
MEAL_TYPE_FILTERS = ['Breakfast','Lunch','Dinner','Dessert','Snack','Side']
TIME_FILTERS      = [15, 30, 60 mins]
```

Logic: Dietary = AND, Meal type = OR, Time = broadest selected range.

Pill row: `flexWrap:nowrap`, `overflowX:auto`, `marginRight:-20px` (bleeds to screen edge on mobile), hidden scrollbar via `.pill-row` class.

---

### Pill / tag heights

| Component | Padding |
|---|---|
| Filter pills (PillGroup) | `8px 14px` · `0.78rem` |
| Time pill (PrepTimePill on cards) | `8px 12px` · `0.72rem` |
| Dietary tags (Detail.jsx `pill` const) | `6px 13px` · `0.72rem` |

---

### Sticky layout stack

Nav: `position:sticky; top:0; z-index:10` (height ≈ 62px).
TabBar: `position:sticky; top:62px; z-index:9`.

---

### Copied recipe flow

When a user adds a public recipe to My Recipes, the new row stores `copied_from = original.id`. Detail.jsx fetches the original author from `profiles` when `copied_from` is set and shows: *"Original recipe by @{author} edited by you"* — italic, `text-secondary`, directly under the recipe title.

---

### Card variants (Browse.jsx)

**Photo card:** `position:relative; aspectRatio:2/3` — dark overlay, all-white text.
**No-photo card:** content-height, white bg, dark teal text, flex-column with `flex:1 minHeight:28px` spacer.
Both: `PrepTimePill` (clock icon + time) top-left, heart/like button top-right.

---

### Remaining for v3

- Deploy to Vercel
- User accounts polish
- Share recipes (direct link)
