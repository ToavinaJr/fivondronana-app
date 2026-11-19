# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Primary users are FIVONDRONANA scout leaders (mpiandraikitra) who use a phone to manage their own profile and CV, consult leaders and archives, find contacts, and communicate with other authorized leaders.
- Administrators provision and manage accounts and official reference data through a separate backoffice client. An administrator may also have the responsible role on the same account.

## Product Purpose

The mobile application gives FIVONDRONANA leaders access to organizational archives, leader information and CVs, contacts, and conversations. Success means an authorized leader can find current information, maintain their own CV, download permitted documents and CV PDFs, and communicate only in conversations they are allowed to access.

## Positioning

The product preserves and shares FIVONDRONANA's scout history and supports coordination among its leaders through entity-specific and general conversations.

## Operating Context

- The application is used on iOS and Android phones. The supplied screen references are portrait mobile captures.
- The default interface language is Malagasy. Malagasy labels shown in the supplied screens are product copy and should be preserved unless the source requirements are updated.
- Accounts are created by an administrator. A leader signs in with an email address or phone number and password. Deleted or disabled accounts cannot sign in; disabling an account revokes its existing sessions.
- The backoffice is a React/TypeScript web portal. Administrators sign in using the same account credentials as responsible users; server-side role checks decide which operations are available.

## Capabilities and Constraints

### Mobile capabilities

- Browse the archive list, read compatible PDF or Word documents in the application, and download original documents. Archives may be organized by category or year; the original file content must remain unchanged.
- Browse leader summaries containing account name, photo, responsibilities, entity, and group. Every responsible can consult other responsible CVs and download one or all authorized CVs as PDF.
- Create and maintain one's own CV. A leader cannot edit another leader's CV. Required fields must be present before saving; additional information can be added. CVs are generated using the appropriate Tily or Mpanazava template.
- CV sections in the source requirements are personal information (name, surname, address, birth date, birthplace), contact information (phone, email, Facebook), scouting information (province, area, fivondronana), branches (name, group, project, start and end dates), and activities (name, responsibility, description, date). The source marks name, surname, address, birth date, phone, email, province, area, and fivondronana as required.
- Browse internal and external contacts. Detailed address, responsibility, phone, and description are hidden until the user requests more details.
- Use entity-private conversations and a general conversation, according to authorization. Messages have a sender, conversation, and date; supported message content includes text, images, videos, and files. Access must be revoked when conversation membership is revoked.
- View account information, edit permitted personal information, change a password after verifying the old password, and sign out. A user cannot change their official entity or responsibility.
- Password recovery offers email or SMS as the channel selected by the responsible user. Delivery providers and channel-verification rules must be selected before the recovery flow is enabled.

### Confirmed organization rules

- A responsible belongs to exactly one group and one entity.
- An administrator may also be a responsible; both roles may coexist on one account.
- All responsible users may consult responsible CVs and retain the individual and all-CV PDF download journeys in the source requirements. Editing remains owner-only.
- Initial official responsibility catalogue: Haim-panahy, Fampitaovana, Mpitantsoratra, Mpitahiry vola. Administrators may create and remove responsibilities. A responsibility assigned to users must be unassigned or reassigned before it is removed.
- A file download link is temporary. Each new link issuance rechecks authorization; a previously issued link remains valid only until its short expiry (five minutes is the proposed value).
- No real production data or distributed mobile versions currently need migration compatibility protection.

### Resolved 18 November 2026 (see the ADR for full wording)

- "Tsarovy aho" opens a long-lived session via a refreshed/rotated refresh token with secure revocation; exact numeric duration is set at implementation time, not left unresolved.
- Password recovery uses email only, via SendGrid, with a short-lived single-use token.
- Archive files (Arisiva): 5 MB max per file, PostgreSQL-backed `FileStorage` port in development, extension allow-list + real-MIME-sniff + antivirus-scan checks required before a file is servable; production storage host (Neon vs self-hosted Postgres) is an open connection-string choice that does not block implementation.
- Notifications (Fampafantarana): PostgreSQL-backed, generated from real application events, with read/unread and user-initiated deletion; no demo notifications in production.
- Hafatra conversations: entity-scoped rooms plus exactly one general room, with "responsable d'entité"/"responsable général" roles enforced server-side; realtime transport is chosen during implementation from hosting constraints, not gated on an ADR vote.
- Backoffice hosting is deliberately deferred (Vercel is the leading option when it is time) and does not block building the workspace now.
- Target user volumes, availability, latency, RPO, and RTO are deliberately deferred until a real operational need appears.

