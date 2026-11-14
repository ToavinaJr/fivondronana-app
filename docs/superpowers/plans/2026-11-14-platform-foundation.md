# FIVONDRONANA Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a maintainable mobile/API monorepo foundation for the FIVONDRONANA application.

**Architecture:** Bun workspaces host an Expo mobile app and a NestJS API. PostgreSQL and Prisma belong to the API; Docker Compose provides local PostgreSQL. Business modules are bounded in the API but remain unimplemented until conflicting access rules are resolved.

**Tech Stack:** Bun, Expo SDK 58, React Native, TypeScript, NestJS 12, Prisma 7, PostgreSQL, Docker Compose.

**Spec:** `docs/Application mobile FIVONDRONANA.md`

## Global Constraints

- Keep the existing French/Malagasy requirements document unchanged.
- Mobile app and API remain separate deployable applications.
- No business behavior is implied by module placeholders.
- Do not choose a back-office UI framework in this foundation.
- Do not add tests or claim test verification in this task.

## Review Focus

- Expo SDK / React Native package alignment: keep versions tied to the same Expo SDK release.
- NestJS ESM and Bun runtime compatibility: keep startup commands explicit and document runtime caveats.
- Prisma generator and PostgreSQL adapter setup: keep schema/config aligned to Prisma 7.
- Environment handling: commit examples only; never commit secrets.
- Unresolved multi-entity rules: avoid encoding a disputed membership constraint in the initial schema.

## Files

- Root: Bun workspace manifest, TypeScript base config, ignore rules, environment example, README.
- `apps/mobile`: Expo entry point, minimal Malagasy start screen, app configuration.
- `apps/api`: NestJS bootstrap, health endpoint, module boundaries, Prisma schema/config/service.
- `infra/docker-compose.yml`: local PostgreSQL service with healthcheck and persistent volume.

## Tasks

1. Create root workspace, TypeScript, environment, and contributor documentation.
2. Add the Expo app shell with a Malagasy landing/login placeholder.
3. Add the NestJS API shell, health endpoint, domain module boundaries, and Prisma integration.
4. Add local PostgreSQL Compose configuration and explain startup commands and unresolved decisions.

## Verification

Inspect generated files and package scripts for internal consistency. Tests and dependency installation are intentionally not run in this task.
