# B2E AGENT Lite — Vercel Pilot v0.2

**Status:** Demo-only. This project accepts deliberately fictional leads only. It is not production-ready, and must **not** be used with real customer information.

This project provides a responsive web frontend (`index.html`), a Vercel Node.js function (`api/leads.js`), validation (`lib/lead.cjs`) and a server-side Google Sheets writer (`lib/google-sheets.cjs`).

## Current status

The app source is in `andjsales/b2e-agent-lite-pilot` (currently public by the owner's choice). The pilot Google Sheet is created. A live deployment and a real Sheet write have **not** been verified. Use an authorized B2E commercial Vercel plan for business testing. The Google Cloud organization blocks creation of permanent service account JSON keys; this version therefore uses **Vercel OIDC + Google Workload Identity Federation**, which does not require such keys.

There are **no credentials in the repository**. The local development server uses a mock backend only.

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

## 2. Configure Google Cloud keyless authentication

**Do not disable** the organization's `iam.disableServiceAccountKeyCreation` policy. Do not create or upload a JSON service-account key.

The existing service account (e.g. `b2e-agent-lite@PROJECT_ID.iam.gserviceaccount.com`) can be reused:

1. In the pilot Google Cloud project, enable **Google Sheets API**, **IAM Service Account Credentials API**, and **Security Token Service API** (if the console requests it).
2. In **IAM & Admin → Workload Identity Federation**, create a pool named `Vercel` with ID `vercel`.
3. Add a provider of type **OpenID Connect (OIDC)** with ID `vercel`. For **Issuer URL**, use `https://oidc.vercel.com/TEAM_SLUG` if Vercel is configured for Team issuer mode (recommended). The slug must match the Vercel owner actually deploying the project.
4. Set **Allowed audiences** to `https://vercel.com/TEAM_SLUG` (or configure a different audience correctly on both ends). Map `google.subject` to `assertion.sub`. Ensure the provider and service-account binding restrict access to the **specific Vercel project and environment**, rather than all deployments in the account.
5. In the existing service account **Permissions**, grant **Workload Identity User** (`roles/iam.workloadIdentityUser`) to the principal from the pool with the exact Vercel `sub`, for example:

   `principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/subject/owner:TEAM_SLUG:project:VERCEL_PROJECT_NAME:environment:preview`

   Use the project number (numeric), Vercel **team slug**, Vercel **project name**, and deployment environment for your actual setup. For production deployments, grant only the explicitly authorized production principal separately.
6. Share the demo Sheet only with the service account **email** as Editor. **Do not make the Sheet public**.

Official guide: https://vercel.com/docs/oidc/gcp

## 3. Deploy to a B2E-approved Vercel account

The source is already in https://github.com/andjsales/b2e-agent-lite-pilot . On a B2E-approved commercial Vercel team, import that repository using https://vercel.com/new. Use **Other** as the framework and repository root as the project directory. Configure deployment protection before inviting staff to test.

Vercel supports keyless backend access through OIDC on all plans, but the Hobby plan's commercial-use restriction remains a separate issue.

## 4. Configure server-side Vercel environment variables

In **Project Settings → Environment Variables**, configure:

| Variable | Value |
| --- | --- |
| `GOOGLE_SPREADSHEET_ID` | `1mxBlgn_hS-vfljMtdAnlIGcH_2udey7lMKVVB2yTgxs` |
| `GCP_PROJECT_NUMBER` | Numeric project number from Google Cloud project settings |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | `vercel` (if you used the suggested pool ID) |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `vercel` (if you used the suggested provider ID) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | The existing service account's email address |
| `PILOT_ACCESS_CODE` | A new private random code of at least 16 characters |

There is **no** `GOOGLE_SERVICE_ACCOUNT_JSON` variable anymore. Vercel sends its ephemeral OIDC token to the function in the `x-vercel-oidc-token` request header; Google verifies it and issues temporary credentials. Do not expose an OIDC token or service account credentials to the frontend. Do not post access codes in GitHub or this chat.

After saving the variables, redeploy the app. If the token exchange fails, check **issuer URL, allowed audience, pool/provider IDs, subject mapping, exact principal binding, IAM Credentials API**, and the environment of the deployed URL. Google Sheets errors typically indicate the service account was not granted Sheet editor access.

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
- **503: could not save to Google Sheets** — verify the WIF issuer/audience/subject, IAM Credentials API, exact impersonation binding, spreadsheet ID and `Leads` tab, and service account Editor sharing; check Vercel logs and redeploy. Vercel function logs show an error category, not the submitted lead.
- **404: `/api/leads`** — confirm the repository root has `api/leads.js` and that Vercel detected a Node.js Function.
- **Private deployment won't open on iPad** — sign in to Vercel on Safari or check Deployment Protection settings for your plan.

## Scope and data safety

- Staff-assisted lead form only. Test drive registration, license scans, dashboards, sales attribution, advanced scoring and CRM are future phases.
- No client data or real contact details allowed: server rejects email outside `example.com` / `example.test` and phone numbers outside the fictional 555-01xx block.
- `google.script.run` is no longer used; Vercel calls Google Sheets only on the server, obtaining temporary Google credentials using Workload Identity Federation.
- The browser-local Leads screen displays only **local file previews**; records submitted through Vercel must be reviewed in Google Sheets.
- The pilot uses a shared access code and basic duplicate detection; neither is a substitute for staff authentication, auditing, rate limits, proper consent wording, or production-grade tenant isolation.

## Project contents

- `index.html` — responsive form UI and demo browser preview
- `api/leads.js` — protected Vercel function (`POST /api/leads`)
- `lib/lead.cjs` — server validation and spreadsheet mapping
- `lib/google-sheets.cjs` — keyless Google Workload Identity Federation and Sheets append
- `scripts/local-server.cjs` — local mock server, **not** for deployment
- `tests/` — unit tests and API mocks
- `.env.example` — names of environment variables only; no real secrets
- `.github/workflows/test.yml` — run tests on push or pull request