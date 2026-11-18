# FIVONDRONANA Platform Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing Expo/NestJS/PostgreSQL prototype into a secure, usable FIVONDRONANA platform through independently verifiable end-to-end delivery slices.

**Architecture:** Keep the Bun monorepo, Expo mobile client, NestJS modular monolith, and PostgreSQL/Prisma. Implement a server-owned authorization foundation before protected business domains; then ship each domain across schema, API, mobile UX, tests, and documentation. A responsible belongs to exactly one group and one entity; an account may hold both administrator and responsible roles.

**Tech Stack:** Bun 1.4.4, TypeScript strict, Expo SDK 58 / React Native 0.88 / React 19.3, NestJS 12, Prisma 7, PostgreSQL 17, `bun:test`, Biome, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-18-platform-completion-design.md`; product rules: `apps/mobile/PRODUCT.md` and `docs/Application mobile FIVONDRONANA.md`; unresolved decisions: `docs/decisions/0001-platform-foundation.md`.

## Global Constraints

- Preserve the current stack and use TypeScript strict mode.
- Preserve Malagasy-first copy and support iOS and Android.
- The backend is authoritative for authentication, authorization, and access to protected resources.
- A responsible can belong to exactly one group and one entity.
- Administrator and responsible roles may coexist on one account; every administrative operation is still guarded server-side.
- Every responsible may consult and download individual/all responsible CV PDFs; only the CV owner may edit their CV.
- The initial responsibility catalogue is Haim-panahy, Fampitaovana, Mpitantsoratra, and Mpitahiry vola; only administrators may create/remove entries, and assigned entries must be unassigned before removal.
- New temporary file links require authorization at issuance; existing links expire after at most five minutes (proposed value).
- No production data or distributed mobile release requires legacy migration compatibility.
- A responsible may edit only their own CV.
- Do not expose Prisma records directly where they contain internal or sensitive fields; return explicit DTOs.
- Do not include demonstration fixtures in production screens or release builds.
- Integration tests must use a disposable PostgreSQL database with a name ending in `_test`; never use `.env` or a developer database as a CI fixture.
- Every touched data screen must represent loading, success/data, empty, error/retry, and refreshing/offline states where applicable; use content-shaped skeletons for meaningful initial loads.
- Do not enable recovery delivery, file upload types/limits, backoffice hosting/session transport, notification semantics, or other unresolved infrastructure/policy until the corresponding ADR decision is recorded.
- Every Prisma schema change must have a reviewed versioned migration; production migration execution is a controlled deployment step, not an implicit API startup side effect.

## Review Focus

1. **Group/entity reassignment and concurrent assignment:** a responsible must never acquire more than one group or entity, including through racing administration requests. Pin with PostgreSQL uniqueness/transaction tests in Task 2.
2. **Cross-entity identifier probing:** direct resource IDs, list filters, search, and exports must not reveal out-of-scope data. Pin with HTTP authorization tests in Tasks 2–7.
3. **Revoked, expired, or disabled sessions:** no protected endpoint or newly issued file link remains accessible after invalidation; previously issued links expire within five minutes. Pin with API/mobile integration tests in Tasks 1, 2, 4, and 7.
4. **Network failure after a mutation:** preserve user input, avoid duplicate submissions/messages, and present retryable feedback. Pin with client service/UI tests in Tasks 3–8.
5. **Untrusted and malformed values:** reject invalid DTOs, dates, search values, file metadata/content, and malformed deep links without leaking internals. Pin with domain tests in Tasks 1 and 3–8.

---

## Program structure and dependency gates

This is a program plan, not one indivisible feature. Each task is a reviewable vertical slice. Tasks 1–2 establish shared prerequisites. Tasks 3–5 can be scheduled independently once Task 2's authorization contract is stable. Tasks 6–7 depend on membership and the file-storage decision. Task 8 depends on account/recovery/backoffice infrastructure decisions; Task 9 depends on search/notification semantics. Task 10 is the production qualification gate.

```text
Task 1: Stabilization/security baseline
          ↓
Task 2: Group/entity membership + roles/authorization
      ↙       ↓       ↘
Task 3 CV   Task 4 archive   Task 5 contacts
                  ↓
           Task 6 conversations
                  ↓
           Task 7 chat mobile/files
      ↘       ↓       ↙
Task 8 account management/backoffice
                  ↓
Task 9 search/notifications/placeholder removal
                  ↓
