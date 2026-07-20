# Expense Tracker

A full-stack expense tracking app built with React (frontend) and Express + PostgreSQL (backend).

## Folder structure

```
expense-tracker/
  backend/
    migrations/           # Versioned SQL files, one per database change
    src/
      auth/               # Auth feature (signup, login, refresh, logout)
      transactions/       # Transactions feature
      groups/             # Groups feature
      ...
      middleware/         # Shared middleware used across features
      config/             # Database pool, environment config
    .env.example          # Template for your local environment variables
  frontend/
    src/
      components/         # Reusable UI components
      context/            # React context providers
      pages/              # Page-level components
      services/           # API client and request helpers
  python-microservice/    # Python microservice package
```

Each backend feature gets its own folder under `src/` and follows the same file naming pattern: `<feature>Routes.ts`, `<feature>Controller.ts`, `<feature>Repository.ts`, `<feature>Schemas.ts`, `<feature>Model.ts`. For example, a transactions feature would live in `src/transactions/` with `transactionRoutes.ts`, `transactionController.ts`, and so on.

The split keeps responsibilities clear:
- **Routes** wire URLs to middleware and controller functions.
- **Controllers** handle request/response logic and orchestrate calls.
- **Repositories** are the only place that talks to the database.
- **Schemas** define and validate the shape of incoming data.
- **Models** hold the shared TypeScript types for that feature.


### How the layers work together

Every feature in the backend follows the same five-layer pattern. A request enters at the top and flows down; the response flows back up.

```
Routes -> Schema -> Controller -> Repository -> Model
```

**1. Routes**

**Wiring**. Maps HTTP methods and paths to handlers. Attaches middleware (see `backend/src/middleware/authMiddleware.ts`) like `validateBody()` or `requireAuth`.

**2. Schema**

**Validation**. Zod schemas define what shape the request body must be. If it fails, the middleware returns 400 before the controller ever runs. Also exports TypeScript types via `z.infer<>`.

**3. Controller**

**Business logic**. The handler function. Reads validated input, calls repository functions, decides what status code to return. Each handler is wrapped in try/catch.

**4.Repository**

**Database access**. Raw SQL with parameterized queries (`$1`, `$2`). This is where snake_case columns get aliased to camelCase with `AS "camelCase"`.

**5. Model**

**Type definitions**. TypeScript interfaces that describe the shape of data in the app. The repository returns these types, the controller works with them.


## Database migrations

We use [node-pg-migrate](https://github.com/salsita/node-pg-migrate) to manage database schema changes. Instead of modifying tables by hand, every change is a timestamped SQL file in `backend/migrations/`. Migrations run in order, so anyone can spin up the same database from scratch.

### Setup

1. Make sure you have a PostgreSQL instance running locally.
2. Copy the example environment file and fill in your local database credentials:

   ```bash
   cd backend
   cp .env.example .env
   ```

   The `DATABASE_URL` in `.env` is what `node-pg-migrate` reads to connect. Point it at your local Postgres instance.

3. Install dependencies and run the migrations:

   ```bash
   npm install
   npm run migrate:up
   ```

   This applies every migration file that hasn't been run yet, creating the tables your local database needs.

### Commands

Run these from the `backend/` directory:

| Command | What it does |
| --- | --- |
| `npm run migration:create -- <name>` | Create a new empty migration file. Example: `npm run migration:create -- 002-transactions` |
| `npm run migrate:up` | Apply all pending migrations (runs the Up section of each file that hasn't run yet). |
| `npm run migrate:down` | Roll back the **single most recent** migration (runs its Down section). Run it multiple times to roll back further. |

### Rules

- **Never edit a migration that's already been merged.** Once a migration is on `main` and other people have run it, their databases already have that version applied. If you need to change something, write a new migration.
- **Always fill in the Down section.** Every migration has an Up (apply) and Down (rollback) section. The Down section should undo exactly what the Up section did, so `migrate:down` works cleanly.
- **Keep migrations small and focused.** One migration per logical change (add a table, add a column, create an index) makes rollbacks predictable.
- **Connection comes from `.env`.** Everyone runs migrations against their own local database. Never hardcode connection strings in migration files.
