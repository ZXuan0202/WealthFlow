# WealthFlow V5 — Personal Accounts Edition

This is a responsive, installable personal finance web app. It includes all earlier features (accounts, transactions, wealth charts, investments, SPayLater, savings goals, custom categories, subscription and bill reminders) plus **a shared sign-in page** so multiple people can use **one website link with independent private accounts**.

## What is different in V5?

- Visitors see **Sign in** and **Create account**, not the owner's financial dashboard.
- Each Supabase Auth user sees only their own rows in `public.finance_records` under Row Level Security (RLS). The SQL setup included with this project is scoped to each authenticated user.
- New accounts start blank, even if that browser previously stored data from another user.
- Local offline browser caches and pending sync queues are now keyed by the signed-in Supabase user ID. Signing out removes that user's local cache after all queued changes are synced.
- **No friend needs to enter a Supabase URL or API key**. The site owner sets the public cloud configuration once, before deploying.
- The same existing WealthFlow Netlify project and Supabase table continue to work. No new SQL is needed if your V4 Supabase database is already configured with the included RLS policies and appropriate authenticated grants.

## Share-ready setup — owner only

Read **SHARE-SETUP.txt** for the exact Windows/Supabase/Netlify steps. The owner must edit `cloud-config.js` with the Supabase *project URL* and *public publishable key*. They are designed to be used in a browser and will be visible to website visitors. Never embed a Supabase secret / service_role key.

**If you do not fill in `cloud-config.js`, visitors will see an owner setup message rather than the sign-in page.** On the owner's existing browser, the old local connection may temporarily work, but it does **not** configure the website for friends.

The public website link stays the same when deployed to your existing Netlify site. Set that domain in Supabase Authentication → URL Configuration, and enable new email/password signups. Email confirmation is recommended. A forgotten-password flow is included.

### Existing data safety

Before replacing V4, click **Settings → Sync now**, check Cloud synced and 0 queued changes, then **Download backup** to a private location. Do not put financial JSON files into the published website folder. On the updated site, sign in using your **original WealthFlow email**, and confirm your previous bank accounts appear. Existing Supabase finance records are not modified by uploading the new static website files.

If older browser-local data is present, V5 never automatically merges it into a different person's cloud account. Existing cloud records are read after login and replace local display. If you have records that never reached Supabase, restore a JSON backup deliberately after checking the correct account, rather than creating a new one.

## How each friend uses it

1. Open the shared Netlify URL.
2. Click **Create account**.
3. Enter their own email and password, and verify the email if asked.
4. Return to the website and **Sign in**.
5. Start with empty accounts, transactions, bills and goals; add their own data.
6. Use the same email on phone and computer to sync their records.

**Never share your own financial login credentials.** A friend can sign in using their own account on the shared website. Do not share a device with your own session left unlocked.

## Data isolation & important limitations

- Database row privacy depends on proper Supabase Auth, table grants and RLS policies being configured and not weakened. `SECURITY-CHECK.sql` contains read-only policy-check queries.
- Authentication tokens and optional offline data are stored in browser storage; this is **not end-to-end encryption**. On public/shared computers, always sign out; downloaded backups must be stored privately.
- The web app supports manual finance entry. It does not link to banks, initiate payments or generate automatic mobile push notifications.
- Offline changes are queued and sync when online. Always wait for **0 queued changes** before signing out or updating.
- Both Netlify and Supabase have usage limits, and Supabase free email delivery may be rate limited. The owner controls project access, uptime and costs.
- Changing a website file does not prove a live cloud security rule is in effect. Use a separate test user, and verify that the test user cannot see the owner's bank accounts before inviting real friends.

## Files

- `index.html`: app entry page
- `styles.css`: responsive presentation
- `app.js`: manual ledger, bills, auth, persistence, charts, syncing
- `cloud-config.js`: owner-provided Supabase **public** settings (required for sharing)
- `database.sql`: optional idempotent reference setup / security policies for new projects
- `SECURITY-CHECK.sql`: read-only query to check your existing database policies and grants
- `SHARE-SETUP.txt`: step-by-step existing-site upgrade and friend onboarding
- `manifest.webmanifest`, `service-worker.js`, `icons/`: installable phone web app

## Testing

V5 was tested in a local Chromium browser with **mocked Supabase requests**, including a legacy owner data store, new friend signup/sign-in, a blank friend account, creating a friend-owned account, logout cache cleanup, owner login, and mobile/desktop sign-in layouts. JavaScript syntax checks passed. **Live Supabase account creation and actual Netlify deployment were not tested** because your live public key and project admin access were not available in this environment.
