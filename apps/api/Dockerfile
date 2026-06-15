FROM node:24-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── Build + Run ───────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .

RUN pnpm --filter @easypay/database exec prisma generate
RUN pnpm --filter @easypay/shared build
RUN pnpm --filter @easypay/api build

EXPOSE 3001
ENTRYPOINT ["sh", "-c", "packages/database/node_modules/.bin/prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma && node apps/api/dist/main"]
