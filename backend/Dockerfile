# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages ./packages
COPY widget ./widget
RUN npm ci
COPY tsconfig.base.json tsconfig.json ./
COPY src ./src
# Env is provided by the runtime (docker-compose / Lambda), not an .env file.
CMD ["npx", "tsx", "src/index.ts"]
