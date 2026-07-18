# Claw3D - 3D agent visualization for OpenClaw.
# Multi-stage build: install prod deps -> build Next.js -> run with custom server.
# Node 22: @react-three/drei's transitive dep camera-controls requires node >=22.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time gateway URL (overridden at runtime by CLAW3D_GATEWAY_URL).
ENV NEXT_PUBLIC_GATEWAY_URL=ws://127.0.0.1:18789
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Bind to all interfaces so the platform proxy (Railway/Render/Fly) can reach
# the app, and explicitly opt in to the public bind (no Studio token gate) so
# the deployed URL serves the app openly. TRUSTED_PROXY=1 makes rate limiting
# read the real client IP from X-Forwarded-For behind the platform proxy.
ENV HOST=0.0.0.0
ENV STUDIO_ALLOW_PUBLIC_HOST=1
ENV TRUSTED_PROXY=1

# Copy built app + custom server + production node_modules only.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Railway/most platforms inject PORT at runtime; the server reads it (default 3000).
EXPOSE 3000

CMD ["node", "server/index.js"]
