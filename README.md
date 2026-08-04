# Expense Tracker

A full-stack expense tracking app built with React (frontend) and Express + PostgreSQL (backend).

## Getting started

This repo uses npm workspaces, so the frontend and backend are separate packages managed from the monorepo root.

1. Install dependencies from the repo root:

```bash
npm install
```

2. Start the backend:

```bash
cd backend
npm run dev
```

3. Start the frontend:

```bash
cd frontend
npm run dev
```

You can also run either workspace from the root without changing directories:

```bash
npm run -w backend dev
npm run -w frontend dev
```

If you only want to run the frontend, you can do it the normal way from inside `frontend/`.
The same is true for the backend from `backend/`.

## Folder structure

```
expense-tracker/
  packages/
    shared/               # Shared Zod schemas used by both frontend and backend
      src/
        auth.ts           # Auth input schemas (signup, login, forgot/reset password)
  backend/
    migrations/           # Versioned SQL files, one per database change
    src/
      auth/               # Auth feature (signup, login, refresh, logout, password reset)
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

The AI/OCR integration follows the same pattern in `backend/src/ai/`. The current backend AI endpoints are:
- `POST /api/ai/insights`
- `POST /api/ai/extract-receipt`

For Core Feature 3 demo work, the backend also includes a mock-backed `backend/src/importExport/` module with:
- `POST /api/import/preview`
- `POST /api/import/confirm`
- `POST /api/export/preview`
- `GET /api/export/csv`

These endpoints use in-memory storage only for demo purposes. They do not write to the real transaction database yet, and can be swapped to real transaction persistence once that schema is finalized.

`POST /api/import/preview` supports two input formats:
- raw JSON with `csvText`
- `multipart/form-data` with one uploaded CSV file in field `file`

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


## Shared package (`packages/shared/`)

The `packages/shared/` package holds Zod schemas that both the frontend and backend need. This ensures validation rules (field names, types, constraints, error messages) are defined in one place, so they can't drift out of sync.

### What goes in shared

**Input schemas** — schemas that validate what the user types into a form. These are used by the frontend (form validation with `react-hook-form`) and the backend (request body validation with `validateBody()` middleware). If both sides need the same validation, the schema belongs in shared.

Currently in shared:
- `signupSchema` — first name, last name, email, password
- `loginSchema` — email, password
- `forgotPasswordSchema` — email
- `resetPasswordSchema` — email, 6-digit code, new password

### What stays in the backend

**Backend-only schemas** — schemas that validate things the frontend never touches, like URL params or query strings. For example, `deleteTransactionSchema` validates that `:id` is a valid UUID. The frontend doesn't run that check; it just sends the request.

### How to move a schema to shared

If you have a schema in your backend feature folder that the frontend also needs, here's how to move it:

**1. Add the schema to a file in `packages/shared/src/`**

Create a new file (or add to an existing one) based on the feature name:

```ts
// packages/shared/src/transactions.ts
import { z } from "zod";

export const createTransactionSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    // ... rest of the schema
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
```

**2. Register the new file in `packages/shared/package.json`**

Add an entry to the `exports` map so other packages can import it:

```json
{
  "exports": {
    "./auth": "./src/auth.ts",
    "./transactions": "./src/transactions.ts"
  }
}
```

**3. Update the backend's schema file to re-export**

Replace the inline definition with a re-export from the shared package. Keep any backend-only schemas in place:

```ts
// backend/src/transactions/transactionSchemas.ts

// Shared schemas — re-exported so existing imports don't break
export {
    createTransactionSchema,
    getTransactionsSchema,
} from "@expense-tracker/shared/transactions";

export type {
    CreateTransactionInput,
    GetTransactionsInput,
} from "@expense-tracker/shared/transactions";

