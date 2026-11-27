# Vancouver Finance Company — SaaS Platform

Isolated Next.js 16 / React 19 SaaS under `vfc-platform/`, branch `feature/vfc-platform`. **Not deployed. Not production-ready.** This project is separate from the existing GitHub Pages website.

## Implemented
- Supabase Auth login, verified client signup (inactive pending activation), single role router
- Broker client deal creation, application list and details
- Broker-created checklist requests and secure expiring client invitation links
- Client can accept an invitation with matching verified email, complete information requests
- Role-separated messages; broker/client notification records; admin submission restrictions
- Admin submitted applications queue with limited authorized status updates
- RLS on all database tables; server-validated mutations via RPC; audit events

## Disabled intentionally
- E-Sign workflow and binding signed PDFs
- Document uploads until malware scanning and verified file ACLs are deployed
- Email delivery (Resend domain not configured)
- Production release and billing / subscriptions

## Setup
1. Select `vfc-platform` as Vercel project root; deploy from `feature/vfc-platform` branch to a *separate testing* deployment.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_APP_URL` in Vercel (never add secret keys to code).
3. Set Supabase Authentication URL configuration to allow your preview domain and `/auth/callback`.
4. Create/verify an Auth account; use trusted Supabase admin tooling to set its `profiles.role='admin'` and `active=true`. Provision broker accounts similarly. Do not allow public role promotion.
5. Test cross-broker and cross-client access using fictional users before storing real applications.

The current Supabase development project is `vfc-platform-dev`. SQL migrations run against it through the connected Supabase service; synchronize migrations to source control before production.

Security notes: Role-sensitive permissions are enforced server-side through RLS and validated RPCs. No automated signup role upgrades. Never deploy with real borrower data until data residency, privacy and consent, retention, backups, rate limiting, audit, signing and file security are reviewed.

## Scripts
`npm install`, `npm run dev`, `npm run build`.
