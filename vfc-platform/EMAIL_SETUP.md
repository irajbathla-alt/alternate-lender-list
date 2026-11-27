# VFC SaaS — Broker email sender setup

The Broker Portal uses the Resend API on the server (Next.js Server Action). This is a backend service integration, not a ChatGPT mail connector. No user-supplied keys are included in the repository.

## Staging configuration
1. In Resend, verify a domain or sending subdomain owned by Vancouver Finance Company Inc. Use the SPF/DKIM records generated for that domain and confirm its verification status.
2. Create a sending-scoped Resend API key.
3. In Vercel project `vfc-platform-staging`, set `RESEND_API_KEY` as a secret encrypted environment variable for Preview (and Development only if necessary). Never use `NEXT_PUBLIC_` for this credential.
4. Current Preview env values:
   - `VFC_EMAIL_FROM` = `Vancouver Finance Company <notifications@vancouverfinancecompany.com>` (requires a matching verified sender domain)
   - `VFC_EMAIL_TEST_RECIPIENT` = `vancouverfinancecompany@gmail.com`
   - `VFC_EMAIL_LIVE_ENABLED` = `false`
5. Redeploy staging after adding the key. From an active broker login, open a fictional application, select **VFC Admin**, and send a test message. The system will permit only the allowlisted recipient. Check status in **Outbound Email History** and confirm the test message arrived.

## Production release
Do not enable `VFC_EMAIL_LIVE_ENABLED=true` in staging or with real client data before the complete security, e-sign, document malware scanning, privacy/consent and regulatory review. A separate production environment, provider webhook delivery status (delivered, bounced, spam complaint), unsubscribe policy for non-transactional messages, monitoring and suppression lists are also recommended.

## Security controls
- Broker must be active and own the application.
- Recipient is selected by the database: the linked client or an active, verified Admin. Broker cannot enter arbitrary recipients.
- Server-side Resend key only; no key in frontend.
- 15-message/hour per broker limit in database.
- Audited email outbox, provider response ID, and status. `sent` means accepted by provider, not proof of inbox delivery.
- Email does not include documents or attachments.
- Broker's unsubmitted drafts are inaccessible to other brokers and Admin.
