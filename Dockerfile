FROM node:20.20.2-alpine AS base

# Install dependencies only when needed
FROM base AS deps

RUN apk add --no-cache libc6-compat
# Set the working directory
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Two clients: the Postgres runtime client, and the frozen SQLite snapshot
# client that only the one-time import reads. Neither needs DATABASE_URL.
RUN npx -y prisma@6.19.0 generate \
 && npx -y prisma@6.19.0 generate --schema=prisma/schema.sqlite-snapshot.prisma

# Boot scripts (wait-for-db, import-sqlite), compiled to plain CommonJS
RUN npx tsc -p scripts/tsconfig.json

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -h /home/nextjs nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Set up /data directory with the right permissions
RUN mkdir -p /data/files/resumes && chown -R nextjs:nodejs /data/files/resumes

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/scripts/dist ./scripts/dist
# Nothing in the app imports the snapshot client, so Next's standalone trace
# never includes it or its SQLite engine binary: copy it explicitly.
COPY --from=builder /app/src/generated/sqlite-snapshot ./src/generated/sqlite-snapshot

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3737

ENV PORT=3737

ENTRYPOINT ["/app/docker-entrypoint.sh"]
