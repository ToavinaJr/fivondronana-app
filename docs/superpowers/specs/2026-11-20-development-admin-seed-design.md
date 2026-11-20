# Development Administrator Seed

## Intent

Make a first backoffice login available in local development without shipping a shared administrator password or creating a production default account.

## Design

The existing demo seed will optionally create an administrator-only account using `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` from the local `.env`. The display name will be `Administrateur démo`. The seed remains guarded by `APP_ENV=development`; it will not read these values or create an administrator in production. The account will have only the `ADMINISTRATOR` role and no entity membership or responsibilities.

The seed will create the account if the configured email is unused. Re-running it will leave the password and account state unchanged when that account is already an administrator; it will fail safely if the email belongs to a non-administrator account. This prevents silently taking over an existing account or resetting its password. Passwords will be hashed using the project's existing auth crypto.

## Approaches considered

- Fixed demo credentials: easy to discover, but creates a shared password and is not selected.
- Environment-configured credentials in the existing development-only seed: selected because it preserves the current workflow without committing a reusable secret.
- A separate one-time bootstrap CLI: stronger separation, but adds a second setup workflow without benefit for this local demo need.

## Scope and constraints

- Document the two required variables in `.env.example`; keep values blank so the developer chooses a private local password.
- Extend seed configuration validation and unit tests for missing/invalid admin credentials and production guard behavior.
- Extend `seed-demo.ts` to provision the admin-only user idempotently.
- Do not run the seed or modify any database as part of implementation.
- No production bootstrap mechanism, UI change, schema migration, or fixed login credentials.

## Success criteria

With valid local `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` and `APP_ENV=development`, running the existing demo seed creates an administrator that can authenticate to the backoffice. The same seed cannot create an administrator outside development, and reruns do not reset an existing admin's password.
