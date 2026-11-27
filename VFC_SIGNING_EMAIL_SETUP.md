# VFC Broker Application Signing & Email Gateway

## Architecture
- **GitHub Pages:** Broker Portal (`/broker/`), passwordless signing (`/sign/`), Admin Activity/Lender Email (`/admin/activity.html`).
- **Supabase Auth:** only staff accounts; clients do not register.
- **Supabase PostgreSQL:** broker-owned editable drafts, immutable signing snapshots, audit logs, Admin access.
- **Supabase private Storage:** signed PDF and broker uploads.
- **Supabase Edge Function `vfc-sign`:** securely validates signing links, signs PDF on server, records signature, prepares Apps Script emails and allows authenticated Admin lender sending.
- **Google Apps Script:** sends emails/attachments after deployment and secret setup. Email delivery is **NOT configured just by checking this code into GitHub**.

## Configure Google Apps Script sender (one-time setup)
1. Create a **new standalone** Google Apps Script project under the Google account that should send VFC mail. Do NOT replace the unrelated lender-directory Apps Script project.
2. Paste the contents of `apps_script_vfc_mail_gateway.gs` into a `Code.gs` script file.
3. In Project Settings → Script Properties, add `VFC_MAIL_SHARED_SECRET` with a newly generated, strong secret (at least 32 random characters). Do not store or share it in GitHub.
4. Deploy → New deployment → Web app. Execute as **Me**, access **Anyone**. The handler requires the shared secret for every send, but the web app URL should still be treated as sensitive configuration.
5. In the Supabase project → **Edge Functions → Secrets**, add:
   - `VFC_APPS_SCRIPT_URL`: the deployed Apps Script `/exec` URL
   - `VFC_APPS_SCRIPT_SECRET`: exactly the same secret as the Apps Script property
6. Test only with a fictional application and approved test email addresses. The Apps Script sender email is the Google account running the web app. If using a business alias, configure that sender separately.

Do not put `VFC_APPS_SCRIPT_SECRET` into public website JavaScript. Clients signing from email **do not need accounts**.

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
