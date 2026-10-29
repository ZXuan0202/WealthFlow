# 💜 WealthFlow

**Personal Wealth, Expense & Savings Tracker**

**V5.2 Beta** — testing with example data is recommended while live security verification, a private support contact and backup-retention arrangements are completed. See [release and validation steps](wealthflow-app/RELEASE-V5.2.md).

WealthFlow is a mobile-friendly personal finance web application designed to help people understand their money, manage daily expenses, track savings, and monitor their financial progress.

🌐 **[Try WealthFlow](https://courageous-kleicha-45a81e.netlify.app)**

## ✨ Features

- **Wealth Dashboard** — Track cash, bank accounts, e-wallets and investments.
- **Daily Expense Tracking** — Record income and expenses manually.
- **Usable Money Chart** — Visualize available money by account.
- **Savings Goals** — Create targets and reserve money.
- **Investment Tracking** — Monitor investments and maturity dates.
- **PayLater Tracking** — Manage outstanding installment balances.
- **Bills & Renewals** — Organize subscriptions, bills and recurring payments.
- **Multi-device Sync** — Use the same account on computer and phone.
- **Personal Accounts** — Each user has their own financial workspace.
- **Custom Categories** — Organize transactions your own way.

## 🛠️ Technology

- HTML, CSS and JavaScript
- Supabase — Authentication and cloud database
- Netlify — Website hosting
- Progressive Web App (PWA) support

## 📱 How to Use

1. Open the live WealthFlow website.
2. Create your personal account.
3. Add your bank, cash and e-wallet accounts.
4. Start recording income and expenses.
5. Explore your financial dashboard.

## 🔐 Privacy

WealthFlow uses Supabase authentication and Row Level Security to separate users' financial records. Financial data is not end-to-end encrypted, and the database administrator can access stored records.

Please avoid entering bank passwords or sensitive banking credentials.

This is an independently developed personal finance project, not a banking service or financial adviser.

## 🚀 Project Status

WealthFlow is in beta. V5.2 protects local edits during cloud refreshes, loads records across multiple pages, and keeps saved data intact when a cloud read is incomplete. [Privacy & data use](wealthflow-app/privacy.html) explains administrator access, device storage and outstanding launch requirements.

Feedback and bug reports are welcome through GitHub Issues.

## Development checks

Requires Node.js 24. No package installation is needed:

```sh
node --check wealthflow-app/app.js
node --check wealthflow-app/service-worker.js
node --test tests/*.test.cjs
```

GitHub Actions runs the syntax and regression checks on pull requests and pushes to `main`. Tests mock network requests and do not access live financial records or establish that the deployed database is secure.
