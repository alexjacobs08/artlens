# --- build stage ---------------------------------------------------------
FROM node:24-slim AS build

WORKDIR /app

# Install dependencies first so this layer is cached across code-only changes.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- serve stage -----------------------------------------------------------
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# Railway (and most PaaS) inject PORT at runtime; Caddyfile reads it via {$PORT}.
EXPOSE 8080
