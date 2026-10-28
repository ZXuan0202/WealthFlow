# WealthFlow Privacy Notice (V5.2 Beta)

The user-facing beta notice is **privacy.html**, linked before signup and in Settings. Keep that page and this operator document consistent. A private contact and provider-backup/log retention policy are still required before a wider public launch; no details have been invented for the operator.

WealthFlow is a personal finance tracker operated by the person who owns the website and its Supabase project. This notice is a template for that operator to review before inviting users. It is NOT a legal review.

- **What is stored:** User email and authentication information are managed by Supabase Auth. User-created records (account names, balances, transactions, investments, debts, goals, scheduled bills and preferences) are stored in the operator's Supabase database.
- **Who can access:** Each signed-in user can access their own records via the normal app. The database owner and other authorized privileged administrators can technically access stored records. Supabase and Netlify process data according to their services and terms.
- **Not end-to-end encrypted:** Data is protected in transit using HTTPS, but the website operator's privileged access is not prevented by the application's row-level access rules. Avoid entering bank passwords or full account credentials.
- **Device storage:** To allow offline operation, some financial records and pending changes are cached in browser local storage, which is not encrypted by the app. Sign out to clear the signed-in user's cache, and avoid shared or untrusted devices. The app keeps authentication tokens in the current browser tab by default; selecting “Stay signed in” stores credentials persistently on that device. Browser scripts can access those tokens, so protecting against cross-site scripting remains essential.
- **Sharing & backups:** Other users are not granted access to your financial records through the normal WealthFlow app. Exported JSON/CSV files are not encrypted; keep them in a safe location.
- **Deletion:** Users can use Settings → Delete all financial records. The website operator should provide a contact method for account closure and questions about retention, backups, and personal data.
- **Security limits:** Supabase access JWTs remain valid until expiry even after sign-out. Network failure may prevent the server from revoking the session; the app will report this. The project has not received an independent security audit.

Before going public, the operator should adapt this notice and add a privacy contact, retention policy, and terms appropriate for local laws and intended users.
