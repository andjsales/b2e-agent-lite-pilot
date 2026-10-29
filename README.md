# B2E AGENT Lite — Vercel Pilot v0.2

**Status:** Demo-only. This project accepts deliberately fictional leads only. It is not production-ready, and must **not** be used with real customer information.

This project provides a responsive web frontend (`index.html`), a Vercel Node.js function (`api/leads.js`), validation (`lib/lead.cjs`) and a server-side Google Sheets writer (`lib/google-sheets.cjs`).

## Current deployment status and account prerequisites

**Source ready, cloud deployment not yet performed.** The connected GitHub account currently has no accessible repositories, so you must first create an empty **private** repository for this project, or authorize an appropriate B2E-owned repository. The currently connected Vercel account is a personal **Hobby** plan; according to Vercel's fair-use and Hobby rules, business/commercial deployments require Pro or Enterprise. Do **not** deploy B2E's company app to Hobby. Have B2E select/approve a company-owned Vercel Pro or Enterprise project/account before publication. The installation of the GitHub/Vercel integrations by itself does not create a repository or change billing.

If you only want to review the HTML interface, you can open `index.html` locally without publishing anything. Local file mode does not send data to Google Sheets.

## Your ready-made pilot Sheet

- Spreadsheet: **B2E AGENT Lite — Vercel Pilot (TEST DATA ONLY)**
- URL: https://docs.google.com/spreadsheets/d/1mxBlgn_hS-vfljMtdAnlIGcH_2udey7lMKVVB2yTgxs/edit
- Spreadsheet ID: `1mxBlgn_hS-vfljMtdAnlIGcH_2udey7lMKVVB2yTgxs`
- Worksheet/tab name: `Leads` (must remain exactly this spelling)
- 22 headers installed; no leads have been submitted.

Do not share the spreadsheet broadly. Do not use B2E's master events workbook for this test.

## 1. Local smoke test (no Google access required)

You need Node.js 20 or newer.

```bash
cd B2E-Agent-Lite-Vercel
npm test
npm run dev
```

Open http://localhost:4173 in your browser. Choose an event, click **Fill with sample data**, enter access code `change-me-demo-code-12345`, and submit. This local server uses a **mock** Google Sheet: it does not write to Drive. The browser may display a successful submission, but only the deployed version with the configured Google integration can perform a real write. Run `Ctrl+C` to stop the local server.

**Never use the local development access code on Vercel.**

## 2. Create a Google Cloud service account for the pilot

1. Using an authorized B2E Google Cloud account, open https://console.cloud.google.com/ and create/select a project, such as **B2E Agent Lite Pilot**.
2. Open **APIs & Services → Library**, find **Google Sheets API**, and click **Enable**.
3. Open **IAM & Admin → Service Accounts**, create one service account for the pilot with no project-wide IAM roles beyond what is needed to create the identity.
4. Open the service account → **Keys → Add key → Create new key → JSON** to download a private JSON key. Some organizations restrict service-account key creation; if so, ask the Workspace/Cloud administrator about an approved authentication approach. **Never send the JSON key in chat, email, or a Git repository.**
5. Copy the service account email, ending in `.iam.gserviceaccount.com`.
6. Open the pilot spreadsheet above, click **Share**, grant that **service account email** the **Editor** permission. This shares only the test spreadsheet. If B2E Workspace prohibits the external principal, request admin approval rather than making the sheet public.

Google documentation: https://developers.google.com/workspace/guides/create-credentials

## 3. Create a private GitHub repository and deploy to Vercel

Use an organization-owned repository when possible. In GitHub click **+ → New repository**, name it `b2e-agent-lite-pilot`, choose **Private**, and create it **without** a README so you can push this existing folder.

From Terminal in the extracted project directory:

```bash
git init
git add .
git commit -m "Initial demo-only AGENT Lite Vercel pilot"
git branch -M main
git remote add origin https://github.com/YOUR-B2E-OWNER/b2e-agent-lite-pilot.git
git push -u origin main
```

Replace `YOUR-B2E-OWNER` with the actual verified GitHub owner. You may have to authenticate through GitHub; do not share any tokens in this conversation. `git add .` obeys `.gitignore`; check `git status` to ensure no JSON service-account key or environment file is being committed.

Once the project is linked in Vercel, later pushes will rebuild automatically. A GitHub Actions check runs the Node tests on pushes and pull requests, without credentials.


### Option A: Vercel CLI, no GitHub repository needed (approved commercial plan only)

On your Mac, unzip the project archive and, in Terminal:

