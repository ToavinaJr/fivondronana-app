# FIVONDRONANA Platform

Foundation for the FIVONDRONANA mobile application and API. The product requirements are in [docs/Application mobile FIVONDRONANA.md](./docs/Application%20mobile%20FIVONDRONANA.md).

## Workspace

- `apps/mobile`: Expo / React Native application shell.
- `apps/api`: NestJS API shell and Prisma schema.
- `infra/docker-compose.yml`: local PostgreSQL service.

The back-office client is intentionally not scaffolded yet because its platform and access model are not specified.

## Prerequisites

- Bun 1.4.4 or later.
- Docker with Docker Compose.
- Expo development tooling for running the mobile app on a simulator or device.

The package versions are pinned to compatible framework release lines in each workspace manifest. Expo SDK 58 targets React Native 0.88 and React 19.3. NestJS 12 and Prisma 7 are used as the API baseline. Recheck upstream compatibility before upgrades.

## Local development

1. Copy `.env.example` to `.env` and replace `POSTGRES_PASSWORD` with a unique local value. Keep `.env` untracked.
2. Start PostgreSQL with `docker compose --env-file .env -f infra/docker-compose.yml up -d postgres`.
3. Install dependencies and create the Bun lockfile with `bun install`.
4. Generate the Prisma client with `bun run db:generate`.
5. Start the API with `bun run dev:api`.
6. In a second terminal, start Expo with `bun run dev:mobile`.

To run the containerized API with PostgreSQL instead, use `docker compose --env-file .env -f infra/docker-compose.yml up --build` and skip step 5. Ports bind to `127.0.0.1` by default. For a physical phone, set `API_BIND_ADDRESS` and `EXPO_PUBLIC_API_URL` to the development machine's LAN address; leave `POSTGRES_BIND_ADDRESS` on loopback.

The initial API exposes `GET /api/health` only. Domain modules are boundaries for future work, not implemented product features. No user, conversation, CV, archive, or contact records are seeded.

## Decisions still needed

- Whether a responsible person may belong to one or several entities; the requirements say both.
- How Mpanazava and Tily relate to the four named entities.
- Who may read and export CVs, especially bulk exports.
- Whether messaging must be real-time and how conversation membership changes affect history.
- The exact CV templates, permitted archive formats, upload limits, and back-office platform.

The Prisma schema intentionally has no business models until the membership rule is confirmed.