Task 10 production readiness
```

The existing `docs/superpowers/plans/2026-11-17-full-platform-audit-plan-tests.md` remains the detailed audit and test inventory. This plan is the execution sequence; update that inventory as each slice lands rather than maintaining contradictory duplicate status.

## Task 1: Stabilization and security baseline

**Files:**
- Modify: `apps/mobile/App.tsx`, `apps/mobile/src/access/auth-api.ts`, `apps/mobile/package.json`, `bun.lock`
- Create: `apps/mobile/src/access/session-store.ts`, `apps/mobile/tests/session-store.test.ts`, `apps/mobile/tests/session-restore.test.ts`
- Modify: `apps/api/src/api-bootstrap.ts`, `apps/api/src/modules/health/health.controller.ts`, `apps/api/src/modules/health/health.module.ts`
- Create: `apps/api/src/modules/health/health.service.ts`, `apps/api/tests/health.test.ts`, `apps/api/tests/security-bootstrap.test.ts`
- Modify: `apps/api/scripts/demo-seed-config.ts`, `apps/api/scripts/seed-demo.ts`, `apps/api/tests/environment-safety.test.ts`
- Modify: `apps/api/Dockerfile`, `infra/docker-compose.yml`, `.github/workflows/quality.yml`, `README.md`

**Interfaces:**
- Produce `SessionStore` with `read(): Promise<string | null>`, `write(token: string): Promise<void>`, and `clear(): Promise<void>`; implementation uses Expo SecureStore, never AsyncStorage.
- Produce distinct liveness/readiness endpoints; readiness reports dependency status and returns an unavailable response when PostgreSQL cannot be reached.
- Produce an explicit server HTTP policy: production allow-listed CORS, security headers, bounded request payloads, and rate limits for login/password-sensitive endpoints. Keep policy values configurable and documented.
- Demo seed is enabled only in the explicitly selected development environment; unknown/shared/production environments fail closed and never log credentials.

- [x] **Step 1: Add session persistence and restoration tests** covering absent token, valid `/auth/me`, expired/rejected token, secure-store read/write failure, and logout clearing local state.
- [x] **Step 2: Run the focused mobile tests** with `bun run --filter @fivondronana/mobile test`; confirm new tests fail against in-memory-only session state.
- [x] **Step 3: Implement the SecureStore-backed session service and startup restoration**; render no private screen until restoration resolves, clear invalid credentials on 401, and make logout clear local state even if the network call fails.
- [x] **Step 4: Add API tests** for DB readiness failure/success, production HTTP policy, throttled repeated login attempts, and fail-closed seed environment values.
- [x] **Step 5: Implement health/readiness and HTTP hardening** in the existing Nest bootstrap/modules; select dependencies only if compatible with the pinned Nest/Expo stacks, and document proxy/TLS assumptions.
- [x] **Step 6: Harden seed and deployment image** so the API container runs non-root and migration deployment is an explicit documented job/step, not part of uncontrolled startup.
- [x] **Step 7: Validate the slice** with focused tests, `bun run typecheck`, `bun run lint`, `bun run format:check`, and API build; record any unavailable PostgreSQL or device validation as a remaining check.

## Task 2: Entity membership and authorization foundation

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`, `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/administration/administration.module.ts`
- Create: `apps/api/prisma/migrations/<timestamp>_entity_membership/migration.sql`
- Create: `apps/api/src/modules/entities/entities.module.ts`, `entities.service.ts`, `entities.controller.ts`, `dto/entity-response.dto.ts`
- Create: `apps/api/src/modules/authorization/authorization.module.ts`, `authorization.service.ts`, `roles.ts`, `permissions.ts`, `require-permissions.guard.ts`, `authorization.decorator.ts`
- Create: `apps/api/tests/authorization/authorization.service.test.ts`, `apps/api/tests/authorization/entity-membership.integration.test.ts`, `apps/api/tests/authorization/authorization.http.integration.test.ts`
- Modify: `apps/api/tests/decisions-contract.test.ts`, `docs/decisions/0001-platform-foundation.md`, `apps/mobile/PRODUCT.md`

