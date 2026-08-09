# Expense Tracker

A full-stack expense tracker for individuals and groups. Track personal and
shared expenses, split group costs and settle balances, import/export
transactions as CSV, capture receipts with OCR-assisted extraction, and get
AI-generated budgeting insights.

## Contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Prerequisites for running the app locally](#prerequisites-for-running-the-app-locally)
- [Project structure](#project-structure)
- [Local setup with Docker](#local-setup-with-docker)
- [Local setup without Docker](#local-setup-without-docker)
- [Usage](#usage)
- [Environment variables reference](#environment-variables-reference)
- [API documentation](#api-documentation)
- [Architecture notes](#architecture-notes)

## Overview

The app is split into three runtime pieces that talk to each other over
HTTP, plus a shared package of validation schemas [shared package of validation schemas](ARTIFACTS.md#shared-validation-package-packagesshared):

- **Backend** (Node/Express) — REST API, auth, and the PostgreSQL database.
- **Frontend** (React/Vite) — the web UI.
- **Python microservice** (FastAPI) — AI financial insights and receipt OCR
  extraction, both via Groq. The backend calls this service; the frontend
  never talks to it directly.

Core features:

- **Users & groups** — JWT-based signup/login, create/join groups, shared
  group transactions split equally or by custom amount, outstanding balance
  tracking and settlements.
- **Transactions** — create/edit/delete expense or income transactions,
  default or custom categories, recurring transactions, spending
  visualization.
- **Import, capture & export** — CSV import with a pre-import preview,
  receipt upload with OCR-assisted extraction into an editable draft
  transaction, and filtered CSV export.
- **AI insights** — the backend builds a spending summary and sends it to
  the Python microservice, which asks Groq for budgeting advice
  (personal warnings/suggestions, or group fairness/budgeting observations).

## Tech stack

| Layer | Stack |
| --- | --- |
| Backend | Node.js + Express + TypeScript, raw SQL via [`pg`](https://node-postgres.com/) and [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) (no ORM) |
| Frontend | React + TypeScript + Vite + Tailwind CSS, `react-hook-form` + Zod for forms |
| AI microservice | Python + FastAPI, Groq (`llama-3.3-70b-versatile`) for insights, Groq Vision (`qwen/qwen3.6-27b`) for OCR |
| Shared | Zod schemas shared between frontend and backend (`packages/shared`) |
| Monorepo | npm workspaces (`backend`, `frontend`, `packages/*`) |
| Local dev | Docker Compose runs PostgreSQL, backend, and the Python microservice; frontend runs on its own |

## Prerequisites for running the app locally

- **Docker Desktop** (recommended) — runs PostgreSQL, the backend, and the
  Python microservice for you. See [Local setup with Docker](#local-setup-with-docker).
- **Node.js** 20+ and **npm** 10+ — needed either way, to run the frontend
  (it runs separately, not in Docker)
- Optional, for real (non-fallback) AI responses:
  - A **Groq API key** — used for both AI insights and Groq Vision OCR
- Optional, only needed to actually send forgot-password emails:
  - A **Resend API key** + verified sender domain
- Not using Docker? See [Local setup without
  Docker](#local-setup-without-docker) — you'll additionally need
  **Python** 3.11+/`pip` and a local PostgreSQL 16 install.

Everything above marked optional has safe fallback behavior — the app runs
and is fully testable without those keys.

## Project structure

```
expense-tracker/
  docker-compose.yml        # Runs postgres + backend + python-microservice
  packages/
    shared/                 # Zod schemas shared by frontend and backend
      src/
        auth.ts             # e.g. signup, login, forgot/reset password
        groups.ts           # e.g. create/join group
  backend/
    Dockerfile
    migrations/             # Versioned SQL files, one per database change
    src/
      auth/                 # Signup, login, refresh, logout, password reset
      transactions/         # Personal + group transactions, balances, settlements
      groups/               # Create/join groups, members
      categories/           # Default + custom categories
      importExport/         # CSV import/export
      ai/                   # Calls the Python microservice for insights/OCR
      middleware/           # Auth, request validation, error handling
      config/               # Database pool, environment config
    .env.example            # Template for backend/.env
  frontend/
    src/
      components/           # Reusable UI components
      context/              # React context providers (e.g. auth)
      pages/                # Page-level components (routes)
      services/             # API client and request helpers
    .env.example            # Template for frontend/.env
  python-microservice/
    Dockerfile
    app/
      main.py               # FastAPI app, /health
      insights.py           # /generate-insights
      receipts.py           # /extract-receipt (OCR)
    .env.example            # Template for python-microservice/.env
```

Each backend feature (`auth/`, `transactions/`, `groups/`, etc.) follows
the same `Routes → Schemas → Controller → Repository → Model` layering. See
[Architecture notes](#architecture-notes) for how that pattern works, how
the shared validation package works, and how database migrations work.

## Local setup with Docker

PostgreSQL, the backend, and the Python microservice run in Docker via
`docker-compose.yml`. The frontend runs separately with `npm run dev`.

### 1. Configure environment files

```bash
cp backend/.env.example backend/.env
cp python-microservice/.env.example python-microservice/.env
```

- At minimum, set `ACCESS_TOKEN_SECRET` in `backend/.env` to a long random value.
- Everything else can stay as placeholders — Docker Compose overrides `DB_HOST`, `DATABASE_URL`, `AI_SERVICE_URL`, etc. to point containers at each other (see `docker-compose.yml`).
- Fill in `GROQ_API_KEY` only if you want real AI responses instead of the safe fallback behavior.
- Fill in `RESEND_API_KEY` only if you want real password-reset emails instead of the safe fallback behavior.

### 2. Start PostgreSQL, the backend, and the Python microservice

From the repo root:

```bash
docker compose up --build
```

This builds and starts three containers:

- **postgres** — PostgreSQL 16, data persisted in a Docker volume
- **backend** — runs pending migrations, then starts the Express dev
  server (`tsx watch`) on `http://127.0.0.1:3000`
- **python-microservice** — FastAPI with `--reload` on `http://127.0.0.1:8000`

Backend and microservice source files are mounted into their containers,
so edits on your host hot-reload same as running them locally. Leave this
running in its terminal; `Ctrl+C` stops all three. Next time, plain
`docker compose up` is enough — `--build` is only needed after dependency
changes (`package.json`, `requirements.txt`) or Dockerfile edits.

### 3. Install dependencies and start the frontend

In a new terminal, from the repo root:

```bash
npm install
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api by default
npm run dev
```

>`npm install` at the root installs the `frontend`, `backend`, and
`packages/shared` npm workspaces together — running it here also gets you
editor tooling for `backend/` and `packages/shared/` even though those two
run inside Docker.

The frontend runs on `http://localhost:5173` by default.

### 4. Verify everything is running

- `http://127.0.0.1:3000` — backend (no route at `/`, but
  `GET http://127.0.0.1:3000/api/auth/me` with a valid token should respond)
- `http://127.0.0.1:8000/health` — Python microservice health check
- `http://localhost:5173` — frontend; sign up, log in, and you should land
  on the dashboard

## Local setup without Docker

Use this if Docker isn't available to you, or you want direct control over
each process (e.g. attaching a debugger). It assumes Node.js 20+/npm 10+
are already installed (see [Prerequisites](#prerequisites-for-running-the-app-locally));
Python and PostgreSQL are not, so step 1 covers installing those.

**1. Install Python 3.11+ and PostgreSQL 16** — skip either you already have:

macOS (Homebrew):

```bash
brew install python@3.11
brew install postgresql@16
brew services start postgresql@16
```

Windows:

- **Python:** download the installer from
  [python.org/downloads/windows](https://www.python.org/downloads/windows/),
  run it, and check **"Add python.exe to PATH"** before clicking Install.
- **PostgreSQL:** download the installer from
  [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
  and run it. It installs the server plus `psql`/`createdb` and adds them to
  PATH. During install you'll set a password for the `postgres` superuser —
  remember it, it's your `DB_PASSWORD` below. Default port is `5432`.

Verify both installed correctly:

```bash
python3 --version   # Windows: python --version
psql --version
```

**2. Install dependencies** — from the repo root:

```bash
npm install
```

**3. Create the database:**

```bash
createdb expense_tracker
```

This gives you a database at
`postgresql://<user>:<password>@localhost:5432/expense_tracker`.

**4. Configure the backend environment:**

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env` — for a fresh local Postgres install with the
default `postgres` user and no password:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=expense_tracker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker

ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
AI_SERVICE_URL=http://127.0.0.1:8000
```

See the [environment variables reference](#environment-variables-reference)
for what every variable does.

**5. Run database migrations** — still from `backend/`:

```bash
npm run migrate:up
```

**6. Start the backend:**

```bash
npm run dev
```

Runs on `http://127.0.0.1:3000` by default. You can also run it from the
repo root without `cd`-ing in: `npm run -w backend dev`.

**7. Configure and start the frontend** — in a new terminal:

```bash
cd frontend
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5173` by default.

**8. Configure and start the Python microservice** — in a new terminal:

```bash
cd python-microservice
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Runs on `http://127.0.0.1:8000`. Without `GROQ_API_KEY` set, insights and
OCR requests still succeed — they return safe fallback responses instead
of calling out to Groq.

Then verify each service the same way as under [Local setup with
Docker](#4-verify-everything-is-running).

## Usage

Once all three services are running and you've signed up/logged in, the
frontend exposes these pages (see `frontend/src/App.tsx` for the full route
list — all routes below except signup/login/forgot-password require auth):

| Page | Route | What it does |
| --- | --- | --- |
| Dashboard | `/dashboard` | Landing page after login |
| Transactions | `/transactions` | List/create/edit/delete personal and group transactions |
| Visualisation | `/visualisation` | Spending charts by week/month/semester |
| Groups | `/groups` | Create or join a group (join via invite code) |
| Group detail | `/groups/:id` | Group transactions, member balances, settlements |
| Smart Scan | `/smart-scan` | Upload a receipt image, review the OCR-extracted draft, save as a transaction |
| Import CSV | `/import-csv` | Upload a CSV, preview detected rows, confirm import |
| Export | `/export` | Filter transactions and export as CSV |
| AI Insights | `/ai-insights` | Personal or group budgeting insights generated via the Python microservice |
| Settings | `/settings` | Account settings, custom categories |

Auth (`/signup`, `/login`, `/forgot-password`) issues a JWT access token
(short-lived) plus a refresh token (cookie-based); `requireAuth` middleware
protects all authenticated routes on the backend, and group routes are
additionally gated by `requireGroupMember`.

## Environment variables reference

### Backend (`backend/.env`)

> Under `docker compose up`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
> `DB_DATABASE`, `DATABASE_URL`, `AI_SERVICE_URL`, and `CORS_ORIGINS` are
> overridden by `docker-compose.yml` to point at the other containers —
> whatever you put in `.env` for those is ignored under Docker. They still
> matter for [Local setup without Docker](#local-setup-without-docker).

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Individual Postgres connection fields used by the app at runtime |
| `DATABASE_URL` | Full Postgres connection string; this is what `node-pg-migrate` reads to apply migrations |
| `ACCESS_TOKEN_SECRET` | Secret used to sign JWT access tokens — use a long random value, never commit a real one |
| `SALT_ROUNDS` | bcrypt cost factor for password hashing (10–12 is typical) |
| `ACCESS_TOKEN_EXPIRES_IN` | JWT access token lifetime (e.g. `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime in days |
| `RESET_TOKEN_TTL_MINUTES` | How long a forgot-password reset code stays valid |
| `PORT` | Port the Express server listens on (default `3000`) |
| `AI_SERVICE_URL` | Base URL of the Python microservice, no trailing slash (default `http://127.0.0.1:8000`) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Used to send forgot-password emails via [Resend](https://resend.com). Left as placeholders, forgot-password requests still return success but no email is actually sent — see the note below |

> **Forgot-password note:** with a placeholder `RESEND_API_KEY`, the reset
> flow doesn't throw — `authController.ts` doesn't check the SDK's error
> return — so the request appears to succeed with no email delivered. To
> test it for real, either configure a real Resend key + verified domain,
> or temporarily log the generated OTP in `forgotPassword` during local dev.

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API (default `http://localhost:3000/api`). Baked in at build time by Vite — changing it requires a rebuild, not just an env edit |

### Python microservice (`python-microservice/.env`)

| Variable | Purpose |
| --- | --- |
| `SERVICE_NAME`, `APP_VERSION`, `ENVIRONMENT` | Cosmetic metadata, surfaced on `/health` |
| `HOST`, `PORT` | Bind address/port for the uvicorn server (default `0.0.0.0:8000`) |
| `LOG_LEVEL` | Logging verbosity (e.g. `INFO`, `WARNING`) |
| `GROQ_API_KEY` | Enables real Groq-backed insights and Groq Vision OCR. Without it, requests return safe fallback responses instead of failing |
| `GROQ_VISION_MODEL` | Groq vision model used for receipt OCR (default `qwen/qwen3.6-27b`) |
| `GEMINI_API_KEY` | Present in `.env.example` but not currently read anywhere in `app/*.py` — safe to leave blank |
| `OCR_PROVIDER` | Present in `.env.example` but not currently read anywhere in `app/*.py` — safe to leave blank |

Never commit real API keys — all three `.env` files are gitignored;
only the `.env.example` templates are checked in.

## API documentation

See [API_DOCS.md](API_DOCS.md) for request/response details on individual
endpoints. 

## Architecture notes

See [ARTIFACTS.md](ARTIFACTS.md) for a deeper look at how each part of the
app is put together internally: the backend's layered
`Routes → Schemas → Controller → Repository → Model` pattern, how the
shared validation package (`packages/shared`) works and how to add a new
schema to it, the frontend's folder organization, how database migrations
work, and the AI microservice.
