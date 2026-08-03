# Resume Matchmaker — multi-stage Dockerfile for Next.js 16 standalone output.
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_VAPID_KEY=... \
#     -t resume-matchmaker:latest .
#
# Run (standalone; pairs with docker-compose.yml for the full stack):
#   docker run --rm -p 3000:3000 \
#     --env-file .env.docker \
#     -v $(pwd)/uploads:/app/uploads \
#     resume-matchmaker:latest
#
# The image runs as the non-root `nextjs:nodejs` user. Health is probed via
# `wget --spider http://localhost:3000/api/health` every 30s.

# ---- Stage 1: deps ----
FROM node:20-slim AS deps
WORKDIR /app

# Install bun (the project's runtime/package manager).
RUN npm install -g bun

# Copy lockfile + manifests first so this layer is cached unless deps change.
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install with bun (production + dev deps for the build step).
RUN bun install --frozen-lockfile

# ---- Stage 2: builder ----
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time Next.js config. NEXT_PUBLIC_* vars are baked into the client
# bundle, so they MUST be supplied at build time. Pass them via --build-arg.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY

ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_PUBLIC_FIREBASE_VAPID_KEY=${NEXT_PUBLIC_FIREBASE_VAPID_KEY}

# Disable Next.js telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Generate the Prisma client (the schema may have changed since the deps
# stage) and build the Next.js standalone output.
RUN bunx prisma generate
RUN bun run build

# ---- Stage 3: runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The standalone server.js reads PORT env (defaults to 3000).
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install wget for the healthcheck (busybox wget is enough; the slim image
# already ships it, but be explicit).
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user + group.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --gid 1001 nextjs

# Copy the standalone server + static assets + public.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy the Prisma client (needed at runtime for the datasource swap story).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Persistent upload directory (mounted as a volume in docker-compose).
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

# Healthcheck: poll the public /api/health endpoint. wget --spider just
# checks the URL is reachable (HEAD-equivalent).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# The standalone server.js is the entrypoint.
CMD ["node", "server.js"]