**Interfaces:**
- Add `Group`, `Entity`, `EntityMembership`, `Role`, and `UserRole` models. `EntityMembership.userId` is unique and carries exactly one `groupId` and one `entityId`; validate the entity/group pairing in services and relational constraints. Accounts may hold both administrator and responsible roles. The development seed must create coherent assignments before protected routes are enabled; there is no production account/client backfill requirement.
- Authorization service exposes `hasPermission(userId, permission, resourceContext?): Promise<boolean>` and throws/returns denial through the existing normalized API error contract.
- Authenticated request context continues to come from `AccessTokenGuard`; role/permission checks are server-side and do not trust client-supplied entity IDs.
- Use the roles in the business requirements: administrator, responsible, responsible d'entité, and responsible général. An account may combine administrator and responsible. Enforce operations/scopes described in the business requirements; gate only a role operation whose scope remains ambiguous.

- [x] **Step 1: Record the confirmed one-group/one-entity rule, dual-role account, CV visibility/export, and initial responsibility catalogue** in ADR, Product, and decision-contract tests.
- [x] **Step 2: Add failing database/service tests** for one group and one entity per responsible, valid entity/group pairing, role coexistence, inactive entity/group behavior, transaction safety, and concurrent duplicate assignment.
- [x] **Step 3: Generate and inspect the Prisma migration** for group/entity/membership/roles; update the development seed and reject incoherent seed assignments.
- [x] **Step 4: Implement reference-data and assignment services** with transaction/constraint enforcement; only admins create/remove official responsibilities, and assigned entries cannot be deleted.
- [x] **Step 5: Add permission primitives and negative HTTP tests** for unauthenticated, disabled, revoked, ordinary-responsible, allowed administrator, wrong entity, and guessed resource ID cases.
- [x] **Step 6: Implement role guards and the business-requirements permission matrix** for administration, responsible, responsible d'entité, and responsible général; test role combinations independently.
- [ ] **Step 7: Run PostgreSQL migration and authorization integration tests** only against the disposable `_test` database; verify rollback/recovery procedure without touching `.env` developer data.

## Task 3: Authorized leader directory and CV access/export

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/cvs/cvs.module.ts`, `apps/api/src/openapi.ts`
- Create: `apps/api/src/modules/users/dto/leader-query.dto.ts`, `leader-response.dto.ts`, `leader.service.ts`
- Create: `apps/api/src/modules/cvs/cv-access.service.ts`, `cv-response.dto.ts`
- Create: `apps/api/tests/users/leader-directory.integration.test.ts`, `apps/api/tests/cvs/cv-access.integration.test.ts`
- Modify: `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/src/main/sample-data.ts`, `apps/mobile/src/access/auth-api.ts`
- Create: `apps/mobile/src/main/leader-api.ts`, `leader-api.test.ts`, `leader-list-state.ts`, `leader-list-state.test.ts`
- Modify: `apps/mobile/tests/main-flow.test.ts`, `apps/mobile/PRODUCT.md`

**Interfaces:**
- `GET /api/leaders` supports bounded `page`, `pageSize`, normalized query, and approved entity/group/responsibility filters; server derives the caller's allowed scope.
- Response DTOs include only approved summary fields; no password/session/internal Prisma fields.
- Every authenticated responsible may read any responsible's CV and download an individual PDF or all CV PDFs, as described in the confirmed product requirements. Only the owner may update their CV.
- Mobile API service parses/validates HTTP response shape at runtime and exposes loading/data/empty/error states.

- [ ] **Step 1: Add failing API tests** for query normalization, stable pagination/sort, response projection, allowed scope, cross-entity filtering, guessed IDs, and no private-field leakage.
- [ ] **Step 2: Implement directory query/service/DTO** with indexed, bounded database query, approved public fields, and deterministic pagination.
- [ ] **Step 3: Add CV access tests** proving responsible users can read/export any responsible's current CV, while only the owner can update.
- [ ] **Step 4: Implement CV detail and individual/all PDF routes** with explicit DTOs and the Tily/Mpanazava templates from the product requirements.
- [ ] **Step 5: Add failing mobile service/state tests** for loading, success, empty, retry, combined filters, malformed response, 401, and offline refresh.
- [ ] **Step 6: Connect directory and CV detail/export screens to the API** and remove production imports of `sample-data.ts`; retain fixtures only in test files.
- [ ] **Step 7: Validate on small screens and verify demo fixture guard** so release cannot bundle or import demonstration records.

## Task 4: Archive metadata and protected document delivery

**Files:**
- Create: `apps/api/src/modules/files/file-storage.port.ts`, `file-storage.module.ts`, `local-test-file-storage.ts`
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/archives/archives.module.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/prisma/migrations/<timestamp>_archives/migration.sql`
- Create: `apps/api/src/modules/archives/archives.service.ts`, `archives.controller.ts`, `dto/archive-query.dto.ts`, `dto/archive-response.dto.ts`, `apps/api/tests/archives/archives.integration.test.ts`
- Modify: `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/package.json`, `apps/mobile/PRODUCT.md`
- Create: `apps/mobile/src/main/archive-api.ts`, `archive-state.ts`, `apps/mobile/tests/archive-api.test.ts`, `archive-state.test.ts`
- Modify: `README.md`, `docs/decisions/0001-platform-foundation.md`

