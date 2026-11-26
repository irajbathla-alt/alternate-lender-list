# VFC broker and admin workspace
Staging only. Preserve portal.html and all existing lender tabs, calculators, notes and threads. Do not deploy until verified.

## Authentication
Extend existing accounts sheet without changing password hashes. Server-issued expiring opaque sessions; verify ownership on every broker request and administrator authorization on every admin request. No client-side role trust. Use POST for credentials, never URL query strings in new modules. Existing directory integration must be regression tested.

## Broker
Single login, workspace chooser, create deal, unique VFC reference, private Drive folder, categorized upload, own deals and status. Confirm client authorization before submission. Never expose other brokers' files.

## Admin workhorse
Queue, broker records, deal search, status, notes, document index, private Drive access, lender contact directory, editable subject/body templates, multi-select documents and lenders, preview and explicit send confirmation. Separate emails per lender, verify file ownership, size limits, durable per-recipient dispatch log and duplicate protection. Record failures separately. Admin-only access server-side.

## Apps Script
Extend existing bound spreadsheet; new tabs BrokerDeals, BrokerDocuments, LenderContacts, SubmissionAudit, BrokerSessions. Configure VFC Drive root and sender through script properties. Execute as VFC account; Gmail sender vancouverfinancecompany@gmail.com must be primary or verified alias. Never reuse TFC IDs, data, credentials or sender. Signup notification only after verified account persistence. No public Drive sharing.

## Release gates
Test existing login, tabs, notes, calculators, admin and threads; test two broker accounts for isolation; test upload readback, expired sessions, admin denial, duplicate dispatch, failed recipients and sender identity using synthetic documents. No live lender emails during tests. Existing deployment remains untouched until approval.