### Still genuinely unresolved or underspecified

- The antivirus scanning mechanism for Arisiva uploads (which engine/service to call) — the only remaining open item blocking Task 4 Step 5's completion.
- Whether Hafatra conversation membership is derived from entity/role or explicitly modeled as its own addable/removable record — shapes the schema and whether the backoffice needs a membership screen.
- The backoffice's own browser session transport (cookie vs. bearer token) — distinct from mobile's token handling and not covered by the hosting decision.
- The enumerated list of event sources that generate a notification, and global-search scope — notification storage/semantics are decided, but which events fire one, and what search covers, are not.
- Messaging attachment byte-size/retention specifics beyond the general 5 MB file limit shared with Arisiva.
- The standalone FIVONDRONANA organization logo and profile photos have not been supplied. Tily/Mpanazava and branch emblem JPEGs exist in `src/assets/`; use only the matching unit emblem when the related unit is known, and keep the organization wordmark until its official logo is provided.

## Brand Commitments

- Product name: FIVONDRONANA.
- Preserve Malagasy-first interface copy and the official organization and unit marks when their source assets are provided.
- The mobile screen captures in `../../docs/screens/` are the visual reference for the requested screens. They are evidence for layout and appearance, not production image assets.

## Current implementation status (18 November 2026)

- Implemented API routes: health/readiness, login/current user/logout/password change, own-CV read/save, authorized paginated responsible directory and CV read/list/export data, authorized paginated contact directory, administrator entity/group reference management and one-to-one entity/group assignment, administrator responsibility catalogue/assignment management, and administrator contact CRUD/publish.
- Authentication sessions, roles, one entity/group membership per responsible, official responsibilities, personal CV sections, and contacts are persisted through Prisma. The local demo seed creates coherent reference data, two published demo contacts, and a responsible account; administrator account provisioning still requires the account-management slice.
- The mobile leader directory, individual/all-CV PDF, and contact directory journeys use authenticated API data, with filters (leaders) or search (contacts) and loading, empty, retry, and refresh states. As of 19 November, archive/notification demonstration content is no longer rendered: archives, notifications, and messages show explicit unavailable states until their APIs are implemented. Directory errors distinguish missing permissions (403), missing resources/routes (404), and server failures (5xx); these messages do not bypass authorization.
- Archive publishing/delivery, the conversation API, a backoffice application, and server-side notifications do not exist yet, but are no longer blocked on product decisions (see "Resolved 18 November 2026" above) beyond the few narrow items still listed as unresolved. The `fivondronana_test` PostgreSQL database needs valid credentials before any PostgreSQL integration test (several already written, currently skipped) can run for real — see Task 2b in the completion plan. Small-device UI qualification remains outstanding; administrator-only API routes use server-side role and permission guards.
- The detailed execution sequence is in `../../docs/superpowers/plans/2026-11-18-platform-completion.md`; confirmed decisions are in `../../docs/decisions/0001-platform-foundation.md`.

## Evidence on Hand

- Product and business requirements: `../../docs/Application mobile FIVONDRONANA.md`.
- Mobile screen references: `../../docs/screens/` (13 JPEG files; the WhatsApp-named image is byte-identical to `landing-page.jpeg`).
- Current application shell: `App.tsx` and the mobile screens under `src/`; the product shell exists, while several domain screens still use demonstration data or placeholder behavior.
- Current API surface: health, authentication/session, password change, the authenticated user's own CV, the leader directory/CV export, and the contact directory/admin CRUD. Archives, conversations, and account-management/backoffice modules have no product endpoints/data models yet.
- No standalone logo, icon, font, or illustration assets were found in the application or screen reference directories.

## Product Principles

1. Enforce data access on the server as well as in the mobile interface.
2. A leader edits only their own CV; every responsible can consult and download CV PDFs. Entity and official responsibility data remains administrator-managed.
3. Preserve archive originals and generate separate downloadable CV PDFs.
4. Keep private conversations private, and remove access when membership is revoked.
5. Keep Malagasy-first copy legible on supported phone sizes and system text settings.

## Accessibility & Inclusion

- No product-specific accessibility standard is stated in the source requirements.
- Use native screen-reader labels and controls, respect system text scaling and reduced motion, maintain readable contrast, and meet platform touch-target guidance.