**Interfaces:**
- `FileStorage` offers private `put`, `get`, and `delete` operations by opaque object key; the storage adapter is selected only after provider/environment decision.
- Archive metadata and original bytes are separate. Downloads use short-lived signed URLs (proposed maximum five minutes); the API rechecks authorization before each issuance, and no new URL is issued after access revocation.
- Allowed formats, byte-size limits, scanning and retention must be recorded in the ADR before upload is enabled.
- Archive list API is paginated and returns only published resources visible to the requester.

- [ ] **Step 1: Record approval of short-lived links with a proposed five-minute lifetime**; keep upload disabled until MIME/size/scanning limits and the storage provider are selected.
- [ ] **Step 2: Add failing storage port tests** for opaque keys, checksum, private reads, missing objects, traversal attempts, and cleanup on failed DB transaction.
- [ ] **Step 3: Implement the storage port and test adapter** without storing arbitrary file contents in PostgreSQL.
- [ ] **Step 4: Add failing archive API tests** for pagination, draft exclusion, categories/year filters, authorization on metadata and bytes, guessed object IDs, and revocation.
- [ ] **Step 5: Implement archive schema/service/controllers and migration** with explicit response DTOs and size-bounded streaming.
- [ ] **Step 6: Add mobile API/state tests** for initial skeleton, success, empty, error/retry, offline and download failure; connect the archive screen and preserve original bytes.
- [ ] **Step 7: Validate PDF/Word open behavior on supported devices** and document any unsupported viewer fallback.

## Task 5: Contacts

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/contacts/contacts.module.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/prisma/migrations/<timestamp>_contacts/migration.sql`, `apps/api/src/modules/contacts/contacts.service.ts`, `contacts.controller.ts`, `dto/contact-query.dto.ts`, `dto/contact-response.dto.ts`, `apps/api/tests/contacts/contacts.integration.test.ts`
- Create: `apps/mobile/src/main/contact-api.ts`, `contact-state.ts`, `apps/mobile/tests/contact-api.test.ts`, `contact-state.test.ts`
- Modify: `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/src/main/sample-data.ts`, `apps/mobile/PRODUCT.md`

**Interfaces:**
- Public mobile contact projection hides detailed address/responsibility/phone/description until the user explicitly requests details, as specified by the product requirements.
- Contact list uses bounded search and pagination and includes only published/authorized contacts.
- Telephone/email actions accept only normalized `tel:`/`mailto:` URIs derived from validated fields.

- [x] **Step 1: Add failing API tests** for internal/external contacts, publication status, search, pagination, visibility projection, and unauthorized detail access.
- [x] **Step 2: Implement contact schema, DTO, service, admin CRUD boundary, and migration**; do not expose draft records.
- [x] **Step 3: Add mobile tests** for masked details, reveal-on-request, accent-insensitive search, malformed URI rejection, empty/error/retry, and offline state.
- [x] **Step 4: Connect contact list/detail UI**, remove its fixture imports, and verify native phone/email actions on device or simulator.

## Task 6: Conversation domain and server isolation

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/conversations/conversations.module.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/prisma/migrations/<timestamp>_conversations/migration.sql`, `apps/api/src/modules/conversations/conversations.service.ts`, `conversations.controller.ts`, `conversation-policy.ts`, `dto/conversation-response.dto.ts`, `dto/message-input.dto.ts`, `dto/message-response.dto.ts`
- Create: `apps/api/tests/conversations/conversations.integration.test.ts`, `conversation-policy.test.ts`
- Modify: `docs/decisions/0001-platform-foundation.md`, `apps/mobile/PRODUCT.md`

**Interfaces:**
- Model conversations, membership, messages, and entity scope explicitly. A conversation read/write is allowed only when the authenticated user is an active member and the entity scope matches.
- General-room cardinality and manager roles are set in policy before creating uniqueness constraints or admin mutations.
- Message history is cursor-paginated with deterministic ordering; initial delivery supports text only unless attachment policy is approved.
- Authorization is rechecked for each fetch/send; no client-supplied membership claim is trusted.

