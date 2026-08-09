# Architecture Notes

Deeper explanations of how each part of the app works internally. [README.md](README.md)
covers setup and usage; this doc is for when you're actually changing code
in a given area and want the "how this is organized" context.

## Backend

Each backend feature follows the same layered pattern —
`<feature>Routes.ts → <feature>Schemas.ts → <feature>Controller.ts → <feature>Repository.ts → <feature>Model.ts`:

- **Routes** wire URLs to middleware (e.g. `requireAuth`, `validateBody`) and controller functions.
- **Schemas** are Zod schemas that validate the request; invalid requests are rejected with `400` before the controller runs.
- **Controllers** hold the business logic — read validated input, call the repository, decide the response.
- **Repositories** are the only place that talks to the database (parameterized SQL, snake_case columns aliased to camelCase).
- **Models** are the shared TypeScript types for that feature, used by both controller and repository.

For example, `backend/src/transactions/` has `transactionRoutes.ts`,
`transactionSchemas.ts`, `transactionController.ts`,
`transactionRepository.ts`, and `transactionModel.ts`, each responsible for
exactly one layer of that feature.

## Shared validation package (`packages/shared`)

`packages/shared/` holds Zod schemas that both the frontend and backend
need, so validation rules (field names, types, constraints, error messages)
are defined once and can't drift out of sync between client and server
validation.

**What goes in shared:** input schemas that validate what a user types into
a form — used by the frontend (`react-hook-form` validation) and the
backend (`validateBody()` middleware). Currently: `signupSchema`,
`loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`,
`createGroupSchema`, `joinGroupSchema`.

**What stays backend-only:** schemas that validate things the frontend
never touches, like URL params — e.g. `deleteTransactionSchema` checks that
`:id` is a valid UUID; the frontend just sends the request without running
that check itself.

### Adding a new shared schema

1. Add the schema to a file in `packages/shared/src/` (new or existing,
   named after the feature):

   ```ts
   // packages/shared/src/transactions.ts
   import { z } from "zod";

   export const createTransactionSchema = z.object({
       type: z.enum(['expense', 'income']),
       amount: z.number().positive("Transaction amount must be greater than zero."),
       // ...
   });
   export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
   ```

2. Register it in `packages/shared/package.json`'s `exports` map:

   ```json
   {
     "exports": {
       "./auth": "./src/auth.ts",
       "./transactions": "./src/transactions.ts"
     }
   }
   ```

3. Re-export it from the backend's feature schema file, keeping any
   backend-only schemas in place:

   ```ts
   // backend/src/transactions/transactionSchemas.ts
   export {
       createTransactionSchema,
       getTransactionsSchema,
   } from "@expense-tracker/shared/transactions";

   export type {
       CreateTransactionInput,
       GetTransactionsInput,
   } from "@expense-tracker/shared/transactions";

   // Backend-only
   export const deleteTransactionSchema = z.object({
       id: z.string().uuid("A valid transaction id is required."),
   });
   ```

No reinstall needed — npm workspaces symlinks
`node_modules/@expense-tracker/shared → packages/shared`, so new files
under `packages/shared/src/` are picked up immediately by both frontend and
backend.

## Frontend

`frontend/src/` is organized by role rather than by feature:

- **`pages/`** — one component per route (see `App.tsx` for the route
  table), e.g. `Transactions.tsx`, `Groups.tsx`, `SmartScan.tsx`.
- **`components/`** — reusable UI pieces shared across pages (e.g.
  `ProtectedRoute`, which redirects to `/login` when there's no valid
  session).
- **`context/`** — React context providers; `AuthContext` holds the current
  user/token and is what `ProtectedRoute` and API calls read from.
- **`services/`** — the API client (axios) and per-feature request
  helpers that call the backend.

Forms use `react-hook-form` with the same Zod schemas from
`packages/shared` that the backend uses to validate the request body — see
[Shared validation package](#shared-validation-package-packagesshared)
above.

## Database

We use [node-pg-migrate](https://github.com/salsita/node-pg-migrate) to
manage schema changes. Every change is a timestamped SQL file in
`backend/migrations/`, applied in order, so anyone can build the same
database from scratch.

Run these from `backend/`:

| Command | What it does |
| --- | --- |
| `npm run migration:create -- <name>` | Create a new empty migration file, e.g. `npm run migration:create -- 008-add-notes-column` |
| `npm run migrate:up` | Apply all pending migrations |
| `npm run migrate:down` | Roll back the single most recent migration; run it again to roll back further |

Rules:

- **Never edit a migration that's already merged.** Once it's on `main`,
  other people's databases already have it applied — write a new migration
  instead.
- **Always fill in the Down section.** It should undo exactly what the Up
  section did.
- **One logical change per migration** (a new table, a new column, a new
  index) — keeps rollbacks predictable.
- **Connection comes from `.env`.** Everyone runs migrations against their
  own local database; never hardcode connection strings in migration files.

## AI Microservice

`python-microservice/` is a separate FastAPI app the backend calls over
HTTP (`AI_SERVICE_URL`) — the frontend never talks to it directly. See
[API_DOCS.md](API_DOCS.md#ai-microservice-pythonfastapi) for its endpoints
(`/health`, `/generate-insights`, `/extract-receipt`), request/response
shapes, and Groq fallback behavior, and
[API_DOCS.md's AI API (Backend Proxy)](API_DOCS.md#ai-api-backend-proxy)
section for how the backend forwards requests to it.
