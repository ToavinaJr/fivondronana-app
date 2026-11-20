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
- Modify: `apps/api/tests/environment-safety.test.ts`
- Modify: `apps/api/scripts/seed-demo.ts`
- Modify: `.env.example`

**Interfaces:**
- `getDemoAdminCredentials(env)` returns `undefined` when both admin variables are absent; otherwise returns a trimmed email and the exact configured password, or throws a descriptive error for partial/invalid configuration.
- The seed only creates an admin when credentials are configured. The display name is `Administrateur démo`; the account has only `ADMINISTRATOR`, is active, and has no membership or responsibilities.

- [ ] **Step 1: Add failing environment configuration tests**

In `environment-safety.test.ts`, cover both values absent, valid values, partial values, and malformed email. Assert passwords are not trimmed or rewritten.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: FAIL because `getDemoAdminCredentials` is not exported yet.

- [ ] **Step 3: Implement the minimal credential parser**

Add `getDemoAdminCredentials` in `demo-seed-config.ts`; extend its environment type with `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD`. Treat two unset/empty values as no admin; reject a partial pair and an invalid email. Preserve the password exactly.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: PASS.

- [ ] **Step 5: Add seed provisioning behavior**

Before creating admin data, call `assertDemoSeedAllowed` as today, then parse the optional credentials. For a configured email, look up the user with its roles. If absent, create an active user with `hashPassword(configuredPassword)` and an `ADMINISTRATOR` role only. If already an administrator, do nothing. If the email exists without that role, throw without modifying it. Keep the existing responsible demo seed unchanged.

- [ ] **Step 6: Document local configuration**

Add blank `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` entries in `.env.example`, with a comment that both are optional, private local values and are used only by the development demo seed.

- [ ] **Step 7: Run focused and project verification**

Run: `bun test apps/api/tests/environment-safety.test.ts`
Expected: PASS.

Run: `bun run typecheck`
Expected: PASS for all workspaces.

Run: `bun run test`
Expected: PASS. Do not run `db:seed:demo`.
