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
- Recovery delivery (SendGrid email), file upload types/limits (5 MB, extension/MIME/antivirus checks), long-lived "Tsarovy aho" sessions, notification semantics (Postgres-backed, real events), and conversation role scope (entity manager/general manager) are now confirmed in `docs/decisions/0001-platform-foundation.md` (18 November 2026 update) and may be implemented. Only the production file-storage host (Neon vs self-hosted Postgres), backoffice hosting, and volumetry/SLO targets remain open, and none of the three blocks implementation — each is a connection-string/deployment choice behind an already-abstracted interface, deferred until the real need arises.
- Before any new feature that depends on PostgreSQL integration tests proceeds, the disposable `fivondronana_test` database must be recreated with valid `DATABASE_URL_TEST` credentials and the currently-skipped integration tests (authorization, leader directory, entity membership, contacts) must be run for real. Any script that recreates or resets this database must verify its target connection string before any destructive operation, and never touch a developer or production database.
- Every Prisma schema change must have a reviewed versioned migration; production migration execution is a controlled deployment step, not an implicit API startup side effect.

## Review Focus

1. **Group/entity reassignment and concurrent assignment:** a responsible must never acquire more than one group or entity, including through racing administration requests. Pin with PostgreSQL uniqueness/transaction tests in Task 2.
2. **Cross-entity identifier probing:** direct resource IDs, list filters, search, and exports must not reveal out-of-scope data. Pin with HTTP authorization tests in Tasks 2–7.
3. **Revoked, expired, or disabled sessions:** no protected endpoint or newly issued file link remains accessible after invalidation; previously issued links expire within five minutes. Pin with API/mobile integration tests in Tasks 1, 2, 4, and 7.
4. **Network failure after a mutation:** preserve user input, avoid duplicate submissions/messages, and present retryable feedback. Pin with client service/UI tests in Tasks 3–8.
5. **Untrusted and malformed values:** reject invalid DTOs, dates, search values, file metadata/content, and malformed deep links without leaking internals. Pin with domain tests in Tasks 1 and 3–8.

---

## Program structure and dependency gates

This is a program plan, not one indivisible feature. Each task is a reviewable vertical slice. Tasks 1–2 establish shared prerequisites. Tasks 3–5 can be scheduled independently once Task 2's authorization contract is stable — **Tasks 1, 2, 3, and 5 are implemented** (see `.superpowers/sdd/2026-11-18-platform-completion/progress.md`); Task 2 Step 7 and Task 3/5's PostgreSQL integration tests still need the test-database infrastructure fix below before they can run for real. Tasks 6–7 depend on membership (done) and the file-storage/conversation-role decisions (now confirmed in the ADR, so these are unblocked). Task 8's product scope and account/recovery decisions are confirmed; only backoffice hosting is deliberately deferred and does not block its implementation. Task 9 depends on search/notification semantics (notifications now confirmed; global search scope is still open). Task 10 is the production qualification gate and intentionally waits on real volumetry/SLO needs.

