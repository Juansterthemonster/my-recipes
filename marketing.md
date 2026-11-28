# Mi Sazón — Marketing

> Everything about **getting users and talking about the app**. Anything about **how the app is built or what it does** lives in `CLAUDE.md` — read that for features, versions and architecture, and don't copy it here. Keep this file up to date after every marketing session.

**Read together with:** `CLAUDE.md` (product + code) · `docs/design/STYLEGUIDE_v2.md` (visual design) · `docs/README.md` (index of all docs) · Project doc `claude/APP_STORE_listing.md` (store copy, EN/FR/ES — the source of truth for listings; edit it there, not here).

**Full plan (living doc):** https://claude.ai/artifact/UuPyxAS3CqRFxMsz24S98d

---

## Where things stand (2026-11-28)

- Product is feature-complete for launch: web (misazon.app), Android (Play, v1.4), iOS in App Store submission. Features: see `CLAUDE.md`.
- Users: ~46 accounts as of early November. Check the Admin Dashboard for the current count.
- Problem to solve now is **distribution**, not features.
- Not yet in place: sign-up source tracking, a referral/share prompt, search-indexable recipe pages, any public presence beyond the stores.

## Positioning

**One-liner (working):** Your family's recipes, kept beautifully and shared with one link.

**Primary audience:** home cooks of any background who keep family recipes; people who keep recipes as screenshots and chat messages; relatives digitizing family recipes. **Culture-neutral by design** — the Spanish name resonates with many Hispanic cooks on its own, but we don't target one culture.

**Edge:** free, mobile-first, good-looking; shareable links that preview well; ingredient scaling and paste-to-parse; trilingual by design.

**Messages to test:** "Stop losing recipes in your screenshots" · "Save your family's recipes before they're forgotten" · "Share a recipe with one link".

## Voice and tone (as used in the store listings)

- Warm, plain and personal — "a recipe book that feels like your own kitchen". No hype, no jargon, no emoji in store copy.
- Second person, short sentences, benefit first ("Change the servings and every amount scales for you").
- Listing structure: short all-caps section heads (KEEP EVERY RECIPE / COOK WITH CONFIDENCE / ORGANIZE AND SHARE / YOURS, IN YOUR LANGUAGE), bullets for features, a one-line privacy reassurance ("Your recipes are private unless you choose to make them public").
- **English (Canada)** primary. **French (Canada):** informal *tu*. **Spanish:** neutral Latin American, informal *tú* (listing uses Mexico).
- Brand: wordmark "MI SAZÓN" in teal; use accents (Sazón) in all copy.

## Growth loops already in the product

1. **Share loop (strongest):** recipe link → rich preview in chat → visitor opens, scales, browses Explore without an account → sign-up.
2. **Explore / copy loop:** public recipes, "Add to my recipes", NEW badges.
3. **Samples:** new and signed-out users see two sample recipes (no empty state).

## To build before promoting (product work — log it in `CLAUDE.md` when done)

- [ ] `?src=` tag on share links + sign-up by source in the Admin Dashboard
- [ ] Signed-out Save/Like action sheet (see Project doc `claude/HANDOFF_signed_out_browsing.md`, Step 2)
- [ ] Pre-rendered public recipe pages for search (reuse `api/recipe-preview.js` approach)
- [ ] Store-rating prompt after a positive moment (recipe saved / link shared)
- [ ] Web landing page in EN/FR/ES with the one-liner

## Channels (ranked)

1. **Personal network + WhatsApp** — ask ~20 people to add 3 recipes and share one; offer to digitize a family recipe.
2. **Short video** (Reels / TikTok / Shorts) — 15–30 s screen recordings: paste ingredients, scale a recipe, share a link, "family recipes, saved".
3. **Communities** — r/Cooking, r/MealPrepSunday, regional and cultural food groups (Latin American, Quebec and others), Facebook recipe groups; help first, mention the app where rules allow.
4. **SEO** — pre-rendered public recipes, landing page.
5. **App store optimization** — screenshots with captions; tune keywords after two weeks of data.
6. **Creators / micro-influencers** — later, once stable.

**Skip for now:** paid ads, press, a blog.

## 60-day calendar (starts 2026-11-30)

| Weeks | Focus |
|---|---|
| 1 (Nov 30–Dec 6) | Instrument: source tags, confirm counts, signed-out sheet, landing copy |
| 2 (Dec 7–13) | Seed: message 20 people; record 5 clips |
| 3 (Dec 14–20) | Publish 3 videos; join 3–5 communities; holiday-baking hook |
| 4 (Dec 21–27) | Holiday "share your family's recipe" push; announce iOS if live |
| 5–6 (Dec 28–Jan 10) | "Organize your recipes in 2027"; keep best channel, drop worst |
| 7–8 (Jan 11–24) | Pre-rendered pages, creator outreach, ask for store reviews |

**Decision point (end of week 4):** under 15 new accounts from any channel → revisit positioning before spending.

## Metrics (weekly; targets are starting guesses)

| Metric | Target |
|---|---|
| New accounts per week, by source | 15+ by week 4 |
| Share links opened per week | growing |
| Visitor → account on shared links | 5–10% |
| Users with 3+ recipes after 7 days | 40% |
| Weekly active / accounts | 30%+ |

## Open questions

- Current account count and where those users came from?
- Hours per week available for marketing (plan assumes 4–6)?
- iOS approval status and launch date?
- Any budget (ads, creator gifts)?

## Decisions log

- 2026-11-28 — Audience is culture-neutral (not Latino-first); the Spanish name helps on its own.
- 2026-11-28 — Marketing kept in this file, separate from `CLAUDE.md`; cross-referenced, not duplicated.
