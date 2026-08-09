# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN apk add --no-cache git

WORKDIR /app

# Clone the repo from GitHub
RUN git clone https://github.com/advmtaxi/vidcore.git .

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Compile web UI → dist/  and  server TS → dist-server/
RUN node build.mjs && ./node_modules/.bin/tsc -p tsconfig.server.json

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production-only deps
COPY --from=build /app/package.json /app/package-lock.json ./
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