// Backend-only schemas — stay here
export const deleteTransactionSchema = z.object({
    id: z.string().uuid("A valid transaction id is required."),
});
```

That's it — no `npm install` needed. The shared package is already symlinked via npm workspaces, so any new files you add to `packages/shared/src/` are picked up immediately.

### How it works under the hood

The project uses **npm workspaces**. The root `package.json` declares `backend`, `frontend`, and `packages/*` as workspaces. When you ran `npm install` during initial setup, npm created a symlink:

```
node_modules/@expense-tracker/shared → ../../packages/shared
```

> A **symlink** (symbolic link) is like a shortcut. Instead of copying the `packages/shared/` folder into `node_modules/`, npm creates a pointer that says "when someone imports `@expense-tracker/shared`, go look at `packages/shared/` instead." This means any changes you make in `packages/shared/src/` are picked up instantly — there's nothing to rebuild or reinstall.


## API Documentation

See [API_DOCS.md](API_DOCS.md) for full request/response docs for all endpoints.

## Core Feature 3: Import / Export

The current Core Feature 3 flow is wired to real backend endpoints from the frontend UI.

### Implemented frontend-to-backend flow

- `GET /import-csv` opens the CSV import page
- `POST /api/import/preview` generates a real backend preview from uploaded CSV content
- `POST /api/import/confirm` confirms selected valid rows and stores them in the backend import/export mock store
- `GET /export` opens the export page
- `POST /api/export/preview` generates a real backend export preview from the backend mock store
- `GET /api/export/csv` downloads a CSV file built from the backend mock store

### Important limitation

This branch uses the existing backend mock-backed import/export module.

- Imported rows are stored in memory only
- They are not written to the real PostgreSQL `transactions` table yet
- Export preview and CSV download read from that in-memory import/export store
- Data is reset when the backend server restarts
- PDF export is not implemented on this branch

### How to test Core Feature 3

#### 1. Start the backend

From `backend/`:

```bash
npm install
npm start
```

#### 2. Start the frontend

From `frontend/`:

```bash
npm install
npm run dev
```

#### 3. Test import preview

1. Open the app and log in
2. Go to `Transactions -> Import CSV`
3. Upload a `.csv` file with required columns:
   - `date`
   - `description`
   - `amount`
   - `type`
   - `category`
4. The page calls `POST /api/import/preview`
5. The UI should show:
   - total row count
   - valid rows
   - invalid rows
   - validation errors for rejected rows

#### 4. Test import confirm

1. On the preview screen, leave valid rows selected or uncheck any rows you do not want to import
2. Click `Import ... rows`
3. The page calls `POST /api/import/confirm`
4. The UI should show saved/skipped counts

#### 5. Test export preview

1. Go to `Transactions -> Export`
2. Use the available type, category, and date filters
3. Click `Refresh preview`
4. The page calls `POST /api/export/preview`
5. The UI should show:
   - row count
   - total income
   - total expenses
   - net amount
   - preview rows from the backend mock store

#### 6. Test CSV download

1. On the Export page, keep the format set to `CSV`
2. Click `Download CSV`
3. The page calls `GET /api/export/csv`
4. A file named `mock-transactions-export.csv` should download

### Notes for teammates

- The import/export frontend now calls real backend endpoints instead of frontend mock rows
- The backend import/export module is still intentionally mock-backed for this PR
- If you restart the backend server, previously imported rows used for export preview/download will be cleared


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

| Command                                 | What it does                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run migration:create -- <name>`    | Create a new empty migration file. Example: `npm run migration:create -- 002-transactions`     |
| `npm run migrate:up`                    | Apply all pending migrations (runs the Up section of each file that hasn't run yet).           |
| `npm run migrate:down`                  | Roll back the **single most recent** migration (runs its Down section). Run it multiple times to roll back further. |

### Rules

- **Never edit a migration that's already been merged.** Once a migration is on `main` and other people have run it, their databases already have that version applied. If you need to change something, write a new migration.
- **Always fill in the Down section.** Every migration has an Up (apply) and Down (rollback) section. The Down section should undo exactly what the Up section did, so `migrate:down` works cleanly.
- **Keep migrations small and focused.** One migration per logical change (add a table, add a column, create an index) makes rollbacks predictable.
- **Connection comes from `.env`.** Everyone runs migrations against their own local database. Never hardcode connection strings in migration files.
