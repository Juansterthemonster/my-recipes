// Shared between WhatsNew (the real sheet) and the admin dashboard's announcement tester:
// when the "what's new" check last ran. The admin tester resets it so going back to the
// recipe list re-checks straight away.
export const whatsNewState = { lastCheckAt: 0 }
