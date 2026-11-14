FROM oven/bun:1.4.4 AS dependencies

WORKDIR /workspace
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN bun install --frozen-lockfile --backend copyfile

FROM dependencies AS build

COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api ./apps/api
RUN bun run --filter @fivondronana/api build

FROM oven/bun:1.4.4 AS production-dependencies

WORKDIR /workspace
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN bun install --production --filter @fivondronana/api --frozen-lockfile --backend copyfile

FROM oven/bun:1.4.4 AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=production-dependencies /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-dependencies /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/src/generated/prisma ./apps/api/src/generated/prisma

WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["bun", "run", "start"]
