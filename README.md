# Expense Tracker

A full-stack expense tracking app built with React (frontend) and Express + PostgreSQL (backend).

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


## Local Setup For AI/OCR Testing

This section documents the current local setup needed to run and test Rohan's AI/OCR work end to end.

### Required local services

You need these four services running locally:

1. PostgreSQL 16 in Docker
2. Backend Express server
3. Python FastAPI microservice
4. Frontend Vite app

### 1. Start PostgreSQL in Docker

Windows PowerShell:

```powershell
docker run --name expense-tracker-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=expense_tracker `
  -p 5432:5432 `
  -d postgres:16
```

If you already created the container earlier, start it with:

```powershell
docker start expense-tracker-postgres
```

### 2. Backend environment setup

Create `backend/.env` from `backend/.env.example`.

Example local values for the Docker database:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=expense_tracker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker

ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
AI_SERVICE_URL=http://127.0.0.1:8000

RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@example.com
```

Other values such as `SALT_ROUNDS`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`, and `PORT` can stay aligned with the example file unless you need to change them.

### 3. Run backend migrations

```powershell
cd backend
npm install
npm run migrate:up
```

### 4. Start the backend

```powershell
cd backend
npm start
```

The backend runs on `http://127.0.0.1:3000` by default.

### 5. Python microservice environment setup

Create `python-microservice/.env` from `python-microservice/.env.example`.

Required variables:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_VISION_MODEL=qwen/qwen3.6-27b
```

Do not commit real API keys.

### 6. Start the Python FastAPI microservice

```powershell
cd python-microservice
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The FastAPI service runs on `http://127.0.0.1:8000`.

### 7. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Testing Rohan's AI/OCR Work

### 1. Signup and login

1. Open `http://localhost:5173`
2. Create an account from the signup page
3. Log in
4. Confirm you are redirected into the app without auth errors

### 2. AI Insights page

1. Open the AI Insights page in the frontend
2. Trigger insights refresh
3. The frontend calls `POST /api/ai/insights`
4. If Groq is configured, the Python service can generate Groq-backed insights
5. If Groq is unavailable, the fallback insights response is still returned

### 3. Smart Scan receipt image upload

1. Open the Smart Scan page
2. Upload a `.jpg`, `.jpeg`, `.png`, or `.webp` receipt image
3. Review the extracted draft fields
4. The frontend sends the image to `POST /api/ai/extract-receipt`
5. The backend forwards the image to the Python service
6. The Python service attempts Groq Vision OCR and falls back safely if needed

### 4. Save the OCR draft transaction

1. Review or edit the extracted amount, date, merchant, description, and type
2. Click `Save transaction`
3. Smart Scan sends the reviewed draft to `POST /api/transactions`
4. On success, the frontend shows a success message and redirects to `/transactions`

### 5. Verify the saved transaction

#### Option A: Verify through the backend API

Use the access token returned at login:

```powershell
$token = "YOUR_ACCESS_TOKEN"

Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/transactions" `
  -Method GET `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

The response should include the saved transaction in the `transactions` array.

#### Option B: Verify directly in PostgreSQL

```powershell
docker exec -it expense-tracker-postgres psql -U postgres -d expense_tracker
```

Then run:

```sql
SELECT id, user_id, type, amount, category_id, transaction_date, description
FROM transactions
ORDER BY created_at DESC;
```

## Known Limitations

- The current Transactions page still uses mock/local frontend data, so a real backend-saved transaction may not appear visually there yet.
- Smart Scan currently saves `categoryId` as `null` because a category lookup API is not available yet.
- Groq Vision OCR has safe fallback behavior if the API key is missing, the model is unavailable, the request is rate-limited, or the model response cannot be parsed cleanly.


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
