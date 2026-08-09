# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (layer-cached when lockfile is stable)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and configs
COPY tsconfig.json tsconfig.web.json tsconfig.server.json build.mjs ./
COPY src/ src/
COPY web/ web/

# Compile web UI → dist/  and  server TS → dist-server/
RUN node build.mjs && npx tsc -p tsconfig.server.json

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from build stage
COPY --from=build /app/dist/ dist/
COPY --from=build /app/dist-server/ dist-server/

# Hugging Face Spaces requires a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Default port: 7860 (Hugging Face standard), override with PORT env
ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist-server/server.js"]
