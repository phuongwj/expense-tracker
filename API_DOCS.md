# API Documentation

## Table of Contents

- [Conventions](#conventions)
- [Auth API](#auth-api)
- [Groups API](#groups-api)
- [Transactions API](#transactions-api)
- [Categories API](#categories-api)
- [Import/Export API](#importexport-api)
- [AI API (Backend Proxy)](#ai-api-backend-proxy)
- [AI Microservice (Python/FastAPI)](#ai-microservice-pythonfastapi)


## Conventions

- **Base URL:** every endpoint in this document except the last section is served by the Node/Express backend under `/api` (e.g. `http://localhost:3000/api/...`). The last section, the Python/FastAPI microservice, is a separate service reachable at whatever `AI_SERVICE_URL` points to (default `http://127.0.0.1:8000`) — the frontend never calls it directly, only the backend does.
- **Auth:** endpoints marked "requires auth" need a valid JWT access token in the `Authorization: Bearer <token>` header, checked by the `requireAuth` middleware (`backend/src/middleware/authMiddleware.ts`). Routes shaped like `/group/:groupId/...` additionally run `requireGroupMember`, which checks the `group_members` table for a row matching `:groupId` + the caller's user id and returns `403` if none exists.
- **Generic error shape** (`backend/src/middleware/errorHandler.ts`): any thrown error not handled inline by a controller is caught by the global error handler and returned as:
  ```json
  { "error": "A human-readable message." }
  ```
  The status code comes from the thrown error (`AppError` subclasses in `backend/src/errors/AppError.ts` — `NotFoundError` 404, `BadRequestError` 400, `ForbiddenError` 403, `UnauthorizedError` 401, `ConflictError` 409, `TooManyRequestsError` 429, `ServiceUnavailableError` 503) and defaults to `500` for anything else (e.g. a raw database error), in which case the message sent to the client is a generic "unexpected server error" string — the real error and stack trace are logged server-side only.
- **Validation error shape** (`backend/src/middleware/validateRequest.ts`): routes wrapped in `validateBody` / `validateQuery` / `validateParams` run a Zod schema against `req.body` / `req.query` / `req.params` before the controller runs. On failure they short-circuit with **400**:
  ```json
  {
    "error": "Validation failed.",
    "fields": {
      "email": "A valid email is required.",
      "password": "Password must be at least 8 characters."
    }
  }
  ```
  `fields` has one entry per invalid field, keyed by the Zod issue's path (or `_root` for object-level `.refine()` failures with no path), with only the first error message per field. A few endpoints in Import/Export and AI build this same `{ error, fields }` shape by hand instead of via the middleware — noted where that happens.


## Auth API

All auth endpoints are under `/api/auth`. Endpoints marked with a lock require a valid JWT access token in the `Authorization: Bearer <token>` header.

| Method | Endpoint                      | Description                                        |
| ------ | ----------------------------- | -------------------------------------------------- |
| POST   | `/api/auth/signup`            | Create a new account and log in immediately        |
| POST   | `/api/auth/login`             | Verify credentials and get a token pair            |
| POST   | `/api/auth/refresh`           | Rotate refresh token and get a new access token    |
| POST   | `/api/auth/logout`            | Revoke all sessions                                |
| GET    | `/api/auth/me`                | Get the authenticated user's profile               |
| POST   | `/api/auth/forgot-password`   | Send a 6-digit OTP to the user's email             |
| POST   | `/api/auth/reset-password`    | Validate OTP and set a new password                |

### POST `/api/auth/signup`

Creates a new account and logs the user in immediately.

**Request body:**
```json
{
  "firstName": "Julia",
  "lastName": "Pham",
  "email": "julia@example.com",
  "password": "securepassword"
}
```

| Field     | Type   | Rules                             |
| --------- | ------ | --------------------------------- |
| firstName | string | required, trimmed                 |
| lastName  | string | required, trimmed                 |
| email     | string | required, valid email, lowercased |
| password  | string | required, 8–72 characters         |

**Success (201):**
```json
{
  "message": "Account created.",
  "accessToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "firstName": "Julia",
    "lastName": "Pham",
    "email": "julia@example.com"
  }
}
```

**Errors:**

| Status | When                                 |
| ------ | ------------------------------------ |
| 400    | Validation failed (missing/bad fields) |
| 409    | Email already registered             |
| 500    | Server error                         |

### POST `/api/auth/login`

Verifies credentials and returns a token pair. As a side effect, this also runs the same "generate due recurring transactions" pass that `GET /api/transactions` runs (see [Transactions API](#transactions-api)), so any of the user's recurring transactions that came due while they were logged out are created before the response is sent.

**Request body:**
```json
{
  "email": "julia@example.com",
  "password": "securepassword"
}
```

| Field    | Type   | Rules                             |
| -------- | ------ | --------------------------------- |
| email    | string | required, valid email, lowercased |
| password | string | required                          |

**Success (200):**
```json
{
  "message": "Logged in successfully.",
  "accessToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "firstName": "Julia",
    "lastName": "Pham",
    "email": "julia@example.com"
  },
  "recurringProcessed": 0
}
```

`recurringProcessed` is the number of new transactions that were auto-generated from due recurring templates during this login.

**Errors:**

| Status | When                    |
| ------ | ----------------------- |
| 400    | Validation failed       |
| 401    | Wrong email or password |
| 500    | Server error            |

**Note:** Returns the same error for wrong email and wrong password to prevent email enumeration.

### POST `/api/auth/refresh`

Rotates the refresh token and returns a new access token. The refresh token is read from the `refresh_token` httpOnly cookie (not from the request body).

**Request body:** None.

**Success (200):**
```json
{
  "accessToken": "eyJhbG..."
}
```

**Errors:**

| Status | When                                       |
| ------ | ------------------------------------------ |
| 401    | No cookie, token expired, or token revoked |
| 500    | Server error                               |

**How it works:** The old refresh token is revoked and a new one is issued. This is called **token rotation** — each refresh token can only be used once, which limits the damage if one is stolen.

### POST `/api/auth/logout`

Revokes all refresh tokens for the user, ending all sessions.

**Request body:** None.

**Success (200):**
```json
{
  "message": "Logged out successfully."
}
```

**Errors:**

| Status | When         |
| ------ | ------------ |
| 500    | Server error |

**Note:** If the `refresh_token` cookie is missing or doesn't match a known token, this still returns 200 (it just clears the cookie) — it never errors on logout.

### GET `/api/auth/me`
Returns the authenticated user's profile.

**Request body:** None.

**Headers:** `Authorization: Bearer <accessToken>`

**Success (200):**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "Julia",
    "lastName": "Pham",
    "email": "julia@example.com"
  }
}
```

**Errors:**

| Status | When                             |
| ------ | -------------------------------- |
| 401    | Missing or invalid token         |
| 404    | User not found (deleted account) |
| 500    | Server error                     |

### POST `/api/auth/forgot-password`

Sends a 6-digit OTP to the user's email for password reset.

**Request body:**
```json
{
  "email": "julia@example.com"
}
```

| Field | Type   | Rules                             |
| ----- | ------ | --------------------------------- |
| email | string | required, valid email, lowercased |

**Success (200):**
```json
{
  "message": "If an account with that email exists, a verification code has been sent."
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 400    | Validation failed |
| 500    | Server error      |

**Note:** Always returns 200 even if the email doesn't exist — this prevents attackers from discovering which emails are registered.

**Local testing caveat:** email delivery goes through Resend (`backend/src/config/email.ts`). `RESEND_API_KEY` in `.env.example` is a placeholder, and the controller doesn't check the `{ error }` half of the Resend SDK's response — so with an invalid/placeholder key, this endpoint still returns its normal 200 success message but **no email is actually sent**. For local testing, use a real Resend key + verified domain, or temporarily log the generated OTP inside `forgotPassword` in `authController.ts`.

### POST `/api/auth/reset-password`

Validates the OTP and sets a new password. Revokes all sessions (refresh tokens) so the user has to log in again everywhere.

**Request body:**
```json
{
  "email": "julia@example.com",
  "code": "482910",
  "password": "mynewpassword"
}
```

| Field    | Type   | Rules                             |
| -------- | ------ | --------------------------------- |
| email    | string | required, valid email, lowercased |
| code     | string | required, exactly 6 digits        |
| password | string | required, 8–72 characters         |

**Success (200):**
```json
{
  "message": "Password has been reset successfully. Please log in with your new password."
}
```

**Errors:**

| Status | When                                               |
| ------ | -------------------------------------------------- |
| 400    | Invalid/expired code, or user not found            |
| 429    | Too many failed attempts (5 max), request new code |
| 500    | Server error                                       |

### Auth flow overview

```
Signup/Login
  -> Server returns { accessToken, user } + sets refresh_token cookie
  -> Frontend stores accessToken in memory (not localStorage)
  -> Frontend attaches Authorization: Bearer <token> to every API request

Token expires (401 from any endpoint)
  -> Frontend calls POST /refresh (cookie sent automatically)
  -> Server returns new { accessToken } + rotates cookie
  -> Frontend retries the original request

Logout
  -> Frontend calls POST /logout
  -> Server revokes all refresh tokens, clears cookie
  -> Frontend clears accessToken from memory

Forgot password
  -> User enters email → POST /forgot-password → 6-digit code sent to email
  -> User enters code + new password → POST /reset-password
  -> All sessions revoked, user must log in again
```

---

## Groups API

All group endpoints are under `/api/groups` and require a valid access token in the `Authorization: Bearer <token>` header. Unlike the transaction/import-export "group" routes, these endpoints do **not** run a separate `requireGroupMember` middleware — group membership is instead checked inside each controller (see notes per endpoint below), which is why "not a member" and "group doesn't exist" often return the same `404` rather than a `403`.

| Method | Endpoint                              | Description                                      |
| ------ | ------------------------------------- | ------------------------------------------------ |
| POST   | `/api/groups`                         | Create a new group                               |
| POST   | `/api/groups/join`                    | Join a group using its invite code               |
| GET    | `/api/groups`                         | List all groups the current user belongs to      |
| GET    | `/api/groups/:id`                     | Get group details and member list                |
| PATCH  | `/api/groups/:id/regenerate-code`     | Generate a new invite code (leader only)         |
| DELETE | `/api/groups/:id/members/:userId`     | Remove a member or leave the group               |
| DELETE | `/api/groups/:id`                     | Delete the group entirely (leader only)          |

### POST `/api/groups`

Creates a new group. The creator automatically becomes the group leader.

**Request body:**
```json
{
  "name": "Roommates"
}
```

| Field | Type   | Rules                          |
| ----- | ------ | ------------------------------ |
| name  | string | required, trimmed, 1–100 chars |

**Success (201):**
```json
{
  "group": {
    "id": "uuid",
    "name": "Roommates",
    "joinCode": "AB3X9K2P",
    "createdBy": "uuid",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors:**

| Status | When                    |
| ------ | ----------------------- |
| 400    | Missing/empty name      |
| 401    | Not authenticated       |
| 500    | Server error            |

**Note:** invite codes are 8-character random hex strings; on the rare chance of a collision the server retries once with a new code before giving up with a 500.

### POST `/api/groups/join`

Joins a group using its invite code. The user becomes a regular member.

**Request body:**
```json
{
  "joinCode": "AB3X9K2P"
}
```

| Field    | Type   | Rules    |
| -------- | ------ | -------- |
| joinCode | string | required |

**Success (200):**
```json
{
  "group": {
    "id": "uuid",
    "name": "Roommates",
    "role": "member"
  }
}
```

**Errors:**

| Status | When                              |
| ------ | --------------------------------- |
| 400    | Missing code                      |
| 401    | Not authenticated                 |
| 404    | Code doesn't match any group      |
| 409    | Already a member of this group    |
| 500    | Server error                      |

### GET `/api/groups`

Lists all groups the current user belongs to.

**Success (200):**
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "Roommates",
      "role": "leader"
    },
    {
      "id": "uuid",
      "name": "Ski Trip",
      "role": "member"
    }
  ]
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 401    | Not authenticated |
| 500    | Server error      |

### GET `/api/groups/:id`

Returns group details and the full member list. Requires the requesting user to be a member. The `joinCode` is only included if the requesting user is the leader.

**Success (200):**
```json
{
  "group": {
    "id": "uuid",
    "name": "Roommates",
    "createdBy": "uuid",
    "createdAt": "...",
    "joinCode": "AB3X9K2P"
  },
  "members": [
    {
      "userId": "uuid",
      "firstName": "Alice",
      "lastName": "Smith",
      "role": "leader",
      "joinedAt": "..."
    }
  ]
}
```

**Errors:**

| Status | When                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------- |
| 401    | Not authenticated                                                                                   |
| 404    | Group doesn't exist, **or** the requesting user is not a member (same generic 404 for both, so non-members can't tell which group IDs are real) |
| 500    | Server error                                                                                        |

**Note:** `joinCode` is only included in the response if the requesting user's role is `leader`.

### PATCH `/api/groups/:id/regenerate-code`

Invalidates the current invite code and issues a new one. Leader only.

**Request body:** None.

**Success (200):**
```json
{
  "joinCode": "ZQ7T2M5N"
}
```

**Errors:**

| Status | When                                                          |
| ------ | -------------------------------------------------------------- |
| 401    | Not authenticated                                               |
| 403    | Requester is a member of the group but not the leader          |
| 404    | Group doesn't exist, or the requester is not a member          |
| 500    | Server error                                                    |

### DELETE `/api/groups/:id/members/:userId`

Removes a member from the group. The leader can remove anyone. Regular members can only remove themselves (leave the group). The leader cannot leave while other members remain — they must transfer leadership first.

**Request body:** None.

**Success (200):**
```json
{
  "message": "Member removed."
}
```

**Errors:**

| Status | When                                                                                   |
| ------ | --------------------------------------------------------------------------------------- |
| 401    | Not authenticated                                                                        |
| 403    | Requester is not the leader and is not removing themselves                              |
| 404    | Group doesn't exist / requester is not a member, **or** `:userId` is not a member of this group |
| 409    | Leader trying to leave while other members remain                                       |
| 500    | Server error                                                                             |

### DELETE `/api/groups/:id`

Deletes the group entirely. Leader only. Group memberships (`group_members` rows) are removed via a database `ON DELETE CASCADE`.

**Request body:** None.

**Success (200):**
```json
{
  "message": "Group deleted."
}
```

**Errors:**

| Status | When                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 401    | Not authenticated                                                                                            |
| 403    | Requester is a member of the group but not the leader                                                       |
| 404    | Group doesn't exist, or the requester is not a member                                                       |
| 500    | Server error — **including** the case below                                                                 |

**Known limitation:** `group_members` cascade-deletes when a group is deleted, but `transactions.group_id` and `settlements.group_id` do **not** have `ON DELETE CASCADE` in the migrations. If the group still has any group transactions or settlements, the `DELETE FROM groups` query will fail on a foreign-key constraint violation, which surfaces to the client as a generic 500 rather than a clear "delete the group's transactions first" message. There is currently no endpoint that bulk-deletes a group's transactions, so in practice a group with any transaction history can't be deleted through the API as-is.

---

## Transactions API

All endpoints are under `/api/transactions` and require a valid access token. The `/group/:groupId/...` routes additionally require the caller to be a member of `:groupId` (`requireGroupMember` — see [Conventions](#conventions)).

| Method | Endpoint                                              | Description                                                    |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------- |
| GET    | `/api/transactions`                                     | List the caller's personal transactions, optionally filtered   |
| POST   | `/api/transactions`                                     | Create a personal transaction                                  |
| PUT    | `/api/transactions/:id`                                 | Update a personal transaction                                  |
| DELETE | `/api/transactions/:id`                                 | Delete a personal transaction                                  |
| GET    | `/api/transactions/group/:groupId`                      | List a group's transactions, optionally filtered                |
| POST   | `/api/transactions/group/:groupId`                      | Create a group transaction (optionally split among members)     |
| PUT    | `/api/transactions/group/:groupId/:id`                  | Update a group transaction                                     |
| DELETE | `/api/transactions/group/:groupId/:id`                  | Delete a group transaction                                     |
| GET    | `/api/transactions/balances`                            | The caller's net balances with every other user, across all groups |
| GET    | `/api/transactions/group/:groupId/balances`             | The caller's net balances with each member of one group         |
| POST   | `/api/transactions/group/:groupId/settlements`           | Record a settlement (mark a debt as paid)                       |

A **transaction** returned by the API has this shape:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "groupId": "uuid or null",
  "paidBy": "uuid or null",
  "categoryId": "uuid or null",
  "category": "Groceries or null",
  "type": "expense",
  "amount": 42.5,
  "transactionDate": "2026-08-01",
  "description": "Weekly groceries",
  "isRecurring": false,
  "recurringInterval": "monthly or null"
}
```
`category` (the joined category **name**) is only populated on `GET` list responses, which `LEFT JOIN categories`. The `POST`/`PUT` responses return the raw inserted/updated row and only include `categoryId`, not `category`.

**Side effect on every `GET`:** before returning results, both `GET /api/transactions` and `GET /api/transactions/group/:groupId` run `processRecurringTransactionsForOwner`, which finds any of the caller's recurring transaction templates whose `next_occurrence` is due (`<= CURRENT_DATE`) and inserts one new transaction (and copies of its splits, for group transactions) per missed interval before advancing `next_occurrence`. This also runs on `POST /api/auth/login`. There is no separate "generate recurring transactions" endpoint — it's always a side effect of these calls.

### GET `/api/transactions`

Lists the caller's personal transactions (`group_id IS NULL`), most recent first, optionally filtered by query parameters.

**Query parameters:**

| Field             | Type                                                        | Rules    |
| ------------------ | ------------------------------------------------------------ | -------- |
| startDate           | string, `YYYY-MM-DD`                                          | optional |
| endDate             | string, `YYYY-MM-DD`                                          | optional |
| type                | `"expense"` \| `"income"`                                     | optional |
| categoryId          | string (uuid)                                                 | optional |
| isRecurring         | `"true"` \| `"false"` (coerced to boolean)                     | optional |
| recurringInterval   | `"daily"` \| `"weekly"` \| `"biweekly"` \| `"monthly"` \| `"yearly"` | optional |

**Success (200):**
```json
{
  "transactions": [ /* array of transaction objects, see shape above */ ]
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 400    | Invalid query parameters |
| 401    | Not authenticated |
| 500    | Server error      |

### POST `/api/transactions`

Creates a new personal transaction.

**Request body:**
```json
{
  "type": "expense",
  "amount": 42.5,
  "categoryId": "uuid",
  "transactionDate": "2026-08-01",
  "description": "Weekly groceries",
  "isRecurring": true,
  "recurringInterval": "monthly"
}
```

| Field             | Type    | Rules                                                              |
| ------------------ | ------- | -------------------------------------------------------------------- |
| type                | string  | required, `"expense"` or `"income"`                                  |
| amount              | number  | required, must be greater than 0                                     |
| categoryId          | string  | optional/nullable, must be a valid UUID if provided                  |
| transactionDate     | string  | required, `YYYY-MM-DD`                                               |
| description         | string  | optional/nullable, trimmed, max 255 characters                       |
| isRecurring         | boolean | optional, defaults to `false`                                        |
| recurringInterval   | string  | optional/nullable, one of `daily`/`weekly`/`biweekly`/`monthly`/`yearly` |

**Note:** the schema does **not** require `recurringInterval` when `isRecurring` is `true` — you can create a transaction with `isRecurring: true` and no `recurringInterval`. The controller then stores `recurringInterval` as `null`, which means `next_occurrence` is also stored as `null`, so that "recurring" transaction will never actually generate future occurrences (`findDueRecurringTransactions` requires `next_occurrence <= CURRENT_DATE`, which a `NULL` never satisfies). If you want a working recurring transaction, always send `recurringInterval`.

**Success (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "groupId": null,
  "paidBy": null,
  "categoryId": "uuid",
  "type": "expense",
  "amount": 42.5,
  "transactionDate": "2026-08-01",
  "description": "Weekly groceries",
  "isRecurring": true,
  "recurringInterval": "monthly"
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 400    | Validation failed |
| 401    | Not authenticated |
| 500    | Server error      |

### PUT `/api/transactions/:id`

Updates a personal transaction. The full object must be resent (not a partial patch) — every field below except `categoryId`/`description`/`recurringInterval` is required, including `isRecurring`.

**Request body:** same shape as `POST /api/transactions`, except `isRecurring` is required (not defaulted).

**Success (200):** the updated transaction object (same shape as the `POST` response).

**Errors:**

| Status | When                                                                 |
| ------ | ----------------------------------------------------------------------- |
| 400    | Validation failed                                                        |
| 401    | Not authenticated                                                        |
| 404    | Transaction not found, already deleted, or not owned by the caller     |
| 500    | Server error                                                             |

### DELETE `/api/transactions/:id`

Deletes a personal transaction owned by the caller.

**Request body:** None. `:id` is validated as a UUID (`validateParams`) before the controller runs.

**Success:** `204 No Content`.

**Errors:**

| Status | When                                                             |
| ------ | -------------------------------------------------------------------- |
| 400    | `:id` is not a valid UUID                                            |
| 401    | Not authenticated                                                     |
| 404    | Transaction not found, already deleted, or not owned by the caller  |
| 500    | Server error                                                          |

### GET `/api/transactions/group/:groupId`

Lists a group's transactions, most recent first. Same query parameters as `GET /api/transactions` (see above).

**Success (200):**
```json
{ "transactions": [ /* transaction objects, groupId/paidBy populated */ ] }
```

**Errors:**

| Status | When                             |
| ------ | ---------------------------------- |
| 400    | Invalid query parameters           |
| 401    | Not authenticated                  |
| 403    | Not a member of this group         |
| 500    | Server error                       |

### POST `/api/transactions/group/:groupId`

Creates a new group transaction, optionally split among group members.

**Request body:**
```json
{
  "type": "expense",
  "amount": 60,
  "categoryId": "uuid",
  "transactionDate": "2026-08-01",
  "description": "Group dinner",
  "isRecurring": false,
  "paidBy": "uuid",
  "splits": [
    { "userId": "uuid-a", "amount": 30 },
    { "userId": "uuid-b", "amount": 30 }
  ]
}
```

| Field             | Type    | Rules                                                                 |
| ------------------ | ------- | ------------------------------------------------------------------------ |
| type                | string  | required, `"expense"` or `"income"`                                      |
| amount              | number  | required, must be greater than 0                                         |
| categoryId          | string  | optional/nullable — **not** validated as a UUID (unlike personal transactions) |
| transactionDate     | string  | required, `YYYY-MM-DD`                                                   |
| description         | string  | optional/nullable, trimmed, max 255 characters                           |
| isRecurring         | boolean | optional, defaults to `false` (same "no interval required" caveat as personal transactions, above) |
| recurringInterval   | string  | optional/nullable, one of `daily`/`weekly`/`biweekly`/`monthly`/`yearly`   |
| paidBy              | string  | optional, defaults to the caller's user id if omitted. **Not validated** to be a member of the group. |
| splits              | array   | optional, `[{ userId: string, amount: number > 0 }]`. If provided, the split amounts must sum to `amount` (within 0.01) or the request is rejected. `userId` values are **not validated** to be members of the group. |

**Success (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "groupId": "uuid",
  "paidBy": "uuid",
  "categoryId": "uuid",
  "type": "expense",
  "amount": 60,
  "transactionDate": "2026-08-01",
  "description": "Group dinner",
  "isRecurring": false,
  "recurringInterval": null,
  "splits": [
    { "id": "uuid", "transactionId": "uuid", "userId": "uuid-a", "amount": 30 },
    { "id": "uuid", "transactionId": "uuid", "userId": "uuid-b", "amount": 30 }
  ]
}
```
`splits` is `[]` if no `splits` array was sent.

**Errors:**

| Status | When                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------- |
| 400    | Validation failed, including `"Split amounts must add up to the transaction's total amount."` |
| 401    | Not authenticated                                                                                |
| 403    | Not a member of this group                                                                       |
| 500    | Server error                                                                                      |

### PUT `/api/transactions/group/:groupId/:id`

Updates a group transaction's core fields. **Cannot** change `paidBy` or the split breakdown directly — there's no `paidBy`/`splits` field in this request body.

**Request body:**
```json
{
  "type": "expense",
  "amount": 90,
  "categoryId": "uuid",
  "transactionDate": "2026-08-01",
  "description": "Group dinner (updated)",
  "isRecurring": false,
  "recurringInterval": null
}
```
Same field rules as the group transaction's `type`/`amount`/`categoryId`/`transactionDate`/`description`/`recurringInterval` above; `isRecurring` is required (not defaulted).

**Behavior:** if `amount` changes, any existing `transaction_splits` rows for this transaction are automatically rescaled proportionally (`new_split = old_split * new_amount / old_amount`, rounded to 2 decimals), preserving whatever split ratio was originally set. The rescaled splits are **not** included in the response body — only the updated transaction fields are returned.

**Success (200):** the updated transaction object (no `splits` key).

**Errors:**

| Status | When                                                       |
| ------ | -------------------------------------------------------------- |
| 400    | Validation failed                                                |
| 401    | Not authenticated                                                 |
| 403    | Not a member of this group                                        |
| 404    | Group transaction not found or already deleted                  |
| 500    | Server error                                                       |

### DELETE `/api/transactions/group/:groupId/:id`

Deletes a group transaction. Its `transaction_splits` rows are removed via database `ON DELETE CASCADE`.

**Request body:** None. (Unlike the personal `DELETE`, `:id`/`:groupId` are **not** run through `validateParams` here — a malformed UUID falls through to the database and surfaces as a generic 500 rather than a 400.)

**Success:** `204 No Content`.

**Errors:**

| Status | When                                             |
| ------ | --------------------------------------------------- |
| 401    | Not authenticated                                     |
| 403    | Not a member of this group                            |
| 404    | Group transaction not found or already deleted       |
| 500    | Server error                                           |

### GET `/api/transactions/balances`

Returns the caller's net balance with every other user they have shared group expenses with, across **all** of their groups, plus a summary total.

**Success (200):**
```json
{
  "balances": [
    { "userId": "uuid", "amount": 42.5, "direction": "you_owe" },
    { "userId": "uuid", "amount": 10, "direction": "owes_you" }
  ],
  "summary": {
    "totalOwedByYou": 42.5,
    "totalOwedToYou": 10,
    "net": -32.5
  }
}
```
`direction` is `"you_owe"` if the caller owes that user, `"owes_you"` if that user owes the caller. Pairs with a net balance of exactly 0 are omitted. `summary.net` is `totalOwedToYou - totalOwedByYou`.

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 401    | Not authenticated |
| 500    | Server error      |

### GET `/api/transactions/group/:groupId/balances`

Same calculation as above, restricted to one group.

**Success (200):**
```json
{
  "groupId": "uuid",
  "balances": [
    { "userId": "uuid", "amount": 42.5, "direction": "you_owe" }
  ]
}
```

**Errors:**

| Status | When                        |
| ------ | ----------------------------- |
| 401    | Not authenticated              |
| 403    | Not a member of this group     |
| 500    | Server error                   |

### POST `/api/transactions/group/:groupId/settlements`

Records a settlement — i.e. marks a debt within the group as paid. Only the person being **repaid** can record it (the caller is always `paidTo`); there's no way for the person who owes money to record their own payment.

**Request body:**
```json
{
  "repayingUserId": "uuid",
  "amount": 42.5
}
```

| Field           | Type   | Rules                          |
| ---------------- | ------ | ------------------------------- |
| repayingUserId    | string | required                        |
| amount            | number | required, must be greater than 0 |

**Business rules (enforced in the controller, not the schema):**
- `repayingUserId` cannot equal the caller's own id.
- The current net amount `repayingUserId` owes the caller within this group is recomputed from splits + prior settlements; if it's `0` or negative, the request is rejected.
- **Partial settlements are not supported.** `amount` must exactly equal the full amount currently owed — any other amount is rejected with a message stating the exact amount owed.

**Success (201):**
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "paidBy": "uuid",
  "paidTo": "uuid",
  "amount": 42.5,
  "settledAt": "..."
}
```

**Errors:**

| Status | When                                                                                     |
| ------ | -------------------------------------------------------------------------------------------- |
| 400    | Validation failed; settling with yourself; nothing currently owed; amount doesn't match the full amount owed |
| 401    | Not authenticated                                                                              |
| 403    | Not a member of this group                                                                      |
| 500    | Server error                                                                                    |

---

## Categories API

All endpoints are under `/api/categories` and require a valid access token.

| Method | Endpoint                | Description                                        |
| ------ | ------------------------ | ---------------------------------------------------- |
| GET    | `/api/categories`         | List system categories + the caller's own categories |
| POST   | `/api/categories`         | Create a category                                    |
| PUT    | `/api/categories/:id`     | Rename a category                                    |
| DELETE | `/api/categories/:id`     | Delete a category                                    |

### GET `/api/categories`

Returns every system-wide category (`user_id IS NULL`, available to all users) plus the caller's own custom categories, sorted alphabetically by name.

**Success (200):**
```json
{
  "categories": [
    { "id": "uuid", "name": "Groceries", "userId": null },
    { "id": "uuid", "name": "Textbooks", "userId": "uuid" }
  ]
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 401    | Not authenticated |
| 500    | Server error      |

### POST `/api/categories`

Creates a new category owned by the caller.

**Request body:**
```json
{ "name": "Textbooks" }
```

| Field | Type   | Rules                                              |
| ----- | ------ | --------------------------------------------------- |
| name  | string | required, 1–100 characters (**not** trimmed by the schema — leading/trailing whitespace is stored as-is) |

**Success (201):**
```json
{ "id": "uuid", "name": "Textbooks", "userId": "uuid" }
```

**Errors:**

| Status | When                     |
| ------ | -------------------------- |
| 400    | Validation failed           |
| 401    | Not authenticated           |
| 500    | Server error, **including** a duplicate name for this user (see note) |

**Note:** the `categories` table has a `UNIQUE (user_id, name)` constraint, but the controller doesn't catch that specific database error — creating a category with a name you already have (exact match) fails with a generic 500 rather than a clean `409 Conflict`.

### PUT `/api/categories/:id`

Renames a category. Only categories owned by the caller can be updated — the query is scoped by `user_id = <caller>`, so system categories (`user_id IS NULL`) and other users' categories can't be renamed via this endpoint.

**Request body:** same as `POST /api/categories`.

**Success (200):**
```json
{ "id": "uuid", "name": "Course Materials", "userId": "uuid" }
```

**Errors:**

| Status | When                                                             |
| ------ | -------------------------------------------------------------------- |
| 400    | Validation failed                                                      |
| 401    | Not authenticated                                                       |
| 404    | Category not found, already deleted, or not owned by the caller       |
| 500    | Server error (including the same duplicate-name caveat as `POST`)     |

### DELETE `/api/categories/:id`

Deletes a category owned by the caller.

**Request body:** None. `:id` is validated as a UUID before the controller runs.

**Success:** `204 No Content`.

**Errors:**

| Status | When                                                                                      |
| ------ | --------------------------------------------------------------------------------------------- |
| 400    | `:id` is not a valid UUID                                                                       |
| 401    | Not authenticated                                                                                |
| 404    | Category not found, already deleted, or not owned by the caller                                |
| 500    | Server error — **including** if the category is still referenced by any transaction (see note) |

**Note:** `transactions.category_id` references `categories(id)` with no `ON DELETE` behavior specified (defaults to `RESTRICT`/`NO ACTION`). Deleting a category that's still used by an existing transaction will fail with a foreign-key constraint violation, surfaced as a generic 500 rather than a friendly message — the same pattern as deleting a group with existing transactions (see [Groups API](#groups-api)).

---

## Import/Export API

Import endpoints are under `/api/import`, export endpoints under `/api/export` (both mounted from the same router at `/api`). All endpoints require a valid access token; the `/export/group/:groupId/...` endpoints additionally require group membership.

Import/export is backed by **real database persistence** — `backend/src/importExport/importExportMockStore.ts` (an in-memory array) still exists in the codebase but is never imported by the controller, service, or repository. It's dead code left over from an earlier implementation; imported rows are written to the real `transactions` table via `importExportRepository.ts`.

| Method | Endpoint                                      | Description                                                          |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------ |
| POST   | `/api/import/preview`                            | Parse a CSV (without saving) and report which rows are valid/invalid    |
| POST   | `/api/import/confirm`                            | Save the valid rows from a previewed import as personal transactions    |
| POST   | `/api/export/preview`                            | Preview the caller's personal transactions matching export filters      |
| GET    | `/api/export/csv`                                | Download **all** of the caller's personal transactions as CSV           |
| POST   | `/api/export/group/:groupId/preview`             | Preview a group's transactions matching export filters                  |
| GET    | `/api/export/group/:groupId/csv`                 | Download **all** of a group's transactions as CSV                       |

### POST `/api/import/preview`

Parses CSV text into rows and validates each one, without saving anything. Accepts **either**:
- a JSON body: `{ "csvText": "date,description,amount,type,category\n..." }`, or
- `multipart/form-data` with a single file in field `file` (must end in `.csv` or have a CSV-ish mimetype: `text/csv`, `application/csv`, `application/vnd.ms-excel`; max 2 MB via Multer).

If both are sent, the uploaded file wins. If neither is present, or the file isn't recognized as CSV, this returns `400` with a plain `{ "error": "..." }` — this route does **not** run through `validateBody`/`validateRequest.ts`, so errors here don't have the `fields` object that most other 400s do.

Required CSV columns (case-insensitive header match): `date`, `description`, `amount`, `type`, `category`.

Per-row validation:
| Column | Rule |
| ------ | ---- |
| date | required, must parse as a valid date |
| description | required (non-empty after trim) |
| amount | required, numeric, must be greater than 0 |
| type | required, must be exactly `income` or `expense` (case-insensitive) |
| category | required (any non-empty string — matched/created by name at confirm time, not validated against existing categories here) |

**Success (200):**
```json
{
  "summary": { "totalRows": 5, "validRows": 4, "invalidRows": 1 },
  "validRows": [
    { "date": "2026-08-01", "description": "Coffee", "amount": 4.5, "type": "expense", "category": "Food" }
  ],
  "invalidRows": [
    { "rowNumber": 3, "row": { "date": "", "description": "...", "amount": "...", "type": "...", "category": "..." }, "errors": ["date is required"] }
  ]
}
```

**Errors:**

| Status | When                                                                              |
| ------ | -------------------------------------------------------------------------------------- |
| 400    | No `csvText`/`file` provided; file isn't CSV; CSV is empty; CSV is missing required columns |
| 401    | Not authenticated                                                                        |
| 500    | Server error                                                                              |

### POST `/api/import/confirm`

Saves rows (typically the `validRows` from a prior `/import/preview` call) as **personal** transactions for the caller. There is no group-import endpoint.

**Request body:**
```json
{
  "rows": [
    { "date": "2026-08-01", "description": "Coffee", "amount": 4.5, "type": "expense", "category": "Food" }
  ]
}
```

| Field | Type  | Rules                                                                 |
| ----- | ----- | ------------------------------------------------------------------------ |
| rows  | array | required, at least 1 row; each row needs `date`/`description`/`type`/`category` (strings) and `amount` (number or string) |

**Behavior:** each row is re-validated with the same row-level rules used by `/import/preview` (this schema is looser than that re-check, so a row that passes the Zod shape can still fail the semantic check and be skipped). For each row that passes: an existing category with a case-insensitive matching name is looked up for the caller; if none exists, a new category is created on the fly. A personal transaction (`is_recurring: false`) is then inserted. Rows that fail validation are **not** saved and are reported back — this endpoint never returns a 400 for row-level problems, it always returns 200 with `skippedRows` describing what failed.

**Success (200):**
```json
{
  "savedCount": 4,
  "skippedCount": 1,
  "savedTransactions": [
    { "id": "uuid", "date": "2026-08-01", "description": "Coffee", "amount": 4.5, "type": "expense", "category": "Food", "source": "csv_import", "createdAt": "..." }
  ],
  "skippedRows": [
    { "rowNumber": 1, "row": { "...": "..." }, "errors": ["amount must be a positive number"] }
  ]
}
```

**Errors:**

| Status | When                        |
| ------ | ----------------------------- |
| 400    | `rows` missing or empty array  |
| 401    | Not authenticated              |
| 500    | Server error                   |

### POST `/api/export/preview`

Returns the caller's personal transactions matching the given filters, plus totals — used to render the export preview table before download.

**Request body:**
```json
{
  "type": "expense",
  "category": "Food",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31"
}
```

| Field     | Type   | Rules                                                    |
| ---------- | ------ | ----------------------------------------------------------- |
| type        | string | optional, `"all"` \| `"income"` \| `"expense"`               |
| category    | string | optional, matched case-insensitively against the category **name** (not `categoryId`) |
| startDate   | string | optional, non-empty string (not date-format validated by the schema itself) |
| endDate     | string | optional, non-empty string                                   |

All fields are optional — an empty body returns every personal transaction.

**Success (200):**
```json
{
  "summary": { "rowCount": 12, "totalIncome": 500, "totalExpenses": 320.5, "netAmount": 179.5 },
  "rows": [
    { "id": "uuid", "date": "2026-07-05", "description": "Rent", "amount": 250, "type": "expense", "category": "Housing", "source": "personal_transaction", "createdAt": "..." }
  ]
}
```

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 400    | Validation failed, or an internal error building the preview (caught and returned as a plain `{ "error": "..." }`, not the `fields` shape) |
| 401    | Not authenticated |
| 500    | Server error      |

### GET `/api/export/csv`

Downloads a CSV file of **all** of the caller's personal transactions — it does not accept any query parameters or filters, unlike `/export/preview`.

**Response:** `200`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="personal-transactions-export.csv"`. Columns: `date,description,amount,type,category,source,createdAt`.

**Note (frontend behavior vs. this endpoint):** the frontend's export page (`frontend/src/pages/ExportData.tsx`) does **not** call this endpoint. It builds the downloaded CSV client-side from the rows already returned by `/export/preview`, so the "Download CSV" button in the UI does respect the selected filters — but that's a client-side workaround, not something this endpoint does. Calling `GET /api/export/csv` directly (e.g. via curl) always returns an unfiltered export of the caller's entire transaction history.

**Errors:**

| Status | When              |
| ------ | ----------------- |
| 401    | Not authenticated |
| 500    | Server error      |

### POST `/api/export/group/:groupId/preview`

Same as `POST /api/export/preview`, scoped to a group's transactions. Rows use `"source": "group_transaction"`.

**Errors:** same as `/export/preview`, plus `403` if the caller is not a member of `:groupId`.

### GET `/api/export/group/:groupId/csv`

Same as `GET /api/export/csv`, but for a group's transactions — and with the same caveat: it ignores filters and is not what the frontend's group export download actually calls (the frontend again builds the CSV client-side from the group preview rows).

**Response:** `Content-Disposition: attachment; filename="group-transactions-export.csv"`.

**Errors:**

| Status | When                        |
| ------ | ----------------------------- |
| 401    | Not authenticated              |
| 403    | Not a member of this group     |
| 500    | Server error                   |

---

## AI API (Backend Proxy)

All endpoints are under `/api/ai` and require a valid access token. These endpoints don't generate AI output themselves — they build a request payload from the caller's own data and proxy it to the separate Python/FastAPI microservice (see [AI Microservice (Python/FastAPI)](#ai-microservice-pythonfastapi)) via `backend/src/ai/aiService.ts`, using `AI_SERVICE_URL` (default `http://127.0.0.1:8000`) with a 60-second timeout (`DEFAULT_TIMEOUT_MS`) — long enough to cover a cold-started microservice instance on Render's free tier waking up. The frontend only ever calls these backend routes — it never talks to the Python service directly. The frontend's `api.ts` also shows a one-shot "warming up" toast on the first backend request and the first AI request of a page load, so a slow cold-start response doesn't read as a hang.

| Method | Endpoint                     | Description                                                      |
| ------ | ------------------------------ | -------------------------------------------------------------------- |
| POST   | `/api/ai/insights`              | Build a personal financial summary and get back budgeting insights   |
| POST   | `/api/ai/extract-receipt`       | Send a receipt image (or mock fields) and get back a draft transaction |

### POST `/api/ai/insights`

**Request body:** none required — the frontend sends `{}` and the body is ignored entirely.

**Behavior:** fetches **all** of the caller's personal transactions (`getPersonalTransactions(userId, {})` — no date filtering, despite the resulting summary being labeled `"period": "monthly"`), and builds:
```json
{
  "scope": "personal",
  "period": "monthly",
  "totalIncome": 1200,
  "totalExpenses": 950,
  "netBalance": 250,
  "topCategories": [ { "category": "Groceries", "amount": 300 } ],
  "recurringExpenses": [ { "name": "Netflix", "amount": 15.99 } ]
}
```
(`topCategories` is the top 5 expense categories by amount; `recurringExpenses` lists every expense transaction with `isRecurring: true`.) This is POSTed as JSON to the microservice's `POST /generate-insights`.

**Success (200):**
```json
{
  "summarySent": { "...": "the summary object above" },
  "insights": {
    "summary": "...",
    "riskLevel": "low",
    "positiveNotes": ["..."],
    "warnings": ["..."],
    "recommendations": ["..."],
    "nextActions": ["..."]
  }
}
```

**Errors:**

| Status | When                                                                                     |
| ------ | --------------------------------------------------------------------------------------------- |
| 401    | Not authenticated                                                                                |
| 503    | Microservice unreachable, timed out (>60s), or returned a non-2xx status. Body: `{ "message": "...", "summarySent": {...} }` |
| 500    | Server error                                                                                      |

**Note:** this endpoint only ever sends a **personal**-scope summary. `aiSchemas.ts` defines `groupInsightsSummarySchema` (`scope: "group"`) and the Python microservice's `/generate-insights` fully supports it, but nothing in the backend currently builds one or exposes a group-insights route — group-mode AI insights described in the project proposal are not wired up end-to-end yet.

### POST `/api/ai/extract-receipt`

Two ways to call it:

**1. With an uploaded image** — `multipart/form-data` with field `file` (the receipt image) and optional text fields `documentType` (`"receipt"` | `"invoice"`, default `"receipt"`) and `receiptText`.
- `file`'s mimetype must be `image/jpeg`, `image/png`, or `image/webp` (400 otherwise).
- `file` must not be empty (400 otherwise).
- The raw image bytes are forwarded as `multipart/form-data` (fields `file`, `documentType`, `receiptText`) to the microservice's `POST /extract-receipt`, where they're actually run through OCR (see next section).

**2. Without a file** — a plain JSON body validated against at least one of `receiptText` / `fileName` / `mimeType` / `documentType`. This is forwarded as JSON (no image bytes), so the microservice always returns its non-OCR fallback response for this path.

**Success (200)** — same shape either way:
```json
{
  "merchant": "Trader Joe's",
  "date": "2026-07-31",
  "totalAmount": 24.13,
  "categorySuggestion": "Groceries",
  "description": "Grocery run",
  "draftTransaction": {
    "date": "2026-07-31",
    "description": "Grocery run",
    "amount": 24.13,
    "type": "expense",
    "category": "Groceries",
    "merchant": "Trader Joe's"
  },
  "confidence": "vision",
  "note": "Draft transaction generated from receipt scan. Please review before saving."
}
```
`confidence` reflects what the microservice returned: `"vision"` (real Groq OCR succeeded), `"fallback"` (Groq unavailable/failed), or another string/`null` depending on the model's own output.

**Errors:**

| Status | When                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------- |
| 400    | Unsupported file mimetype; empty file; validation failed on the no-file JSON path (with `fields`)  |
| 401    | Not authenticated                                                                                     |
| 503    | Microservice unreachable, timed out, or errored. Body: `{ "message": "...", "receiptRequest": { "fileName", "mimeType", "documentType" } }` |
| 500    | Server error                                                                                           |

---

## AI Microservice (Python/FastAPI)

A separate FastAPI service (`python-microservice/`, entrypoint `app/main.py`) that the Express backend calls over HTTP — it is **not** called directly by the frontend. Base URL is whatever the backend's `AI_SERVICE_URL` env var points to (default `http://127.0.0.1:8000`); the microservice's own `.env` controls the port it listens on (`PORT`, default `8000`). It has no authentication of its own — it implicitly trusts the backend as its only caller, since it's expected to run on a private/internal network rather than be exposed publicly.

| Method | Endpoint             | Description                                                |
| ------ | ---------------------- | -------------------------------------------------------------- |
| GET    | `/health`               | Liveness/readiness check                                       |
| POST   | `/generate-insights`    | Generate AI budgeting insights from a financial summary        |
| POST   | `/extract-receipt`      | Extract structured data from a receipt/invoice image via OCR   |

### GET `/health`

**Success (200):**
```json
{
  "status": "ok",
  "service": "expense-tracker-ai-microservice",
  "version": "0.1.0"
}
```
`service`/`version` come from the `SERVICE_NAME`/`APP_VERSION` env vars.

### POST `/generate-insights`

**Request body:** a Pydantic discriminated union on `scope` — either:

Personal:
```json
{
  "scope": "personal",
  "period": "monthly",
  "totalIncome": 1200,
  "totalExpenses": 950,
  "netBalance": 250,
  "topCategories": [ { "category": "Groceries", "amount": 300 } ],
  "recurringExpenses": [ { "name": "Netflix", "amount": 15.99 } ]
}
```

Group:
```json
{
  "scope": "group",
  "period": "monthly",
  "groupName": "Roommates",
  "totalGroupExpenses": 800,
  "topCategories": [ { "category": "Utilities", "amount": 200 } ],
  "memberContributions": [
    { "memberName": "Alice", "paid": 500, "share": 400, "balance": 100 }
  ]
}
```

**Behavior:** tries Groq first (`generate_groq_insights` in `app/insights.py`), using `GROQ_API_KEY` and model `llama-3.3-70b-versatile`, with a system prompt tuned for student budgeting (told to treat low/zero income as normal rather than a crisis, avoid "get a job"-style advice, avoid financial-advisor jargon, and prefer small realistic budgeting habits over big life changes) and a strict JSON response contract. If `GROQ_API_KEY` is unset, the `groq` package isn't installed, or the Groq call/JSON parsing fails for any reason, it falls back to `build_fallback_insights` — a deterministic, rule-based response (thresholds on `netBalance`/`totalExpenses` for personal, member balance imbalances ≥ 100 for group) that always includes a `warnings` entry saying `"Fallback insights are being used because Groq is unavailable."` plus the specific failure reason. **This fallback path is what runs by default in local dev** (`GROQ_API_KEY` unset in `.env.example`) — useful for exercising the full insights flow end-to-end without a real API key, but it means the "AI-generated" insights you see locally are actually a canned, rule-based response unless a real key is configured.

**Success (200):**
```json
{
  "summary": "...",
  "riskLevel": "low",
  "positiveNotes": ["..."],
  "warnings": ["..."],
  "recommendations": ["..."],
  "nextActions": ["..."]
}
```

**Errors:**

| Status | When                                                                    |
| ------ | ---------------------------------------------------------------------------- |
| 422    | Request body fails Pydantic validation (standard FastAPI error shape, `{ "detail": [...] }`) |

There's no explicit 5xx handling in the route itself — Groq failures are absorbed into the fallback response above rather than returned as an HTTP error, so a 5xx here would only come from something unexpected (e.g. the process itself crashing).

### POST `/extract-receipt`

**Request body** depends on `Content-Type`:
- `multipart/form-data`: field `file` (the image), `documentType` (`"receipt"` | `"invoice"`, default `"receipt"`), `receiptText` (optional).
- `application/json`: `{ "fileName": "...", "mimeType": "...", "documentType": "receipt", "receiptText": "..." }` — no actual image bytes are possible over this path, so it always uses the fallback below.

**Behavior:** for a multipart request with a real file, tries Groq **vision** (`generate_groq_receipt_extraction` in `app/receipts.py`) using `GROQ_API_KEY` and `GROQ_VISION_MODEL` (default `qwen/qwen3.6-27b`) — the image is base64-encoded into a data URL and sent to the model with a strict-JSON extraction prompt; the returned date string is normalized to ISO format (several input formats are accepted: `YYYY-MM-DD`, `MM/DD/YYYY`, `MM-DD-YYYY`, `YYYY/MM/DD`, `DD/MM/YYYY`, `DD-MM-YYYY`). If `GROQ_API_KEY` is unset, the SDK isn't installed, the uploaded image is empty, the multipart form has no file at all, the request used the JSON path instead of multipart, or the Groq call/JSON parsing fails, it falls back to `build_fallback_receipt_extraction` — a deterministic stub that derives a "merchant" name from the uploaded filename (or `"Receipt Upload"`), and returns `amount: 0`, `category: "Other"`, a fixed placeholder `date` (`2026-07-31`), and `confidence: "fallback"`.

**Success (200):**
```json
{
  "merchant": "Trader Joe's",
  "date": "2026-07-31",
  "amount": 24.13,
  "category": "Groceries",
  "description": "Grocery run",
  "confidence": "vision"
}
```

**Errors:**

| Status | When                                                                     |
| ------ | ------------------------------------------------------------------------------ |
| 422    | JSON-path request body fails Pydantic validation                                 |

There is no error status for a missing/invalid file on the multipart path — the endpoint always responds `200` with the fallback extraction instead of erroring, since a missing receipt image is treated as an expected, recoverable case rather than a client error.

**Config that looks load-bearing but isn't:** `python-microservice/.env.example` also defines `GEMINI_API_KEY` and `OCR_PROVIDER` (default `mock`). Neither is read anywhere in `app/main.py`, `app/insights.py`, or `app/receipts.py` — despite this project's `CLAUDE.md` describing insights as "Gemini/Groq" and OCR as "currently mocked," the actual implementation only ever calls Groq (chat completions for insights, vision chat completions for receipt OCR) and falls back to the rule-based/stub responses described above when Groq is unavailable — it never calls Gemini or branches on `OCR_PROVIDER`.
