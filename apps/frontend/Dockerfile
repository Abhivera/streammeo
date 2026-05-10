# syntax=docker/dockerfile:1
FROM node:22-bookworm AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
ENV VITE_API_URL=/api-proxy
WORKDIR /repo/apps/frontend
RUN pnpm build

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
