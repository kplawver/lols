# syntax=docker/dockerfile:1

# Stage 1: build the Eleventy site
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Install dependencies first so this layer is cached across content changes
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# Copy the full source and build into /app/_site
COPY . .
RUN yarn run build

# Stage 2: serve the generated site with Caddy
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/_site /srv
