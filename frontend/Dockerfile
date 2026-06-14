# syntax=docker/dockerfile:1
FROM node:22-bookworm AS build
WORKDIR /app

ARG VITE_API_URL=
ARG VITE_APPSYNC_GRAPHQL_URL=
ARG VITE_APPSYNC_API_KEY=
ARG VITE_RAZORPAY_KEY_ID=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APPSYNC_GRAPHQL_URL=$VITE_APPSYNC_GRAPHQL_URL
ENV VITE_APPSYNC_API_KEY=$VITE_APPSYNC_API_KEY
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
