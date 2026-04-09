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

RUN corepack enable && corepack prepare pnpm@9 --activate

# Workspace manifests — pnpm needs these to resolve the workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install only production deps (prisma CLI is now a prod dep)
RUN pnpm install --frozen-lockfile --prod

# Shared package build output
COPY --from=builder /app/packages/shared ./packages/shared

# API build artifacts + Prisma schema
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Generate Prisma client in the runner environment
RUN pnpm --filter @splitmate/api exec prisma generate

COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 3000

WORKDIR /app/apps/api
ENTRYPOINT ["./docker-entrypoint.sh"]
