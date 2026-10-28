# WealthFlow V5.1 — Security release checklist

**Do not declare the app security-audited or ready for handling strangers' real financial records solely on the basis of local tests.** The owner must validate the live deployment and be transparent about privileged database access.

## Pre-deployment

1. Open existing WealthFlow → Settings → Sync now. Confirm no queued changes. Download a private JSON backup.
2. Confirm Supabase RLS is enabled on `public.finance_records`, and SELECT/INSERT/UPDATE/DELETE policies restrict authenticated users using `auth.uid() = user_id` (the owner's screenshots showed these checks passing on 28 Oct 2026).
3. Confirm anonymous role has no table read permissions and authenticated role lacks TRUNCATE/TRIGGER/REFERENCES (earlier screenshots showed these checks passing).
4. Keep Supabase `sb_secret_`, `service_role`, database password, financial JSON backups, and user data **out of Git**. Review both current files AND the complete Git history before making the repository public.
5. In your current GitHub `wealthflow-app/cloud-config.js`, keep your existing public URL and `sb_publishable_` key unchanged. **The distributed V5.1 ZIP contains placeholders. Do not deploy placeholders.**
6. Before publishing, use the website owner contact, privacy notice, and legal terms appropriate for your audience. Data is not end-to-end encrypted and Supabase administrators can view records.

## Deploy to existing Netlify project

Option A: copy the V5.1 changed files (`app.js`, `index.html`, `styles.css`, `service-worker.js`, `_headers`) into a copy of your **currently working V5** `wealthflow-app` folder, preserving its configured `cloud-config.js`. Redeploy that complete folder to your EXISTING Netlify site.

Option B: add the above changed files to the existing GitHub `wealthflow-app` directory, keeping `cloud-config.js`. If Netlify deploys from GitHub, check the publish directory is `wealthflow-app` and build command is empty.

Never create a new Netlify site or replace the database. No new SQL is needed.

## Live test after deployment

- Sign in as owner: original accounts, transactions, savings, investments, bills remain; cloud status synced.
- New test friend: starts blank; cannot see owner data. Add/test a record. Both accounts remain isolated.
- Sign out while online: user is returned to Welcome. DevTools Network should show a `POST /auth/v1/logout?scope=local` with HTTP 204. Other devices of the same account stay signed in.
- Check Settings: queued changes = 0 BEFORE signing out. The app blocks sign-out if pending edits exist, to avoid data loss.
- Refresh after sign-out: only Welcome appears; never the previous user's dashboard.
- With two tabs of the same account open: signing out in one also clears the other tab's dashboard.
- Confirm “Stay signed in” is OFF by default. When OFF, session tokens should not be in localStorage after sign-in. Test persistent login only on a trusted personal device.
- Reload both computer and phone to receive the new service worker. If UI is stale, hard refresh / fully close and reopen app.
- Check live response headers contain Content-Security-Policy and X-Content-Type-Options. If `_headers` was not deployed or Netlify settings override it, configure headers in Netlify.
- Test on phone, with online/offline sync and backup restore in a separate test account.
- Get a security review of XSS, session management, database rules, dependency risks, authentication flows, and backup handling before a wide public release.

## Known limits

- This is a static SPA storing financial records in a browser cache for offline support; **cache data are not encrypted**.
- Session storage prevents some persistence but does not shield tokens from malicious same-origin JavaScript. Stronger guarantees would require a different architecture (e.g. a backend-for-frontend with HttpOnly secure cookies).
- Revoking Supabase refresh tokens does not immediately invalidate a previously issued access JWT; JWTs work until expiry.
- Server logout cannot be confirmed if the network is unavailable: the app clears the local session and warns the user.
- Account separation checks in browser do not replace tests of direct API access and RLS policy correctness.
