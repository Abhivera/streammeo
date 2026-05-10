# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
WORKDIR /repo
CMD ["pnpm", "--filter", "@voicewidget/backend", "start"]
