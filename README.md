# FIVONDRONANA Platform

FIVONDRONANA platform monorepo: Expo mobile client, NestJS API, and PostgreSQL/Prisma persistence. Product requirements are in [docs/Application mobile FIVONDRONANA.md](./docs/Application%20mobile%20FIVONDRONANA.md). Open product and architecture decisions are tracked in [ADR 0001](./docs/decisions/0001-platform-foundation.md).

## Workspace

- `apps/mobile`: Expo / React Native application shell.
- `apps/api`: NestJS API, authentication, personal CV endpoints, and Prisma schema.
- `infra/docker-compose.yml`: local PostgreSQL service.
- `apps/backoffice`: planned; not created yet. The intended initial direction is an internal web portal using React and TypeScript, subject to the decisions in ADR 0001.

The back-office client is intentionally not scaffolded yet because its platform and access model are not specified.

## Prerequisites

- Bun 1.4.4 or later.
- Docker with Docker Compose.
- Expo development tooling for running the mobile app on a simulator or device.

The package versions are pinned to compatible framework release lines in each workspace manifest. Expo SDK 58 targets React Native 0.88 and React 19.3. NestJS 12 and Prisma 7 are used as the API baseline. Recheck upstream compatibility before upgrades.

## Local development

1. Copy `.env.example` to `.env`, replace `POSTGRES_PASSWORD`, and set a random `JWT_SECRET` of at least 32 characters. Keep `.env` untracked. `EXPO_PUBLIC_API_URL` is bundled into the mobile client and must contain only a public API address, never a secret.
2. Start PostgreSQL with `docker compose --env-file .env -f infra/docker-compose.yml up -d postgres`.
3. Install dependencies and create the Bun lockfile with `bun install`.
4. Generate the Prisma client with `bun run db:generate`.
5. Start the API with `bun run dev:api`. This also starts (and waits for) the local ClamAV container required by Arisiva uploads; run `bun run clamav:up` on its own if you need it without the API.
6. In a second terminal, start Expo with `bun run dev:mobile`. For a physical phone, the mobile client must use the development computer's LAN IP rather than `localhost`.

For database deployments, run `bun run db:deploy` as an explicit release step before starting the API; the API container never applies migrations at startup. To run the containerized API with PostgreSQL locally, apply migrations first, then use `docker compose --env-file .env -f infra/docker-compose.yml up --build`. Ports bind to `127.0.0.1` by default. For a physical phone, set `API_BIND_ADDRESS` and `EXPO_PUBLIC_API_URL` to the development machine's LAN address; leave `POSTGRES_BIND_ADDRESS` on loopback.

To create the first production administrator, set `APP_ENV=production`, `BOOTSTRAP_ADMIN_CONFIRM=YES`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` for a one-time `bun run --filter @fivondronana/api db:bootstrap-admin` invocation. Use a password of at least 12 characters. The command hashes the password, creates an active `ADMINISTRATOR`, and refuses to run if the database already contains any user. Do not put the bootstrap credentials in the persistent `.env`; clear them from the shell after running the command.

The API exposes liveness at `GET /api/health` and database readiness at `GET /api/health/ready`. Configure `CORS_ALLOWED_ORIGINS` as a comma-separated HTTPS origin allowlist in production, `API_BODY_LIMIT` (default `100kb`), `AUTH_RATE_LIMIT` (default 10), and `AUTH_RATE_WINDOW_SECONDS` (default 60). Login and password endpoints are throttled in-process per client IP; deploy behind a trusted TLS-terminating proxy and do not enable proxy-IP trust until its trusted hops are configured. Routes include login/session and own-CV services, plus admin-guarded `GET/POST /api/admin/entities`, `POST /api/admin/entities/:entityId/groups`, activation controls, `POST /api/admin/entity-assignments`, and responsibility catalogue/assignment endpoints. Membership is unique per responsible and the database enforces that the selected group belongs to the selected entity. Leader directory, admin user provisioning, archives, contacts, conversations, notifications, and the backoffice are not implemented yet. Demo seed is enabled only with `APP_ENV=development`, requires a local development database, and never prints the password; use `bun run db:seed:demo` only after setting that explicit environment.

## Checks

- `bun run typecheck`: TypeScript checks in all workspaces.
- `bun run format:check`: verify formatting without changing files.
- `bun run lint`: lint API, mobile, and shared scripts.
- `bun run --filter @fivondronana/api test`: API unit tests.
- `bun run --filter @fivondronana/mobile test`: mobile unit tests.
- `bun run test:integration`: starts the isolated, ephemeral `postgres-test` container (`infra/docker-compose.test.yml`, tmpfs-backed, never shares the development volume), applies migrations, runs the API/PostgreSQL integration tests, then tears the container down. Requires `POSTGRES_TEST_PORT` and `POSTGRES_TEST_PASSWORD` set, and `DATABASE_URL_TEST` pointing at that same container with a database name ending in `_test`.
- `bun run build:api`: generate the Prisma client and build the API.
- `GET /api/docs`: interactive OpenAPI documentation when the API is running.

## Product and architecture decisions

Pending policy and infrastructure decisions are recorded in [ADR 0001](./docs/decisions/0001-platform-foundation.md).
