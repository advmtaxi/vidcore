#!/bin/bash
# VidCore EC2 deploy script
# Clones from GitHub, builds the Docker image, and runs on port 7860
#
# Usage:  chmod +x deploy-ec2.sh && ./deploy-ec2.sh

set -e

PORT=7860
NAME=vidcore

echo "── Stopping old container (if any) ──"
docker stop $NAME 2>/dev/null && docker rm $NAME 2>/dev/null || true

echo "── Building image from GitHub ──"
docker build --no-cache -t $NAME -f- . <<'DOCKERFILE'
FROM node:20-alpine AS build
RUN apk add --no-cache git
WORKDIR /app
RUN git clone https://github.com/advmtaxi/vidcore.git .
RUN npm install
RUN node build.mjs && ./node_modules/.bin/tsc -p tsconfig.server.json

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist/ dist/
COPY --from=build /app/dist-server/ dist-server/
ENV PORT=7860
EXPOSE 7860
CMD ["node", "dist-server/server.js"]
DOCKERFILE

echo "── Starting container on port $PORT ──"
docker run -d \
  --name $NAME \
  --restart unless-stopped \
  -p 7861:7860 \
  -e CDN_URL=https://vidcorea.b-cdn.net \
  -e PROXY_URL=http://cjsxepws:hp62y3qu06m1@38.154.185.97:6370 \
  $NAME

echo "✓ VidCore running at http://$(curl -s ifconfig.me):7861/"
