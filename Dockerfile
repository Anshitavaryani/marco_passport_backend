# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base: shared setup for every stage below.
# python3/make/g++ are needed because `bcrypt` compiles a native addon on
# install — without these, `npm install`/`npm ci` fails on Alpine.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./

# ---------------------------------------------------------------------------
# deps: production-only dependencies, cached as their own layer so app code
# changes don't force a full reinstall.
# ---------------------------------------------------------------------------
FROM base AS deps
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# development: full deps (incl. nodemon) + bind-mounted source (see
# docker-compose.yml). Most people will run `npm run dev` on the host
# instead — this target exists for anyone who wants the app itself
# containerized in dev too.
# ---------------------------------------------------------------------------
FROM base AS development
RUN npm install
COPY . .
ENV NODE_ENV=development
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# production: minimal image, no dev deps, runs as the unprivileged `node`
# user. NOTE: this runs the app directly with `node index.js`, not through
# pm2/ecosystem.config.json. pm2's cluster mode ("instances": "max") is
# built for one process managing multiple cores on a single VM — inside a
# container you scale by running more container replicas instead (via
# your orchestrator / `docker compose up --scale`), so pm2 cluster mode
# would be fighting the container boundary rather than helping. Keep the
# existing pm2 ecosystem files for your current non-Docker VM deploy path;
# this image is a separate, container-native alternative.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN mkdir -p public/uploads/images public/uploads/videos public/uploads/gifs public/uploads/docs public/uploads/songs \
    && chown -R node:node public
USER node
EXPOSE 5000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]