```text
Task 1: Stabilization/security baseline [done]
          ↓
Task 2: Group/entity membership + roles/authorization [done; integration tests pending Task 2b]
      ↙       ↓       ↘
Task 3 CV [done]   Task 4 archive   Task 5 contacts [done]
      ↘       ↓       ↙
Task 2b: Test database infrastructure (recreate `_test` DB, fix credentials,
         reactivate skipped integration tests for Tasks 2/3/5) — run before
         relying on any newly-written PostgreSQL integration test
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

## Task 2b: Test database infrastructure (new prerequisite)

**Why now:** `DATABASE_URL_TEST` in `.env` currently points at credentials PostgreSQL rejects (P1000), so every PostgreSQL integration test added since Task 2 (authorization, entity membership, leader directory, contacts) is `describe.skipIf`-disabled and has never actually run. This was tracked as a blocker in `.superpowers/sdd/2026-11-18-platform-completion/progress.md` under Task 2 Step 7 and now has an explicit decision to resolve it before more integration tests accumulate unverified.

**Files:**
- Modify: `.env` (`DATABASE_URL_TEST` only — never the development `DATABASE_URL`), `infra/docker-compose.yml` if a dedicated test database/role is added there.
- Modify (verify, no behavior change expected): every file under `apps/api/tests/**/*.integration.test.ts` that reads `DATABASE_URL_TEST`.

**Interfaces:**
- The test database is a separate PostgreSQL database (name ends in `_test`, already enforced by each integration test's own guard clause) with its own role/credentials, never shared with the development or production database.
- Every integration test file already asserts its connection string's path ends with `_test` before connecting; keep that guard — do not relax it to unblock this work.

- [ ] **Step 1: Decide and provision the disposable test database.** Create (or recreate, if the existing `fivondronana_test` database/role has diverged) a PostgreSQL database dedicated to tests, in the same local PostgreSQL instance used for development (`infra/docker-compose.yml`) or a separate throwaway instance — either is acceptable as long as it is never the development or production database. **Before dropping or recreating anything, confirm the exact connection string/target with the person running this step and confirm no needed data lives there; this is a destructive step and must not run against a guessed or ambiguous target.**
- [ ] **Step 2: Set valid credentials in `DATABASE_URL_TEST`** (in `.env`, never committed) and confirm `psql`/Prisma can connect.
- [ ] **Step 3: Apply Prisma migrations to the test database** (`prisma migrate deploy` against `DATABASE_URL_TEST`, not `migrate dev`, since this is a disposable target that should mirror production's deploy path).
- [ ] **Step 4: Run the full API suite** (`bun test` in `apps/api`) and confirm every previously-skipped `describe.skipIf(!connectionString)` integration test now executes and passes, including cleanup (`afterAll` deletes) leaving the database empty between runs.
- [ ] **Step 5: Document the working setup** (connection shape, how to reset) in `README.md` so the next contributor does not rediscover this gap; update `.superpowers/sdd/2026-11-18-platform-completion/progress.md` Task 2 Step 7 to reflect the unblock.

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

**Decided (`docs/decisions/0001-platform-foundation.md`, 18 November 2026):** 5 MB maximum per file; mandatory checks before a file is ever servable are extension allow-list, real (sniffed, not declared) MIME-type verification, size rejection, and an antivirus scan. Storage goes through the existing `FileStorage` port, implemented in development against PostgreSQL (object bytes in a dedicated table keyed by opaque object id, separate from archive metadata — not an ad hoc blob column on the archive row itself). The production storage host (Neon-managed vs self-hosted PostgreSQL) is still open but is purely a connection string behind the same port, so it does not block this task. **One sub-decision is still genuinely open and must be made before Step 5 can be called complete: which antivirus mechanism to call** (e.g. a local ClamAV daemon, a hosted scanning API) — pick one, or explicitly stub it behind a `VirusScanner` port with a clearly-labeled "not yet wired to a real engine" dev implementation that blocks publish until replaced, so nothing silently ships as scanned when it is not.

**Interfaces:**
- `FileStorage` offers private `put`, `get`, and `delete` operations by opaque object key. The PostgreSQL-backed adapter stores bytes in a dedicated table (e.g. `FileObject { id, data: Bytes, byteSize, contentType, checksum, createdAt }`) and is the implementation used in both development and (until a different host is chosen) production.
- A separate `VirusScanner` port (`scan(bytes): Promise<'clean' | 'infected'>`) is called before an uploaded object is marked available; a file is rejected and never stored if the scan reports infected or the provider is unreachable (fail closed, not fail open).
- Archive metadata and original bytes are separate. Downloads use short-lived signed URLs (proposed maximum five minutes); the API rechecks authorization before each issuance, and no new URL is issued after access revocation.
- Uploads are rejected above 5 MB, outside the allowed extension list, or when the sniffed MIME type does not match the declared/allowed type.
- Archive list API is paginated and returns only published resources visible to the requester.

- [ ] **Step 1: Pick and record the antivirus scanning mechanism** (the one remaining open sub-decision) in the ADR, or implement the fail-closed stub described above with an explicit tracking note; do not present either as a complete AV integration if it is a stub.
- [ ] **Step 2: Add failing storage/scanner port tests** for opaque keys, checksum, private reads, missing objects, traversal attempts, infected/unreachable-scanner rejection, and cleanup on failed DB transaction.
- [ ] **Step 3: Implement the PostgreSQL-backed `FileStorage` adapter and the `VirusScanner` port** (5 MB cap, extension allow-list, sniffed-MIME check enforced before bytes are persisted).
- [ ] **Step 4: Add failing archive API tests** for pagination, draft exclusion, categories/year filters, authorization on metadata and bytes, guessed object IDs, oversized/mistyped/infected upload rejection, and revocation.
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

**Decided (`docs/decisions/0001-platform-foundation.md`, 18 November 2026):** entity-scoped conversations (one per entity; a responsible and an entity manager read/write only their own entity's conversation) and exactly one general conversation (every responsible can read it; a general manager and administrators can write to it on behalf of the organization, per the already-confirmed actor table in `apps/mobile/PRODUCT.md`). Realtime transport is explicitly deferred to Task 7 Step 3 and does not block this task's schema/policy/API work.

**Still open for Step 1 below (the one real unresolved question):** whether conversation membership is purely derived from the responsible's current entity/group/role (no membership table, a computed scope check) or explicitly modeled as its own joinable/removable record (an administrator can add/remove a member independent of their entity assignment). This changes the schema and whether Task 8's backoffice needs a membership-management screen. Resolve it with the product owner before Step 3, not by assumption.

**Interfaces:**
- Model conversations, (derived-or-explicit, per Step 1) membership, messages, and entity scope explicitly. A conversation read/write is allowed only when the authenticated user is an active member and the entity scope matches.
- Exactly one general conversation exists platform-wide; every responsible may read it, and only a general manager or administrator may write to it, per the confirmed actor table.
- Message history is cursor-paginated with deterministic ordering; initial delivery supports text only unless attachment policy is approved.
- Authorization is rechecked for each fetch/send; no client-supplied membership claim is trusted.

- [ ] **Step 1: Resolve and record the membership-modeling question above** (derived vs. explicit); the entity-scope and general-room rules are already decided and do not need re-litigating.
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

**Decided:** notifications are Postgres-backed and sourced from real application events (no demo notifications in production), with read/unread and user-initiated deletion — see Task 9, which owns the notifications module; this task only consumes it. Attachments remain gated on Task 4's file-storage/scanning work landing first (same `FileStorage`/`VirusScanner` ports, same 5 MB limit).

**Interfaces:**
- Mobile conversation service supports authorized list, cursor history, text send, delivery state (`pending | sent | failed`), retry with idempotency key, and membership-revocation cache clearing.
- Realtime transport (polling/SSE/WebSocket) is picked during this task's implementation from the hosting constraints known at that time (no ADR vote required first); the service contract stays transport-independent so the choice can change later without an API break.
- Attachments stay disabled until Task 4's `FileStorage`/`VirusScanner` adapters are in place; then they reuse the same 5 MB/extension/MIME/scan checks rather than a separate policy.
- Notifications are server-generated from real events only (Task 9); no demo notifications in production.

- [ ] **Step 1: Add failing mobile tests** for empty/history/loading, pagination, pending/sent/failed, retry, idempotency, disconnect/reconnect, 401, and membership revocation.
- [ ] **Step 2: Implement chat list/history/send UI and API integration** with accessible composer, keyboard-safe layout, and bounded message rendering.
- [ ] **Step 3: Pick the realtime transport from current hosting constraints** (polling is the simplest default if nothing else is already decided) and test reconnect/revocation semantics against it.
- [ ] **Step 4: Enable attachments once Task 4's storage/scanning ports exist**; add server and mobile tests for their defined lifecycle (reusing Task 4's limits, not inventing new ones).
- [ ] **Step 5: Verify two-user conversation behavior** on integration backend and mobile simulator, including removal of cached content after access revocation.

## Task 8: Account management and backoffice

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/administration/administration.module.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/users/dto/user-admin.dto.ts`, `users.service.ts`, `apps/api/tests/users/user-admin.integration.test.ts`
- Create workspace: `apps/backoffice/package.json`, `apps/backoffice/tsconfig.json`, `apps/backoffice/src/*`, `apps/backoffice/tests/*`
- Modify: `package.json`, `.github/workflows/quality.yml`, `docs/decisions/0001-platform-foundation.md`, `apps/mobile/PRODUCT.md`

