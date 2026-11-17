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
5. Start the API with `bun run dev:api`.
6. In a second terminal, start Expo with `bun run dev:mobile`. For a physical phone, the mobile client must use the development computer's LAN IP rather than `localhost`.

To run the containerized API with PostgreSQL instead, use `docker compose --env-file .env -f infra/docker-compose.yml up --build` and skip step 5. Ports bind to `127.0.0.1` by default. For a physical phone, set `API_BIND_ADDRESS` and `EXPO_PUBLIC_API_URL` to the development machine's LAN address; leave `POSTGRES_BIND_ADDRESS` on loopback.

The API currently exposes `GET /api/health`, login/session routes (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/password`), and the authenticated user's CV routes (`GET /api/cvs/me`, `PUT /api/cvs/me`). Authentication sessions and CV data are persisted with Prisma. Leader directory, admin user management, archives, contacts, conversations, notifications, and the backoffice are not implemented yet. The demo seed is for local development only and is disabled in production; use `bun run db:seed:demo` only with a local development database.

## Checks

- `bun run typecheck`: TypeScript checks in all workspaces.
- `bun run format:check`: verify formatting without changing files.
- `bun run lint`: lint API, mobile, and shared scripts.
- `bun run --filter @fivondronana/api test`: API unit tests.
- `bun run --filter @fivondronana/mobile test`: mobile unit tests.
- `bun run test:integration`: run the API/PostgreSQL integration test after setting both `DATABASE_URL` and `DATABASE_URL_TEST` to the same disposable database whose name contains `_test`. This command applies migrations to that database.
- `bun run build:api`: generate the Prisma client and build the API.
- `GET /api/docs`: interactive OpenAPI documentation when the API is running.

## Product and architecture decisions

The source requirements conflict on whether one leader may belong to multiple entities. That cardinality and the related CV visibility rule must be confirmed before they are encoded in schema constraints or authorization. Other pending decisions and the recommended backoffice direction are recorded in [ADR 0001](./docs/decisions/0001-platform-foundation.md).