- [ ] **Step 1: Resolve and record general-room, membership-management, and role rules** that affect schema or permissions; do not encode unresolved choices.
- [ ] **Step 2: Add failing API/database tests** for member/non-member access, cross-entity access, revoked membership, disabled account, revoked session, guessed conversation/message IDs, pagination order, and atomic membership changes.
- [ ] **Step 3: Implement conversation schema and migration** with indexes and foreign-key deletion behavior aligned to the approved retention rule.
- [ ] **Step 4: Implement policies, services, and controllers** for authorized conversation listing, text send, and cursor history.
- [ ] **Step 5: Run HTTP/PostgreSQL tests** with two independently scoped users; assert every denied request returns the normalized error contract and no data.

## Task 7: Chat mobile, attachments, and notifications transport

**Files:**
- Modify: `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/package.json`, `apps/mobile/PRODUCT.md`
- Create: `apps/mobile/src/main/conversation-api.ts`, `conversation-state.ts`, `apps/mobile/tests/conversation-api.test.ts`, `conversation-state.test.ts`
- Modify: `apps/api/src/modules/conversations/*`, `apps/api/src/modules/files/*`, `apps/api/prisma/schema.prisma`
- Create as policy requires: `apps/api/src/modules/notifications/notifications.module.ts`, `notifications.service.ts`, DTOs, migration and integration tests
- Create: `docs/decisions/0001-platform-foundation.md` updates for transport, attachments and notification semantics

**Interfaces:**
- Mobile conversation service supports authorized list, cursor history, text send, delivery state (`pending | sent | failed`), retry with idempotency key, and membership-revocation cache clearing.
- Realtime transport (polling/SSE/WebSocket) is selected through ADR after scale/hosting needs are known; service contract remains transport-independent.
- Attachments remain disabled until MIME, byte-size, scanning, retention and storage-provider policy is approved.
- Notifications are server-generated only after sources/read/dismissal semantics are approved; no demo notifications in production.

- [ ] **Step 1: Add failing mobile tests** for empty/history/loading, pagination, pending/sent/failed, retry, idempotency, disconnect/reconnect, 401, and membership revocation.
- [ ] **Step 2: Implement chat list/history/send UI and API integration** with accessible composer, keyboard-safe layout, and bounded message rendering.
- [ ] **Step 3: Define an ADR transport choice** and test reconnect/revocation semantics before implementing a real-time transport.
- [ ] **Step 4: Approve file and notification policies before enabling attachments or notifications**; add server and mobile tests for their defined lifecycle.
- [ ] **Step 5: Verify two-user conversation behavior** on integration backend and mobile simulator, including removal of cached content after access revocation.