**Decided:** mobile tokens use Expo SecureStore; browser sessions use `Secure; HttpOnly; SameSite=Lax` cookies with CSRF proof and strict origin checks. Sessions last 24 hours by default and 30 days with "Tsarovy aho"; access tokens last 15 minutes. Recovery currently uses SendGrid email. Backoffice hosting remains deferred.

- [x] **Step 1: Resolve the backoffice browser session transport** — secure HttpOnly cookies, CSRF proof, strict origin checks; mobile remains SecureStore-backed.
- [x] **Step 2: Add failing admin API tests** for create/update/assign/deactivate/reactivate, duplicate normalized identifiers, forbidden role, validation, audit record, and session revocation. Verified against disposable PostgreSQL; the initial HTTP directory test failed with 404 before implementation.
- [x] **Step 3: Implement administration services and routes** for account lifecycle and the initial official responsibility catalogue; public registration remains disabled, and responses omit password/session secrets. Account activation uses 24-hour single-use SendGrid links; migration is additive.
- [x] **Step 4a: Scaffold the backoffice workspace and implement authentication** with shared account credentials, admin-role gating, credentialed cookie requests, generic recovery, activation, and password-reset screens. Helper/security tests and production build pass.
- [ ] **Step 4b: Add route/form integration tests and wire account list/search/pagination and mutations** to actual API responses; account-management UI is outside this authentication slice.
- [ ] **Step 5: Verify admin account lifecycle end to end** and ensure deactivation revokes all sessions; document the selected backoffice session-transport decision in the ADR (hosting can stay "deferred, Vercel likely").

