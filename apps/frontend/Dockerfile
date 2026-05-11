# syntax=docker/dockerfile:1
FROM node:22-bookworm AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
ENV VITE_API_URL=/api-proxy
WORKDIR /repo/apps/frontend
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
