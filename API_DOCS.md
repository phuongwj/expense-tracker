# API Documentation

## Table of Contents

- [Auth API](#auth-api)
- [Transactions API](#transactions-api)
- [Categories API](#categories-api)
- [Settlements & Balances API](#settlements--balances-api)


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

### POST /api/auth/signup

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

### POST /api/auth/login

Verifies credentials and returns a token pair.

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
  }
}
```

**Errors:**

| Status | When                    |
| ------ | ----------------------- |
| 400    | Validation failed       |
| 401    | Wrong email or password |
| 500    | Server error            |

**Note:** Returns the same error for wrong email and wrong password to prevent email enumeration.

### POST /api/auth/refresh

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

### POST /api/auth/logout

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

### GET /api/auth/me
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

### POST /api/auth/forgot-password

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

### POST /api/auth/reset-password

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

## Transactions API

All transaction endpoints are under `/api/transactions` and require a valid JWT access token in the `Authorization: Bearer <token>` header.

There are two kinds of transactions: **personal** (owned by one user, `groupId` is `null`) and **group** (attached to a group, with a `paidBy` and optional splits between members).

**Transaction shape:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "groupId": 12, Note: groupId will be a uuid once the Group table is added. 
  "paidBy": "uuid",
  "categoryId": "uuid",
  "type": "expense",
  "amount": 42.5,
  "transactionDate": "2026-07-14",
  "description": "Groceries",
  "isRecurring": false,
  "recurringInterval": null
}
```
For personal transactions, `groupId` and `paidBy` are always `null`. List endpoints also return a `category` field with the category name (joined in), when `categoryId` is set.

| Method | Endpoint                                 | Description                                     |
| ------ | ---------------------------------------- | ---------------------------------------------- |
| GET    | `/api/transactions`                      | Get the user's personal transactions           |
| POST   | `/api/transactions`                      | Create a personal transaction                  |
| PUT    | `/api/transactions/:id`                  | Update a personal transaction                  |
| DELETE | `/api/transactions/:id`                  | Delete a personal transaction                  |
| GET    | `/api/transactions/group/:groupId`       | List a group's transactions                    |
| POST   | `/api/transactions/group/:groupId`       | Create a group transaction (optionally split)  |
| PUT    | `/api/transactions/group/:groupId/:id`   | Update a group transaction                     |
| DELETE | `/api/transactions/group/:groupId/:id`   | Delete a group transaction                     |

### GET /api/transactions

Lists the user's personal transactions (`groupId IS NULL`), ordered by `transactionDate` descending.

**Query params (all optional):** `startDate`, `endDate` (ISO dates), `type` (`expense`|`income`), `categoryId` (UUID), `isRecurring` (boolean), `recurringInterval` (`daily`|`weekly`|`biweekly`|`monthly`|`yearly`).

**Success (200):** `{ "transactions": [ ...transaction ] }`

**Errors:** `401` missing/invalid token · `500` server error

**Note:** if neither `startDate` nor `endDate` is given, defaults to the **last 30 days**.

### POST /api/transactions

**Request body:**
```json
{
  "type": "expense",
  "amount": 42.5,
  "categoryId": "uuid",
  "transactionDate": "2026-07-14",
  "description": "Groceries",
  "isRecurring": false,
  "recurringInterval": null
}
```

| Field             | Type    | Rules                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------ |
| type              | string  | required, `expense` \| `income`                                          |
| amount            | number  | required, greater than zero                                              |
| categoryId        | string  | optional, UUID, nullable                                                 |
| transactionDate   | string  | required, ISO date                                                       |
| description       | string  | optional, nullable, max 255 chars                                        |
| isRecurring       | boolean | optional, defaults to `false`                                            |
| recurringInterval | string  | optional, nullable, `daily`\|`weekly`\|`biweekly`\|`monthly`\|`yearly`    |

**Success (201):** the created transaction.

**Errors:** `400` validation failed · `401` · `500`

**Note:** `recurringInterval` is only saved when `isRecurring` is `true` — otherwise it's forced to `null`.

### PUT /api/transactions/:id

Same body shape as create, but `type`, `amount`, `transactionDate`, and `isRecurring` are all required (the frontend resends the full object with updated fields).

**Success (200):** the updated transaction.

**Errors:** `400` · `401` · `404` not found / not owned by user · `500`

### DELETE /api/transactions/:id

**Success (204):** no content.

**Errors:** `400` invalid UUID · `401` · `404` · `500`

### GET /api/transactions/group/:groupId

Same query params and 30-day default window as the personal list endpoint, scoped to the group.

**Success (200):** `{ "transactions": [ ... ] }`

**Errors:** `401` · `500`

### POST /api/transactions/group/:groupId

Creates a group transaction, optionally split between members.

**Request body:**
```json
{
  "type": "expense",
  "amount": 90,
  "categoryId": "uuid",
  "transactionDate": "2026-07-14",
  "description": "Dinner",
  "isRecurring": false,
  "recurringInterval": null,
  "paidBy": "uuid",
  "splits": [
    { "userId": "uuid", "amount": 30 },
    { "userId": "uuid", "amount": 30 },
    { "userId": "uuid", "amount": 30 }
  ]
}
```

Same rules as the personal create, plus:

| Field    | Type   | Rules                                                          |
| -------- | ------ | ----------------------------------------------------------------- |
| paidBy   | string | optional — defaults to the authenticated user if omitted           |
| splits   | array  | optional, list of `{ userId, amount }`; `amount` must be greater than zero |

**Success (201):** the created transaction plus the created splits:
```json
{
  "id": "uuid",
  "...": "...transaction fields",
  "splits": [
    { "id": "uuid", "transactionId": "uuid", "userId": "uuid", "amount": 30 }
  ]
}
```

**Errors:** `400` · `401` · `500`

**Note:** `groupId` is currently a **number**, not a UUID — temporary until a dedicated Group entity exists.

### PUT /api/transactions/group/:groupId/:id

Same body as the group create endpoint, minus `paidBy` and `splits`.

**Success (200):** the updated transaction.

**Errors:** `400` · `401` · `404` · `500`


### DELETE /api/transactions/group/:groupId/:id

**Success (204):** no content.

**Errors:** `401` · `404` · `500`

## Categories API

All category endpoints are under `/api/categories` and require a valid JWT access token in the `Authorization: Bearer <token>` header.

**Category shape:**
```json
{ "id": "uuid", "name": "Groceries", "userId": "uuid" }
```
System (shared) categories have `userId: null` and are visible to everyone, but can't be edited or deleted by a regular user (updates/deletes are scoped to `user_id = <you>`, so they simply won't match a system category and will return `404`).

| Method | Endpoint               | Description                                          |
| ------ | ----------------------- | ------------------------------------------------------ |
| GET    | `/api/categories`      | List the user's categories plus system categories       |
| POST   | `/api/categories`      | Create a category for the user                          |
| PUT    | `/api/categories/:id`  | Update one of the user's categories                      |
| DELETE | `/api/categories/:id`  | Delete one of the user's categories                      |

### GET /api/categories

**Success (200):** `{ "categories": [ { "id": "uuid", "name": "Groceries", "userId": "uuid" }, ... ] }` (includes both the user's own categories and system categories, ordered by name).

**Errors:** `401` · `500`

### POST /api/categories

**Request body:** `{ "name": "Groceries" }`

| Field | Type   | Rules                        |
| ----- | ------ | ----------------------------- |
| name  | string | required, 1–100 characters     |

**Success (201):** the created category.

**Errors:** `400` · `401` · `500`

### PUT /api/categories/:id

**Request body:** `{ "name": "New name" }` (same rules as create)

**Success (200):** the updated category.

**Errors:** `400` · `401` · `404` not found, or not owned by the user (includes system categories) · `500`

### DELETE /api/categories/:id

**Success (204):** no content.

**Errors:** `400` invalid UUID · `401` · `404` not found, or not owned by the user · `500`

## Settlements & Balances API

These endpoints live under `/api/transactions` alongside group transactions, and all require `Authorization: Bearer <token>`.

**How balances work:** a balance between two users is the sum of what they owe each other from transaction splits, minus whatever they've already settled. If the result is positive, the logged in user owes that person; if negative, they owe the user.

| Method | Endpoint                                          | Description                                        |
| ------ | --------------------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/transactions/balances`                       | User's net balance with every other user, across all groups |
| GET    | `/api/transactions/group/:groupId/balances`        | User's net balance with each member of one group          |
| POST   | `/api/transactions/group/:groupId/settlements`     | Record a settlement (a debt being paid off)              |

### GET /api/transactions/balances

**Success (200):**
```json
{
  "balances": [
    { "userId": "uuid", "amount": 25, "direction": "you_owe" },
    { "userId": "uuid", "amount": 10, "direction": "owes_you" }
  ],
  "summary": {
    "totalOwedByYou": 25,
    "totalOwedToYou": 10,
    "net": -15
  }
}
```
`direction` is `you_owe` if you owe that user, or `owes_you` if they owe you. Users with a net balance of `0` are omitted from the list.

**Errors:** `401` · `500`

### GET /api/transactions/group/:groupId/balances

Same as above, scoped to one group.

**Success (200):** `{ "groupId": 12, "balances": [ ... ] }`

**Errors:** `401` · `500`

### POST /api/transactions/group/:groupId/settlements

Records that one member has repaid another. **Only the person being repaid can create the settlement**, and it must be for the **full** amount currently owed — partial settlements aren't supported yet.

**Request body:**
```json
{
  "repayingUserId": "uuid",
  "amount": 25
}
```

| Field          | Type   | Rules                                  |
| -------------- | ------ | ----------------------------------------- |
| repayingUserId | string | required — the user who is paying you off |
| amount         | number | required, greater than zero                |

**Success (201):**
```json
{
  "id": "uuid",
  "groupId": 12,
  "paidBy": "uuid",
  "paidTo": "uuid",
  "amount": 25,
  "settledAt": "2026-07-14T18:00:00.000Z"
}
```
`paidBy` is the `repayingUserId` from the request; `paidTo` is the logged in user (with the JWT containing userId).

**Errors:**

| Status | When                                                                 |
| ------ | ------------------------------------------------------------------- |
| 400    | `repayingUserId` is the same as the authenticated user                |
| 400    | That member doesn't currently owe you anything in this group           |
| 400    | `amount` doesn't match the full amount owed (response includes `expectedAmount`) |
| 401    | Missing or invalid token                                               |
| 500    | Server error                                                           |

### Settlements & balances flow overview

```
Split a group expense
  -> POST /api/transactions/group/:groupId with "splits": [{userId, amount}, ...]
  -> Each split represents an amount one member owes the payer

Check what's owed
  -> GET /api/transactions/group/:groupId/balances (one group)
     or GET /api/transactions/balances (everything, with a summary)
  -> Balance = sum of splits owed - sum of settlements already paid

Settle up
  -> The person being repaid calls POST /.../settlements with the payer's ID and the full amount owed
  -> Server verifies the amount matches exactly, then records it
  -> Future balance calculations subtract this settlement from what's owed
```