import { useEffect } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   Public Privacy Policy / Terms of Service pages (/privacy and /terms).
   Rendered from main.jsx BEFORE the app, so no sign-in is needed.
   English only. To change the contact address, edit CONTACT_EMAIL below.
   ───────────────────────────────────────────────────────────────────────────── */

const CONTACT_EMAIL = 'juansterthemonster@gmail.com'
const UPDATED = 'October 22, 2026'

const h2 = { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.25rem', color: 'var(--text-primary)', margin: '28px 0 8px' }
const p  = { margin: '0 0 12px', lineHeight: 1.65 }
const ul = { margin: '0 0 12px', paddingLeft: 22, lineHeight: 1.65 }

function Privacy() {
  return (
    <>
      <p style={p}>This Privacy Policy explains what information Mi Sazón (“we”, “us”) collects when you use the Mi Sazón recipe app at misazon.app (the “App”), how we use it, and the choices you have.</p>

      <h2 style={h2}>1. Information we collect</h2>
      <ul style={ul}>
        <li><strong>Account information:</strong> your email address, the username you choose, and your password. Passwords are handled by our authentication provider and stored in hashed form; we never see or store your actual password. If you sign in with Google, we receive your email address and basic profile information from Google.</li>
        <li><strong>Content you add:</strong> recipes (names, ingredients, steps, notes and other details), photos you upload, collections you create, and the recipes you like.</li>
        <li><strong>Preferences and activity:</strong> your chosen language, and the last time you opened the Explore page (used to show a “new recipes” dot).</li>
        <li><strong>Technical data:</strong> like most websites, our hosting and service providers may log your IP address, browser type and device information when you use the App. Your browser stores a sign-in session and some settings on your device.</li>
      </ul>

      <h2 style={h2}>2. How we use your information</h2>
      <ul style={ul}>
        <li>To create your account, sign you in, and provide the App’s features.</li>
        <li>To save and show your recipes, photos, collections and likes.</li>
        <li>To show public recipes, with the author’s username, to other people using the App.</li>
        <li>To send account emails such as email confirmation and password reset.</li>
        <li>To keep the App secure, prevent misuse, and fix problems.</li>
      </ul>
      <p style={p}>We do not sell your personal information, and we do not show advertising.</p>

      <h2 style={h2}>3. What other people can see</h2>
      <p style={p}>Your recipes are private unless you choose to make them public. Public recipes — including the recipe content, photos, your username and the date added — can be seen by anyone, and anyone with the link to a public recipe can open it. Other people can add a public recipe to their own recipes. Your email address is never shown to other users.</p>

      <h2 style={h2}>4. Service providers</h2>
      <p style={p}>We use trusted companies to run the App. They process information only to provide their services to us:</p>
      <ul style={ul}>
        <li><strong>Supabase</strong> — database and authentication (accounts, recipes, collections, likes).</li>
        <li><strong>Cloudflare</strong> — storage and delivery of uploaded photos.</li>
        <li><strong>Vercel</strong> — hosting of the App.</li>
        <li><strong>Google</strong> — optional “Sign in with Google”.</li>
      </ul>
      <p style={p}>These providers may process data in countries other than your own.</p>

      <h2 style={h2}>5. Access by the App owner</h2>
      <p style={p}>The person who runs the App can view account details (username, email address, sign-up date) and counts of recipes, likes and collections for each account, and a list of recently added recipes, in order to operate, support and moderate the App.</p>

      <h2 style={h2}>6. Keeping and deleting your information</h2>
      <p style={p}>We keep your information while your account is active. You can delete your recipes, photos and collections yourself in the App at any time. You can delete your account yourself at any time in the App under Profile &amp; settings → Delete my account. This permanently deletes your profile, recipes (including public ones), collections and likes. Photos you uploaded are removed from our storage within 30 days. If you cannot sign in, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your account and we will delete it within 30 days. We may keep anything we must keep to meet legal obligations, and backups may take a little longer to clear.</p>

      <h2 style={h2}>7. Your choices and rights</h2>
      <p style={p}>You can ask to access, correct or delete the personal information we hold about you by contacting us. Depending on where you live, you may have additional rights under local privacy law.</p>

      <h2 style={h2}>8. Security</h2>
      <p style={p}>We use reasonable measures to protect your information, including encrypted connections and access controls on your data. No online service can be guaranteed to be completely secure.</p>

      <h2 style={h2}>9. Children</h2>
      <p style={p}>The App is not directed to children under 13, and we do not knowingly collect information from them. If you believe a child has given us information, contact us and we will delete it.</p>

      <h2 style={h2}>10. Changes to this policy</h2>
      <p style={p}>We may update this policy from time to time. The “Last updated” date above shows the latest version. Significant changes will be noted in the App.</p>

      <h2 style={h2}>11. Contact</h2>
      <p style={p}>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </>
  )
}

function Terms() {
  return (
    <>
      <p style={p}>These Terms of Service (“Terms”) apply to your use of the Mi Sazón recipe app at misazon.app (the “App”). By creating an account or using the App you agree to these Terms. If you do not agree, please do not use the App.</p>

      <h2 style={h2}>1. Your account</h2>
      <p style={p}>You must give accurate information, keep your sign-in details secure, and are responsible for activity on your account. You must be at least 13 years old to use the App.</p>

      <h2 style={h2}>2. Your content</h2>
      <p style={p}>You keep ownership of the recipes, photos and other content you add (“Your Content”). You give us permission to store, display and deliver Your Content as needed to run the App. If you make a recipe public, you also allow us and other users to view it, and other users to save a copy to their own recipes.</p>
      <p style={p}>You are responsible for Your Content. Only add content you have the right to use and share. Do not make public any recipe text, photo or other material that belongs to someone else without permission.</p>

      <h2 style={h2}>3. Acceptable use</h2>
      <p style={p}>Do not use the App to:</p>
      <ul style={ul}>
        <li>post content that is unlawful, infringing, harassing, hateful, sexually explicit or otherwise harmful;</li>
        <li>impersonate others or misuse other people’s usernames or information;</li>
        <li>attempt to access other users’ private data, disrupt or overload the App, or bypass its security;</li>
        <li>copy or scrape the App or its users’ content in bulk, or use it to send spam.</li>
      </ul>

      <h2 style={h2}>4. Moderation and removal</h2>
      <p style={p}>We may remove content, or suspend or close accounts, that break these Terms or that we reasonably believe are harmful. You may stop using the App and ask for your account to be deleted at any time (see the Privacy Policy).</p>

      <h2 style={h2}>5. Recipes are not professional advice</h2>
      <p style={p}>Recipes, dietary labels (such as vegetarian, vegan or gluten free), cooking times and quantities are provided by users and are for general information only. We do not check them. If you have allergies or medical dietary needs, always check ingredients yourself.</p>

      <h2 style={h2}>6. The service</h2>
      <p style={p}>The App is provided “as is” and “as available”, without warranties of any kind. We may change, pause or end features at any time, and we do not guarantee the App will always be available or error-free. Keep your own copy of any recipe you cannot afford to lose.</p>

      <h2 style={h2}>7. Limitation of liability</h2>
      <p style={p}>To the fullest extent permitted by law, Mi Sazón is not liable for indirect, incidental or consequential damages, or for loss of data or content, arising from your use of the App. Nothing in these Terms limits any rights you have under law that cannot be limited.</p>

      <h2 style={h2}>8. Changes to these Terms</h2>
      <p style={p}>We may update these Terms from time to time. Continuing to use the App after an update means you accept the new Terms.</p>

      <h2 style={h2}>9. Governing law</h2>
      <p style={p}>These Terms are governed by the laws of the Province of Ontario, Canada, and the federal laws of Canada that apply there.</p>

      <h2 style={h2}>10. Contact</h2>
      <p style={p}>Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </>
  )
}

export default function LegalPage({ kind }) {
  const isPrivacy = kind === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service'

  useEffect(() => { document.title = `${title} · Mi Sazón` }, [title])

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 64px' }}>
        <a href="/" style={{ fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0C3D4E', textDecoration: 'none', fontSize: '1.05rem' }}>
          Mi Sazón
        </a>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '2rem', margin: '24px 0 4px', lineHeight: 1.15 }}>{title}</h1>
        <p style={{ ...p, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Last updated: {UPDATED}</p>
        {isPrivacy ? <Privacy /> : <Terms />}
        <p style={{ ...p, marginTop: 32, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/">Back to the app</a>
        </p>
      </div>
    </div>
  )
}
