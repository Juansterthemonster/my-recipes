# Mi Sazón — Collections Feature Handoff

## Status: All 4 chunks shipped ✅

All collections functionality is complete and wired end-to-end. The next session
should focus on **UI polish / visual adjustments** — the feature works but hasn't
been visually tuned yet.

---

## What was built

### Chunk 1 — My Collections tab (Browse.jsx)

- Added `My Collections` as the 4th tab between Liked and Explore
  — tab order is now: My Recipes → Liked → **My Collections** → Explore
- `CollectionPhotoGrid` — 2×2 CSS grid of up to 4 recipe photos; empty cells
  and zero-photo collections fall back to solid `--green-primary` teal
- `CollectionCard` — card with photo collage on top + name + recipe count below;
  subtle translateY lift on hover
- `EmptyCollections` — dashed-border CTA (matches My Recipes empty state pattern)
- `fetchAll` extended: 4th parallel query on `collections`, followed by a single
  `collection_recipes → recipes(id, photo_url)` join for counts + photos —
  no N+1 queries

### Chunk 2 — Collection detail view (new CollectionDetail.jsx)

- New view: sticky nav with back arrow → "Collections" label, collection name as
  `<h1>` (Fraunces display), recipe count subtitle
- Fetches member recipes via `collection_recipes → recipes(*)` join, then a
  parallel batch for `likes` + `profiles` on any public-recipe members
- Renders the same masonry grid as Browse:
  `MyRecipeCard` for owned recipes, `PublicRecipeCard` for public ones
- Optimistic favourite/like toggles within the view
- Empty state if a collection has no recipes yet
- New `RecipeCards.jsx` — extracts shared card components (`MyRecipeCard`,
  `PublicRecipeCard`, `HeartIcon`, `ClockIcon`, `PrepTimePill`, `blurBtn`,
  `fmtTime`, `OVERLAY_IMAGE`) so both Browse and CollectionDetail can import them

### Chunk 3 — "Add to collection" in Detail.jsx

- New `CollectionSheet` component (defined in Detail.jsx above the Detail export)
- Triggered from the **first item in the owner kebab menu**: "Add to collection"
- Bottom sheet with drag handle, header, scrollable list, footer Save button
- On open: parallel fetch of user's collections + this recipe's existing
  memberships; checkboxes pre-populated accordingly
- **＋ New collection** at the top of the list — inline input (Enter to create,
  Escape to cancel); new collection auto-checked on creation
- Custom green checkboxes; Save button only activates when there are actual
  changes (diffs `checkedIds` vs `originalIds`)
- Save: `Promise.all` of inserts + deletes, then closes sheet + fires toast

### Chunk 4 — Collection management (Browse.jsx)

- `CollectionNameModal` — centred dialog, reused for create and rename;
  Enter-to-save, Escape-to-close, backdrop click closes
- `CollectionCard` updated with a **frosted-glass kebab button** (top-right of
  photo area); dropdown has Rename and Delete; both items `stopPropagation` so
  they don't open the collection
- Three handlers in Browse:
  - `handleCreateCollection` — inserts to Supabase, prepends card with
    `{ recipe_count: 0, photos: [] }` to local state immediately
  - `handleRenameCollection` — updates Supabase, patches name in local state
  - `handleDeleteCollection` — `window.confirm`, then delete (`on delete cascade`
    handles `collection_recipes` rows automatically)
- **＋ New collection** outline button (top-right of grid, visible when collections
  exist) as a persistent shortcut without going through the empty state
- Empty state CTA now opens the create modal (was mistakenly wired to `onAdd`)

---

## Files changed

| File | Change |
|------|--------|
| `src/components/Browse.jsx` | Tab added, CollectionPhotoGrid, CollectionCard (with kebab), CollectionNameModal, EmptyCollections, collections state + fetchAll extension, CRUD handlers |
| `src/components/Detail.jsx` | CollectionSheet component, `sheetOpen` state, "Add to collection" kebab item |
| `src/components/CollectionDetail.jsx` | **New file** — collection detail view |
| `src/components/RecipeCards.jsx` | **New file** — exported shared card components |
| `src/App.jsx` | `CollectionDetail` import, `selectedCollection` state, `openCollection()`, `handlePop` branch for `view === 'collection'`, `onSelectCollection` prop on Browse, `<CollectionDetail>` render block |

---

## Architecture notes

- `collection_recipes` has no `user_id` — ownership is always verified by joining
  back to `collections`. This was intentional (see original schema decisions).
- Liked public recipes can be in collections — `collection_recipes` stores only
  `recipe_id`, ownership doesn't matter at insert time.
- Browse.jsx still contains its own local copies of `MyRecipeCard` /
  `PublicRecipeCard`. `RecipeCards.jsx` was created as a parallel export so
  `CollectionDetail` could import them without touching Browse's internals.
  These are identical — a future cleanup could remove the Browse copies and
  import from `RecipeCards.jsx` instead.

---

## Known issues / things to watch

- **UI hasn't been visually tuned** — the feature is functional but sizes,
  spacing, and edge-case states need a review pass. That's the intended work
  for the next session.
- The `CollectionSheet` in Detail.jsx currently only appears for **owners**
  (it's in the owner kebab). Non-owners viewing a liked public recipe can't add
  it to a collection from Detail — they'd have to go through Browse. Adding a
  "Add to collection" affordance for non-owners is a potential follow-up.
- When a collection card's photo collage updates (e.g. a photo is added to a
  member recipe), it won't refresh until the user reloads Browse. No real-time
  sync — consistent with how the rest of the app works.
- `CollectionDetail` has no search or filter bar — shows all member recipes
  as-is. Could be added later if collections get large.

---

## What's next (suggested)

- UI adjustments pass — spacing, font sizes, card proportions, mobile feel
- Consider adding "Add to collection" for non-owners in Detail.jsx
- Update CLAUDE.md to reflect the new components and v4.0 version history
