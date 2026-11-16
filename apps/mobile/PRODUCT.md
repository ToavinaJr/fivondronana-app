# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Primary users are FIVONDRONANA scout leaders (mpiandraikitra) who use a phone to manage their own profile and CV, consult authorized leaders and archives, find contacts, and communicate with other authorized leaders.
- Administrators provision and manage accounts through the back office. The back office is outside the scope of this mobile application.

## Product Purpose

The mobile application gives FIVONDRONANA leaders access to organizational archives, leader information and CVs, contacts, and conversations. Success means an authorized leader can find current information, maintain their own CV, download permitted documents, and communicate only in conversations they are allowed to access.

## Positioning

The product preserves and shares FIVONDRONANA's scout history and supports coordination among its leaders through entity-specific and general conversations.

## Operating Context

- The application is used on iOS and Android phones. The supplied screen references are portrait mobile captures.
- The default interface language is Malagasy. Malagasy labels shown in the supplied screens are product copy and should be preserved unless the source requirements are updated.
- Accounts are created by an administrator. A leader signs in with an email address or phone number and password. Deleted or disabled accounts cannot sign in.

## Capabilities and Constraints

### Mobile capabilities

- Browse the archive list, read compatible PDF or Word documents in the application, and download original documents. Archives may be organized by category or year; the original file content must remain unchanged.
- Browse leader summaries containing account name, photo, responsibilities, entity, and group. Open authorized CVs and download one CV or all authorized CVs as PDF.
- Create and maintain one's own CV. A leader cannot edit another leader's CV. Required fields must be present before saving; additional information can be added. CVs are generated using the appropriate Tily or Mpanazava template.
- CV sections in the source requirements are personal information (name, surname, address, birth date, birthplace), contact information (phone, email, Facebook), scouting information (province, area, fivondronana), branches (name, group, project, start and end dates), and activities (name, responsibility, description, date). The source marks name, surname, address, birth date, phone, email, province, area, and fivondronana as required.
- Browse internal and external contacts. Detailed address, responsibility, phone, and description are hidden until the user requests more details.
- Use entity-private conversations and a general conversation, according to authorization. Messages have a sender, conversation, and date; supported message content includes text, images, videos, and files. Access must be revoked when conversation membership is revoked.
- View account information, edit permitted personal information, change a password after verifying the old password, and sign out. A user cannot change their official entity or responsibility.

### Explicitly unresolved or underspecified

- **Membership conflict in the source requirements:** the leader-list rules say one leader cannot belong to two groups or two entities, while the messaging rules describe access to multiple entities' conversations when a leader belongs to multiple entities. Do not encode either interpretation as settled until this conflict is resolved.
- The forgot-password screen exists, but the source requirements do not define whether recovery uses email, SMS, or administrator support.
- Messaging supports images, videos, and files, but allowed formats and size limits are not specified; the system must enforce limits once decided.
- The source requirements do not define the behavior of global search, notification dismissal/read state, or the sign-in screen's remember-me control; the screenshots show these controls but do not specify their rules.
- The source says users may edit permitted personal information but does not enumerate every editable account field.
- The source does not state who may change a leader's group assignment.
- Official logo, unit emblems, and profile illustrations are visible only inside the reference JPEGs. Standalone source assets have not been found in the repository.

## Brand Commitments

- Product name: FIVONDRONANA.
- Preserve Malagasy-first interface copy and the official organization and unit marks when their source assets are provided.
- The mobile screen captures in `../../docs/screens/` are the visual reference for the requested screens. They are evidence for layout and appearance, not production image assets.

## Evidence on Hand

- Product and business requirements: `../../docs/Application mobile FIVONDRONANA.md`.
- Mobile screen references: `../../docs/screens/` (13 JPEG files; the WhatsApp-named image is byte-identical to `landing-page.jpeg`).
- Current application shell: `App.tsx`; it is a placeholder, not an implemented screen system.
- Current API surface: `GET /api/health`. The auth, users, CVs, archives, conversations, contacts, and administration modules are placeholders without business endpoints or data models.
- No standalone logo, icon, font, or illustration assets were found in the application or screen reference directories.

## Product Principles

1. Enforce data access on the server as well as in the mobile interface.
2. A leader edits only their own CV; official entity and responsibility data remains administrator-managed. Group-assignment ownership is not specified in the source requirements.
3. Preserve archive originals and generate separate downloadable CV PDFs.
4. Keep private conversations private, and remove access when membership is revoked.
5. Keep Malagasy-first copy legible on supported phone sizes and system text settings.

## Accessibility & Inclusion

- No product-specific accessibility standard is stated in the source requirements.
- Use native screen-reader labels and controls, respect system text scaling and reduced motion, maintain readable contrast, and meet platform touch-target guidance.
