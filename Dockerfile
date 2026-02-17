FROM node:20.18.0-alpine AS base

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

ENV DATABASE_URL=file:/data/dev.db

# Generate Prisma client
RUN npx prisma generate

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl su-exec

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

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
