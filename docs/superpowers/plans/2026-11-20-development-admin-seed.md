# Development Administrator Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let developers seed a private, environment-configured administrator for local backoffice login without adding default credentials or a production bootstrap.

**Architecture:** Extend the existing development-only demo seed and its environment-validation helper. Create an administrator-only user when the configured email is unused; leave an existing administrator and its password untouched, and reject an email already owned by a non-administrator.

**Tech Stack:** TypeScript, Bun test, Prisma, existing password hashing helper.

**Spec:** `docs/superpowers/specs/2026-11-20-development-admin-seed-design.md`

## Global Constraints

- Only `APP_ENV=development` may run the demo seed.
- Do not commit fixed administrator credentials or read the local `.env` during this work.
- Do not execute the seed or mutate any database.
- Hash the configured password with the existing `hashPassword` helper.

## Review Focus

- Missing or partial credential configuration: no admin is created if both values are absent; fail clearly if only one is supplied.
- Existing email belongs to a non-administrator: fail without changing that account or its roles.
- Repeated seed for an existing administrator: do not reset password or account status.
- Production or staging environment: the existing environment guard rejects the seed before database work.
- Malformed administrator email: reject it before database work.

---

### Task 1: Add safe environment-driven admin provisioning to the development seed

**Files:**
- Modify: `apps/api/scripts/demo-seed-config.ts`
- Create: `apps/api/scripts/demo-admin-seed.ts`
- Modify: `apps/api/tests/environment-safety.test.ts`
- Create: `apps/api/tests/demo-admin-seed.test.ts`
- Modify: `apps/api/scripts/seed-demo.ts`
- Modify: `.env.example`

**Interfaces:**
- `getDemoAdminCredentials(env)` returns `undefined` when both admin variables are absent; otherwise returns a trimmed email and the exact configured password, or throws a descriptive error for partial/invalid configuration.
- The seed only creates an admin when credentials are configured. The display name is `Administrateur démo`; the account has only `ADMINISTRATOR`, is active, and has no membership or responsibilities.

- [x] **Step 1: Add failing environment configuration tests**

In `environment-safety.test.ts`, cover both values absent, valid values, partial values, malformed email domains, and rejection of the reserved demo responsible email. Assert passwords are not trimmed or rewritten.

- [x] **Step 2: Run the focused test and verify the expected failure**

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: FAIL because `getDemoAdminCredentials` is not exported yet.

- [x] **Step 3: Implement the minimal credential parser**

Add `getDemoAdminCredentials` in `demo-seed-config.ts`; extend its environment type with `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD`. Treat two unset/empty values as no admin; reject a partial pair, invalid email using the application's `class-validator`, and the reserved demo responsible address. Preserve the password exactly.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: PASS.

- [x] **Step 5: Add failing provisioning tests**

Test `ensureDemoAdministrator` with an in-memory store: a new address creates an active `Administrateur démo` with an activation timestamp, only the administrator role, and a verifiable hash; an existing administrator is untouched; an existing non-administrator address throws without a create/update call.

- [x] **Step 6: Run the provisioning tests and verify the expected failure**

Run: `bun test apps/api/tests/demo-admin-seed.test.ts`
Expected: FAIL because `ensureDemoAdministrator` is not exported yet.

- [x] **Step 7: Implement provisioning and connect the seed**

Add `ensureDemoAdministrator(store, credentials)` in `demo-admin-seed.ts`. Use an injected store contract so unit tests can verify real helper behavior without a database. Hash the configured password with `hashPassword`. In `seed-demo.ts`, after the existing environment guard, parse credentials and call the helper only when configured. Keep the existing responsible demo seed unchanged.

- [x] **Step 8: Run the provisioning tests and verify they pass**

Run: `bun test apps/api/tests/demo-admin-seed.test.ts`
Expected: PASS.

- [x] **Step 9: Document local configuration**

Add blank `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` entries in `.env.example`, with a comment that both are optional, private local values and are used only by the development demo seed.

- [ ] **Step 10: Run focused and project verification**

Focused tests pass (13/13), Biome passes, and VS Code reports no diagnostics in changed TypeScript files. The full typecheck and repository test command were attempted but are blocked by worktree dependency/generated-client setup, a separate ADR contract test failure, and a missing Nest Express driver; see the plan ledger. The database seed was not run.

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: PASS.

Run: `bun run typecheck`
Expected: PASS for all workspaces.

Run: `bun run test`
Expected: PASS. Do not run `db:seed:demo`.