## Task 9: Global search, notifications, and removal of remaining placeholders

**Files:**
- Create when decisions are approved: `apps/api/src/modules/search/search.module.ts`, `search.service.ts`, `search.controller.ts`, query/response DTOs and `apps/api/tests/search/search.integration.test.ts`
- Create when decisions are approved: `apps/api/src/modules/notifications/notifications.module.ts`, `notifications.service.ts`, controller/DTOs, Prisma migration and integration tests
- Modify: `apps/api/src/app.module.ts`, `apps/mobile/src/main/MainShell.tsx`, `apps/mobile/src/main/sample-data.ts`, `apps/mobile/PRODUCT.md`, `.github/workflows/quality.yml`
- Create: mobile search/notification API/state services and tests; a static fixture-import guard under `apps/mobile/tests/`

**Decided (`docs/decisions/0001-platform-foundation.md`, 18 November 2026):** notifications are PostgreSQL-backed, generated from real application events (not demo fixtures), with user-facing read/unread state and deletion; no demo notifications in production. **Still open:** the exact set of event sources that generate a notification (e.g. a new archive publish, a new message, a responsibility reassignment) — the product doc's existing journeys give the shape, but the full enumerated list should be confirmed with the product owner in Step 1 before the schema is finalized, since that list drives the Prisma model's discriminated fields. Global search scope remains fully open (not addressed by the recent decisions) and still needs its own resolution before Step 1 covers it.

**Interfaces:**
- Search is bounded and applies the same server-side authorization scope as the underlying resources.
- Notification creation, read/unread state, dismissal, and retention follow the PostgreSQL-backed, real-events semantics above; no demo notifications appear in production.
- Every visible control performs a real action or is removed/clearly marked unavailable; sample-data imports are forbidden outside tests or an explicit demo-only entry point.

- [ ] **Step 1: Confirm the enumerated notification event-source list with the product owner, and resolve global-search scope** (still fully open) before implementing dependent behavior; notification storage/read/dismissal semantics themselves are already decided.
- [ ] **Step 2: Add failing API tests** for search query bounds, accent handling, pagination, unauthorized resource exclusion, and notification ownership/read/dismissal semantics.
- [ ] **Step 3: Implement search and the confirmed notification event sources** with permission-scoped queries and explicit response DTOs.
- [ ] **Step 4: Add mobile loading/empty/error/retry tests and connect approved screens** to server-backed data.
- [ ] **Step 5: Walk every visible mobile action**, add behavior tests, connect it to API, or remove/disable it; enforce sample-data import boundaries in CI.

## Task 10: Production readiness and release qualification

**Decided:** volumetry, latency, availability, and RPO/RTO targets are deliberately deferred until a real need appears (`docs/decisions/0001-platform-foundation.md`) — this task's Step 3 should not be forced earlier just because other tasks finished; it remains the last gate by design.

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
