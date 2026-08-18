# Node.js + Express + MySQL API Starter Template

A reusable backend starter: Express + Sequelize (MySQL), JWT auth split
into separate User and Admin flows, role-based access control, rate
limiting, file uploads, email OTP flows, and a Stripe integration scaffold.

This is a **template** — the role names/IDs, app name, and DB name below
are all placeholders meant to be set per project (e.g. one project might
use `USR_ROLE_ID=6` / `Employee=7`, another might use entirely different
roles). Nothing here assumes a specific product.

This README is a living document. See **Known issues / Open items** at
the bottom for anything still unresolved.

## Prerequisites

- Node.js >= 22
- Docker Desktop (for MySQL + phpMyAdmin — recommended, especially on macOS)
- npm

## How registration/role assignment works (read this first)

`role_id` for user self-registration is read from a **request header**
(`role_id`), not the JSON body. This is deliberate: it stops a client
from putting an admin `role_id` straight into the request body and
self-promoting. On top of that, `userAuth.middleware.js` keeps an
explicit allow-list (`SELF_REGISTERABLE_ROLE_IDS`) of which role IDs are
even allowed to self-register — out of the box, only `USR_ROLE_ID`. If no
`role_id` header is sent at all, it silently defaults to `USR_ROLE_ID`.

To let a project built from this template support more self-registerable
roles:

1. Seed the real roles as rows in `roles` (via `roles.sql` or directly)
2. Add matching env vars in `.env` / `config.js` (e.g. `EMPLOYEE_ROLE_ID`)
3. Add those IDs to `SELF_REGISTERABLE_ROLE_IDS` in `userAuth.middleware.js`
4. Have the client send that role's ID in the `role_id` **header** on the register request

## Migrations vs. seeders — you need both

- **Migrations** (`npm run migrate`, via `sequelize-cli`) manage schema
  only — creating/altering tables and columns. They never insert rows.
- **Seeders** (`npm run seed`) load actual reference data — roles,
  departments, countries, states, cities, categories, timezones — from
  `src/seeders/dumps/*.sql`.

Since nearly every table has a required foreign key (`role_id`,
`department_id`, `country_id`, etc.), running migrations alone leaves
those parent tables empty and every FK-dependent insert (creating a
user, an admin, anything) fails. Each project built from this template
will supply its own `roles.sql` / `departments.sql` content — the
template ships with placeholder/example data, see Open items.

## Quick start (macOS)

### 1. Install Docker Desktop

https://www.docker.com/products/docker-desktop/ — install and launch it
once so the daemon is running.

### 2. Start MySQL + phpMyAdmin

```bash
docker compose up -d mysql phpmyadmin
```

- MySQL 8 → `localhost:3306` (root password: `root`)
- phpMyAdmin → http://localhost:8080 (login `root` / `root`)

```bash
docker compose ps   # confirm both are healthy
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in a real `JWT_SECRET` at minimum, and set `APP_NAME` /
`CENTRAL_MYSQL_DB` to whatever this specific project is actually called.
Everything else defaults to match the Docker MySQL service above.

### 4. Install dependencies

```bash
npm install
```

### 5. Create schema

```bash
npm run sync       # creates all tables from the Sequelize models
npm run migrate    # applies versioned migrations on top
```

Always run `sync` before `migrate` on a fresh database — the current
migrations use `ALTER TABLE`, which assumes the tables already exist.

### 6. Seed reference data

```bash
npm run seed
```

### 7. Create your super admin

```bash
npm run auth
```

Uses `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` /
`SUP_ADM_ROLE_ID` / `ADM_DEPT_ID` from `.env` — these must match real
seeded rows, so this step depends on step 6 having succeeded.

### 8. Run the server

```bash
npm run dev
```

```bash
curl http://localhost:5000/api/healthcheck
# {"response":"ok"}
```

## npm scripts reference

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server via nodemon, `NODE_ENV=development` |
| `npm start` | Production start via pm2 (`ecosystem.config.json`) — for VM/bare-metal deploys, not Docker |
| `npm run staging` | Same, using the staging pm2 config |
| `npm run sync` | Creates/alters DB tables from the Sequelize models. Refuses to run against `NODE_ENV=production` unless `ALLOW_PROD_SYNC=true` is set |
| `npm run migrate` | Applies versioned migrations (`src/migrations/`) — the production-safe schema tool |
| `npm run migrate:undo` | Rolls back the last migration |
| `npm run migrate:status` | Shows which migrations have run |
| `npm run migrate:generate --name <name>` | Scaffolds a new migration file |
| `npm run seed` | Loads reference data from `src/seeders/dumps/*.sql` |
| `npm run auth` | Creates the super admin from `.env` values |

## Running with Docker (app included)

`Dockerfile` has `development` and `production` targets. To containerize
the app itself (not just the DB), uncomment the `app` service in
`docker-compose.yml`:

```bash
docker compose up -d --build
```

For day-to-day development on macOS, running MySQL/phpMyAdmin in Docker
and the app natively via `npm run dev` (Quick Start above) is faster —
bind-mounting the app into a container adds overhead with little local
benefit.

The `production` image target runs `node index.js` directly, not
through pm2 — pm2's cluster mode is built for multi-core scaling on a
single VM; in a container you scale via replicas instead. The existing
pm2 ecosystem files remain the deploy path for a non-Docker VM setup.

`docker-compose.yml` deliberately has no hardcoded `container_name` or
top-level `name:` — Compose derives names from the folder this file
lives in, so renaming the project folder later doesn't leave stale
product-named containers behind.

## Project structure (high level)

```
index.js                  server entry point (starts app.js, graceful shutdown)
app.js                     Express app: middleware, routes, error handling
src/
  config/                  env validation, DB connection, logger, redis, etc.
  routes/v1/                 versioned API routes (User/, Admin/)
  controllers/               request handlers
  services/                  business logic
  middlewares/                auth, validation, rate limiting, uploads
  models/                     Sequelize models + associations
  migrations/                  versioned schema changes (sequelize-cli)
  seeders/
    execution.js               runs the SQL dumps in a transaction
    run.js                     CLI entrypoint (`npm run seed`)
    dumps/*.sql                 reference data (roles, countries, etc.)
public/uploads/                user-uploaded files
```

## Known issues / Open items

- **`roles.sql` / `departments.sql`**: ship with example/placeholder
  data. Each project built from this template should replace it with its
  own real roles before self-registration for anything beyond the
  default role can work.
- **`SP_ROLE_ID`**: declared in `config.js`'s schema, no corresponding
  entry in `types.js`'s `rolesTypes`, and not yet in
  `SELF_REGISTERABLE_ROLE_IDS`. Needs a decision on what it represents,
  or removal if unused.
- **`.sequelizerc`**: not yet confirmed to exist — required for
  `sequelize-cli` to find `sequelize-cli.config.js` and the migrations
  folder. If missing, `npm run migrate` will fail.
- **`roleService.findRoleById`**: `role.middleware.js` was fixed to read
  `req.user.role_id` (matching the JWT payload shape from
  `token.service.js`) instead of the non-existent `req.user.id` — but
  this hasn't been cross-checked against the actual
  `services/Common/role.service.js` implementation yet.
- **Admin session revocation**: there's no `AdminToken` table (unlike
  `UserToken` for regular users), so a compromised or fired admin's JWT
  stays valid until it naturally expires — no way to revoke early.
- **`package.json`'s `name` field**: still whatever product name it had
  before — update it to something template-neutral (or per-project) when
  you get to it; not changed here since I don't have your current file.