## Task 8: Account management and backoffice

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/administration/administration.module.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/users/dto/user-admin.dto.ts`, `users.service.ts`, `apps/api/tests/users/user-admin.integration.test.ts`
- Create workspace: `apps/backoffice/package.json`, `apps/backoffice/tsconfig.json`, `apps/backoffice/src/*`, `apps/backoffice/tests/*`
- Modify: `package.json`, `.github/workflows/quality.yml`, `docs/decisions/0001-platform-foundation.md`, `apps/mobile/PRODUCT.md`

**Interfaces:**
- Admin API provisions, activates/deactivates, assigns exactly one group and entity, and manages the official responsibility catalogue; sensitive operations are audited and atomically revoke sessions on deactivation.
- Backoffice is a separate React/TypeScript client. Administrators sign in with the same account credentials as responsible users; server authorization differentiates their roles. Browser session transport and hosting must be selected in ADR before production use.

- [ ] **Step 1: Resolve account fields, email/SMS delivery providers, session duration/remember-me behavior, and backoffice auth transport/hosting** in the ADR before enabling those dependent flows; use the already-confirmed dual-role policy.
- [ ] **Step 2: Add failing admin API tests** for create/update/assign/deactivate/reactivate, duplicate normalized identifiers, forbidden role, validation, audit record, and session revocation.
- [ ] **Step 3: Implement administration services and routes** for account lifecycle and the initial official responsibility catalogue; public registration remains disabled, and responses omit password/session secrets.
- [ ] **Step 4: Scaffold the backoffice workspace and add route/auth/form tests** before UI implementation; authenticate with the shared account credentials, gate routes by administrator role, and wire account list/search/pagination and mutations to actual API responses.
- [ ] **Step 5: Verify admin account lifecycle end to end** and ensure deactivation revokes all sessions; document the selected backoffice auth and hosting decisions.

## Task 9: Global search, notifications, and removal of remaining placeholders

**Files:**
- Create when decisions are approved: `apps/api/src/modules/search/search.module.ts`, `search.service.ts`, `search.controller.ts`, query/response DTOs and `apps/api/tests/search/search.integration.test.ts`
- Create when decisions are approved: `apps/api/src/modules/notifications/notifications.module.ts`, `notifications.service.ts`, controller/DTOs, Prisma migration and integration tests
- Modify: `apps/api/src/app.module.ts`, `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/src/main/sample-data.ts`, `apps/mobile/PRODUCT.md`, `.github/workflows/quality.yml`
- Create: mobile search/notification API/state services and tests; a static fixture-import guard under `apps/mobile/tests/`

**Interfaces:**
- Search is bounded and applies the same server-side authorization scope as the underlying resources.
- Notification creation, read/unread state, dismissal, and retention follow explicitly approved product semantics; no demo notifications appear in production.
- Every visible control performs a real action or is removed/clearly marked unavailable; sample-data imports are forbidden outside tests or an explicit demo-only entry point.

- [ ] **Step 1: Resolve global-search scope and notification sources/read/dismissal semantics** in the ADR before implementing dependent behavior.
- [ ] **Step 2: Add failing API tests** for search query bounds, accent handling, pagination, unauthorized resource exclusion, and notification ownership/read/dismissal semantics.
- [ ] **Step 3: Implement only approved search and notification operations** with permission-scoped queries and explicit response DTOs.
- [ ] **Step 4: Add mobile loading/empty/error/retry tests and connect approved screens** to server-backed data.
- [ ] **Step 5: Walk every visible mobile action**, add behavior tests, connect it to API, or remove/disable it; enforce sample-data import boundaries in CI.

## Task 10: Production readiness and release qualification

**Files:**
- Modify: `.github/workflows/quality.yml`, `apps/api/Dockerfile`, `infra/docker-compose.yml`, `README.md`, `apps/mobile/PRODUCT.md`, `docs/decisions/0001-platform-foundation.md`
- Create: `infra/deploy/` migration/deployment job definitions as selected, `docs/runbooks/deployment.md`, `docs/runbooks/backup-restore.md`, `docs/runbooks/api-incident.md`
- Add or update: API/mobile end-to-end tests and release smoke tests in established test locations.

**Interfaces:**
- CI performs locked install, Prisma validation/generation, migration validation on disposable PostgreSQL, formatting, lint, typecheck, unit/integration tests, API build, and mobile Expo validation/build appropriate to available runners.
- CD uses explicit environment promotion and approval for production; migrations run as a controlled job; deployment has smoke checks and documented rollback constraints.
- Backups are encrypted, external to the DB container, retained by policy, and periodically restored in a non-production environment; RPO/RTO are recorded only after product/operations owners set targets.
- Logs include request correlation and avoid passwords, access tokens, CV PII, message contents, and private file metadata.

- [ ] **Step 1: Add failing CI/configuration checks** for release fixture guard, non-root runtime, migration artifact availability, and required mobile validation.
- [ ] **Step 2: Implement CI additions** while preserving the existing quality workflow and deterministic lockfile install.
- [ ] **Step 3: Select deployment/storage/backup targets and record cost/ownership/RPO/RTO** before creating environment-specific production configuration.
- [ ] **Step 4: Add deployment, migration, rollback, backup/restore, and incident runbooks** based on the selected provider and verified commands.
- [ ] **Step 5: Run full CI on a clean checkout and release-candidate smoke flow**; record exact skipped device/external checks and block production readiness until required owners sign off.

## Handoff and execution protocol

- Work in dependency order and keep each task independently reviewable; do not combine unrelated domain slices into one change.
- Before each code change, create/update the owning failing test, run it to confirm the expected failure, then implement the narrowest passing change.
- Do not use existing `.env` credentials in test setup or print them in command output.
- Do not commit or deploy unless separately requested; preserve existing user changes and review `git status` before and after each task.
- At each slice boundary, report objective, findings, changes, files, functionality, security, checks actually run, results, remaining risks, decisions needed, and next slice.
- Any unresolved product decision blocks only the dependent behavior; continue independent work and leave that behavior disabled.
