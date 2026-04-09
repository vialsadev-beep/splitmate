# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: build ──────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @splitmate/shared build 2>/dev/null || true
RUN pnpm --filter @splitmate/api exec prisma generate
RUN pnpm --filter @splitmate/api build

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar node_modules completos del builder (incluye Prisma client generado)
COPY --from=builder /app/node_modules ./node_modules

# Manifiestos del workspace
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Artefactos de build y schema Prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Script de arranque: migrar → start
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 3000

WORKDIR /app/apps/api
ENTRYPOINT ["./docker-entrypoint.sh"]
