FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci && npm run db:generate
COPY tsconfig.json tsconfig.base.json ./
COPY src ./src
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
