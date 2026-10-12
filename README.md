# Marco Passport — Backend API

Express 5 + Sequelize (MySQL) API for Marco Passport: business listings and
places to visit, user passports and reviews, blogs, FAQs, contact and
business-listing submissions, plus an admin panel API.

## Prerequisites

- Node.js >= 22
- MySQL 8
- pm2 (installed globally on the server)

## Setup

```bash
cp .env.example .env   # fill in DB, SMTP and JWT_SECRET
npm install
npm run sync           # create tables from the Sequelize models
npm run migrate        # apply migrations (need the tables to exist)
npm run seed           # roles, departments, countries, states, cities, timezones
npm run auth           # create the super admin (temporary password is emailed)
npm run dev
```

```bash
curl http://localhost:5000/api/healthcheck
# {"response":"ok"}
```

`SUP_ADM_ROLE_ID`, `USR_ROLE_ID` and `ADM_DEPT_ID` in `.env` must match ids
seeded from `src/seeders/dumps/roles.sql` and `departments.sql`.

User registration reads `role_id` from a **request header**, not the body, and
only role ids listed in `SELF_REGISTERABLE_ROLE_IDS`
(`src/middlewares/userAuth.middleware.js`) may self-register. With no header
it defaults to `USR_ROLE_ID`.

## Accounts

- Sign-up creates a `PENDING` user and emails a verify link
  (`<FRONTEND_URL>/verify-email?token=…`). Verifying logs the user in.
- Accounts still unverified 24h after sign-up are deleted by an hourly job
  started from `index.js` (`src/jobs/cleanupUnverifiedUsers.js`).
- Forgot password emails a reset link (`<FRONTEND_URL>/reset-password?token=…`),
  valid for 1 hour.
- Email-link tokens are stored hashed (SHA-256) in `user_tokens`.

Frontend integration notes: [docs/frontend-handoff.md](docs/frontend-handoff.md).

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server via nodemon (`NODE_ENV=development`) |
| `npm start` | Production via pm2 (`ecosystem.config.json`) |
| `npm run staging` | Staging via pm2 (`ecosystem.staging-config.json`) |
| `npm run sync` | `sequelize.sync({ alter: true })`; refuses to run in production unless `ALLOW_PROD_SYNC=true` |
| `npm run migrate` / `migrate:undo` / `migrate:status` / `migrate:generate` | sequelize-cli migrations in `src/migrations/` |
| `npm run seed` | Load reference data from `src/seeders/dumps/*.sql` |
| `npm run auth` | Create the super admin from `.env` |

## Project structure

```
index.js              server entry point (graceful shutdown)
app.js                Express app: middleware, routes, error handling
src/
  config/             env validation, DB connection, logger, uploads, CLI scripts
  jobs/               in-process scheduled jobs
  routes/v1/          API routes (Admin/, Common/, User/), mounted at /api/v1
  controllers/        request handlers
  services/           business logic
  middlewares/        auth, role checks, validation, rate limiting
  models/             Sequelize models + associations
  migrations/         sequelize-cli migrations
  seeders/            reference data loader + SQL dumps
  templates/email/    HTML email templates
public/uploads/       uploaded images (served at /images)
```
