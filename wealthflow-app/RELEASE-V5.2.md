# WealthFlow V5.2 Beta — release and validation

## Changes

- A local revision check prevents an older cloud read from replacing edits made while that read was in progress, including edits already acknowledged by the server.
- Sync callers share one operation per signed-in identity. Queue writers are also shared, preventing the same pending operation from being sent twice by concurrent callers.
- Reads use stable ID ordering, limit/offset pagination and exact Content-Range counts. Smaller server page limits are supported. Missing counts, duplicate rows, changing totals and incomplete pages leave the saved copy intact and report a sync issue.
- Failed writes keep their pending operations. Late reads, writes and 401 responses from a previous identity cannot replace the next identity's view or retry under its token.
- Backup restoration uses the same edit/sync path and checks that the account did not change while the file was being read.
- The sign-in page identifies the app as a beta and links to privacy information. The service-worker cache version is updated.

## Local validation

From the repository root, with Node.js 24:

```sh
node --check wealthflow-app/app.js
node --check wealthflow-app/service-worker.js
node --check wealthflow-app/cloud-config.js
node --test tests/*.test.cjs
```

The suite uses mocked browser storage and HTTP requests. It does not contact Supabase or establish that production RLS is configured. Browser visual validation is still required; the local attempt could not run because Chromium is not installed in this environment.

## Deploy the reviewed change

1. On the existing site, sync all pending changes and download a private backup. Confirm the correct owner account is signed in.
2. Deploy the complete `wealthflow-app` folder to the existing Netlify project. Keep the publish directory `wealthflow-app`, preserve the configured public `cloud-config.js`, and keep `_headers` and the existing icons. This update needs no SQL migration or new Supabase project.
3. Ensure `privacy.html` is included. Hard-refresh or close/reopen the installed app to load the V5.2 service worker. Check that the sign-in badge reads **V5.2 · Beta**.
4. Validate in a separate browser profile and on a phone before inviting additional testers.

## Live validation with disposable accounts

Use two separate test users, A and B, and fictional financial records. Keep tokens, screenshots containing private information and exports out of GitHub Issues.

1. Run `SECURITY-CHECK.sql` privately in Supabase. Confirm RLS is enabled, anonymous table access is absent, and **every** policy and grant preserves per-user access. An extra permissive policy can undermine otherwise correct policies.
2. Sign in as A, create a test account and transaction, and wait for **Cloud synced** and zero queued changes. B must start empty; A must not see B's records.
3. Test the REST API directly with each user's token. B's SELECT targeting A's test-record ID must return no rows. An INSERT with A's `user_id` under B's token must fail. UPDATE and DELETE targeting A's test record must affect zero rows or fail; verify from A that its test record remains unchanged. Repeat in the other direction. Use disposable fixtures only.
4. Confirm signup, email confirmation and password reset reach the intended test inbox, and check the allowed redirect URLs and authentication rate limits in Supabase.
5. In a test account, load more than 1,000 fictional records. Verify all pages are requested, every record appears, totals match the fixture and exports include the complete data set. Remove these fixtures afterward.
6. In browser network tools, slow a cloud read, save a new entry during it, and verify the entry remains visible and synced. Disconnect the network, add another entry, reconnect and confirm it is saved exactly once. Try Sync now after a failed request.
7. Switch accounts and sign out with a read pending. Confirm no previous-user records return. Repeat logout across two tabs. Test backup restore only in a disposable account.
8. Check live responses include Content-Security-Policy and X-Content-Type-Options. Confirm the REST Content-Range header is readable from the app's origin; otherwise it should report an issue while preserving the saved copy.
9. On desktop and a phone, check sign-in, the privacy link and page, account creation, quick entry, Settings, offline/reconnect and the installed PWA update.

## Before a wider public launch

- Add a private support/privacy contact and define account closure and retention for records, authentication data, logs and provider backups. Update `privacy.html` and `PRIVACY.md` together.
- Complete and record the live checks above. Review session handling, XSS, API access controls and backup handling with an independent reviewer.
- Define usage limits and monitoring for authentication delivery, database traffic and hosting costs.

The browser cache and exports remain unencrypted. Sync still uses last-write-wins behavior for the same record edited on multiple devices, and multi-page reads are not database snapshots. This update does not add transactional backup restore, end-to-end encryption or administrator-proof access controls.
