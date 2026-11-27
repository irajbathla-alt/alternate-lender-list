# VFC Broker Application Signing & Email Gateway

## Architecture
- **GitHub Pages:** Broker Portal (`/broker/`), passwordless signing (`/sign/`), Admin Activity/Lender Email (`/admin/activity.html`).
- **Supabase Auth:** only staff accounts; clients do not register.
- **Supabase PostgreSQL:** broker-owned editable drafts, immutable signing snapshots, audit logs, Admin access.
- **Supabase private Storage:** signed PDF and broker uploads.
- **Supabase Edge Function `vfc-sign`:** securely validates signing links, signs PDF on server, records signature, prepares Apps Script emails and allows authenticated Admin lender sending.
- **Google Apps Script:** sends emails/attachments after deployment and secret setup. Email delivery is **NOT configured just by checking this code into GitHub**.

## Extend the existing Alternate Lender Apps Script (one-time setup)
1. Open the **existing** Google Apps Script project that powers the Alternate Lender List. Do not create a new project, spreadsheet, or deployment.
2. Back up its current source. Update its existing main script with `apps_script_member_notes.gs` (version `2026-11-26.3`). It retains the existing lender directory, account, admin authentication, member notes and deal thread handlers and adds the isolated `send_vfc_mail` route. Do not paste the obsolete standalone gateway or create a second `doPost`.
3. Preserve the current spreadsheet ID, Script Properties (including ADMIN_PASSWORD and the existing spreadsheet connection), and existing deployment settings. If your live script has additional custom changes, merge only the new route and `handleVfcMail_` helper into that source.
4. Add one new Script Property: `VFC_MAIL_SHARED_SECRET` (a strong, random value of at least 32 characters). Keep all previous properties.
5. Deploy → Manage deployments → Edit the **existing** web app deployment → New version → Deploy. Retain the existing `/exec` URL and access settings. Approve the added MailApp permission if prompted. The executing account must be authorized to send VFC mail.
6. In Supabase → Edge Functions → Secrets, set:
   - `VFC_APPS_SCRIPT_URL`: the same existing Apps Script `/exec` URL
   - `VFC_APPS_SCRIPT_SECRET`: the matching new shared secret
7. Verify the existing lender portal login, notes, deal threads, lender data and calculators, then test signing and PDF email using a fictional application and approved test inboxes.

Never place the shared secret in GitHub or browser JavaScript. The existing script's executing account sends the email; the VFC reply-to is `vancouverfinancecompany@gmail.com`. Email is not configured merely by committing source code.

## Signing process
1. Broker opens a **draft** application and uses **Edit Client Information** until all information is accurate.
2. Broker clicks **Prepare Signing Email**. A fresh random 72-hour link is generated, logged and the previous pending link is revoked.
3. If Apps Script is configured, the portal requests automatic delivery. Otherwise it opens a pre-addressed email draft for the broker to review and send manually.
4. Client opens `/sign/?token=...`, reviews financing summary and consent, types the exact legal name and explicitly approves signing.
5. Supabase records the timestamp, signer name, IP, browser string, original application snapshot hash and signed PDF hash. Signed PDF is stored privately.
6. The client can immediately download a copy from the signing page. If the Apps Script gateway is configured, it emails the PDF to both the client and VFC.
7. Broker downloads the signed PDF from their application. The signature is recognized by the Admin submission rule.
8. Admin can email the signed application PDF to the selected lender using the authenticated `/admin/activity.html` form, after confirming client authority.

## Important limitations
- **Typed-name e-signing is a basic electronic signature.** A bearer link and name entry do not independently verify government identity, and this should not be represented as certified digital-signature software. Obtain legal review for regulatory suitability.
- Email status `sent` is the Apps Script response, not verified mailbox delivery. Bounces, complaints, tracking and suppression require a provider integration.
- Admin lender mail attaches only the signed application, **not** unverified uploaded ID or bank statements.
- Signed emails and Admin lender emails will not send until the Apps Script URL and matching secret are configured. When absent, the system reports `not_configured`.
- Keep real customer data out of testing until the full flow has been verified on an actual phone and browser and security review has been completed.
