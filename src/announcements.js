/* ─── "What's new" announcements ─────────────────────────────────────────────
   To announce a feature: add an entry here, then add its text to
   src/i18n/locales/announcements.js as  ann.<id>.title  and  ann.<id>.body  (en / fr / es).

   Rules (applied in components/WhatsNew.jsx):
   • Shown at most MAX_VIEWS times per person, at most once per visit (see WhatsNew.jsx),
     and never again after they tap "Got it". Progress is saved in announcement_views.
   • audience 'existing' → only people whose account is OLDER than releasedAt (a new
     account never sees news about something that already existed when they joined).
     audience 'all' → everyone.
   • Only announcements released in the last RECENT_DAYS are considered, so someone
     coming back after months is not buried in old news.
   • releasedAt = when the feature went live (ISO, UTC).
   • icon: 'compass' | 'share'                                                     */

export const MAX_VIEWS = 2
export const RECENT_DAYS = 60

export const ANNOUNCEMENTS = [
  {
    id: 'explore-without-account',
    releasedAt: '2026-11-20T18:00:00Z',
    audience: 'existing',
    icon: 'compass',
  },
]