```bash
cd ~/Downloads/B2E-Agent-Lite-Vercel   # adjust to where you unzipped it
npx vercel@latest login
npx vercel@latest
```

Follow the prompts to link/create a Vercel project. Choose **Other** or **No framework** when prompted; root directory is the project folder. Leave build command empty. This generates a preview deployment URL but it will not save to Google Sheets until environment variables are set.

### Option B: GitHub → Vercel

Create an empty **private** GitHub repository under B2E ownership or a B2E-approved organization, and push *the contents of this project folder* (never the service account JSON). With a B2E-approved commercial Vercel plan, visit https://vercel.com/new, import that repo; set Framework Preset to **Other**, root directory to the repository root, and deploy. Git integration makes subsequent changes easier.

## 4. Configure Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, create the following server-only variables for your intended deployment environment (Preview and/or Production):

| Name | Value |
| --- | --- |
| `GOOGLE_SPREADSHEET_ID` | `1mxBlgn_hS-vfljMtdAnlIGcH_2udey7lMKVVB2yTgxs` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The entire downloaded **service account JSON** as one environment-variable value, not in source code |
| `PILOT_ACCESS_CODE` | A unique random passphrase with **at least 16 characters**, e.g. generate using `openssl rand -hex 24` |

**Never use** `NEXT_PUBLIC_` or `VITE_` prefixes for any of these secrets. Do not configure `MOCK_SHEETS` on Vercel. Do not share a screenshot revealing credentials. Vercel encrypts stored project environment variables but still restrict project access.

Environment-variable changes require a **new deployment** to take effect. Use the Vercel Dashboard **Deployments → Redeploy** or, from the linked project folder, run `npx vercel@latest --prod` for a Production deployment.

Docs: https://vercel.com/docs/environment-variables

## 5. Protect the demonstration and verify it

Vercel deployments may be accessible to anyone who has the URL. Where your account supports it, enable **Vercel Authentication** or another deployment protection method under **Project Settings → Deployment Protection** before sharing the URL. The app's access code protects the lead-submission endpoint, **not the entire page**.

1. Open the deployed Vercel URL on a Mac browser or iPad.
2. Select a demo event, click **Fill with sample data**, and enter your **new secret pilot access code**.
3. Submit. The app must report **Demo lead confirmed in Google Sheet**. If it reports an error, do not treat the lead as saved.
4. Open the pilot Sheet. Verify the new row on the `Leads` tab: event, first/last name, email, fictional phone, consent and UTC timestamp.
5. Submit again with the **same lead ID** only if testing retries; the API should detect it and report a duplicate. (Concurrent saves are not transactionally locked—this is a pilot, not a production deduplication system.)
6. Repeat from Safari on the iPad in portrait and landscape.

## Troubleshooting

- **503: pilot access code not configured** — `PILOT_ACCESS_CODE` missing or shorter than 16 characters; redeploy after changing env vars.
- **401: invalid pilot access code** — the code entered in the page differs from `PILOT_ACCESS_CODE`.
- **503: could not save to Google Sheets** — enable Sheets API; verify spreadsheet ID and `Leads` tab; share Sheet with correct service account email; check deployed environment variables and redeploy. Vercel function logs show an error category, not the submitted lead.
- **404: `/api/leads`** — confirm the repository root has `api/leads.js` and that Vercel detected a Node.js Function.
- **Private deployment won't open on iPad** — sign in to Vercel on Safari or check Deployment Protection settings for your plan.

## Scope and data safety

- Staff-assisted lead form only. Test drive registration, license scans, dashboards, sales attribution, advanced scoring and CRM are future phases.
- No client data or real contact details allowed: server rejects email outside `example.com` / `example.test` and phone numbers outside the fictional 555-01xx block.
- `google.script.run` is no longer used; Vercel calls Google Sheets only on the server, with credentials stored in Vercel environment variables.
- The browser-local Leads screen displays only **local file previews**; records submitted through Vercel must be reviewed in Google Sheets.
- The pilot uses a shared access code and basic duplicate detection; neither is a substitute for staff authentication, auditing, rate limits, proper consent wording, or production-grade tenant isolation.

## Project contents

- `index.html` — responsive form UI and demo browser preview
- `api/leads.js` — protected Vercel function (`POST /api/leads`)
- `lib/lead.cjs` — server validation and spreadsheet mapping
- `lib/google-sheets.cjs` — service-account OAuth and Sheets append
- `scripts/local-server.cjs` — local mock server, **not** for deployment
- `tests/` — unit tests and API mocks
- `.env.example` — names of environment variables only; no real secrets
- `.github/workflows/test.yml` — run tests on push or pull request