# Docs index

Root keeps only the files tools and people open first. **Handoffs between web, Android and iOS live in the Claude Project "Mi Sazon app" — not in this repo.** That keeps both codebases separate (an iOS session never writes into the web repo) while still letting them leave each other notes. One home per doc: don't copy them here.

## In this repo

| File | What |
|---|---|
| `/CLAUDE.md` | The app: product, code, architecture, versions. Claude reads it first. Update after every session |
| `/marketing.md` | Marketing: positioning, voice, channels, calendar, metrics. Separate from CLAUDE.md; they point at each other, never duplicate |
| `/README.md` | Public setup docs |
| `docs/design/STYLEGUIDE_v2.md` | Design system (tokens in `src/index.css` are the real source) |
| `docs/handoffs/` | Old repo-era handoffs (v3.0, collections) — history only |
| `docs/archive/` | Superseded files |

## In the Claude Project "Mi Sazon app" (the single home for these)

Ask Claude to read them by name (`project_read`):

- **iOS:** `claude/HANDOFF_ios_planning.md` (main plan), `..._ios_release_1.2_status.md`, `..._ios_ipad_plan.md`, `..._ios_iphone_duo.md`, `..._ios_release_1.2_progress.md`, `..._ios_platform_tracking.md`, `..._ios_localization.md`, `..._ios_report_block.md`
- **Web:** `claude/HANDOFF_signed_out_samples.md`, `..._signed_out_browsing.md`, `..._photo_optimizer.md`, `..._web_changes_2026-11-22.md`, `..._web_changes_2026-11-21.md`, `..._ios_web_changes_2026-11-20.md`
- **Android:** `claude/HANDOFF_android_app_links.md`
- **Store:** `claude/APP_STORE_listing.md` (listing copy EN/FR/ES, privacy answers, review notes — source of truth for store text)
- **Older:** `claude/HANDOFF_v4_planning.md`

## Conventions

- Cross-platform handoff (something web, Android or iOS must know about the others) → write it to the Project as `claude/HANDOFF_<topic>.md`.
- Repo-only facts → `CLAUDE.md` (app) or `marketing.md` (marketing).
- Replaced file → move to `docs/archive/`, don't leave it in the root.
- Link, don't copy.
