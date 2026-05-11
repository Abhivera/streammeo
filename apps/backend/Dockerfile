# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
WORKDIR /repo
CMD ["npm", "run", "-w", "@streammeo/backend", "start"]
