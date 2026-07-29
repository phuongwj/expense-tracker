# API Documentation

## Table of Contents

- [Auth API](#auth-api)
- [Groups API](#groups-api)


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

---

## Groups API

All group endpoints are under `/api/groups` and require a valid access token in the `Authorization: Bearer <token>` header.

| Method | Endpoint                              | Description                                      |
| ------ | ------------------------------------- | ------------------------------------------------ |
| POST   | `/api/groups`                         | Create a new group                               |
| POST   | `/api/groups/join`                    | Join a group using its invite code               |
| GET    | `/api/groups`                         | List all groups the current user belongs to      |
| GET    | `/api/groups/:id`                     | Get group details and member list                |
| PATCH  | `/api/groups/:id/regenerate-code`     | Generate a new invite code (leader only)         |
| DELETE | `/api/groups/:id/members/:userId`     | Remove a member or leave the group               |
| DELETE | `/api/groups/:id`                     | Delete the group entirely (leader only)          |

### POST /api/groups

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

### POST /api/groups/join

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

### GET /api/groups

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

### GET /api/groups/:id

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

| Status | When                          |
| ------ | ----------------------------- |
| 401    | Not authenticated             |
| 403    | Not a member of this group    |
| 404    | Group doesn't exist           |
| 500    | Server error                  |

**Note:** `joinCode` is only included in the response if the requesting user's role is `leader`.

### PATCH /api/groups/:id/regenerate-code

Invalidates the current invite code and issues a new one. Leader only.

**Request body:** None.

**Success (200):**
```json
{
  "joinCode": "ZQ7T2M5N"
}
```

**Errors:**

| Status | When                          |
| ------ | ----------------------------- |
| 401    | Not authenticated             |
| 403    | Not a member or not the leader |
| 404    | Group doesn't exist           |
| 500    | Server error                  |

### DELETE /api/groups/:id/members/:userId

Removes a member from the group. The leader can remove anyone. Regular members can only remove themselves (leave the group). The leader cannot leave while other members remain — they must transfer leadership first.

**Request body:** None.

**Success (200):**
```json
{
  "message": "Member removed."
}
```

**Errors:**

| Status | When                                                    |
| ------ | ------------------------------------------------------- |
| 401    | Not authenticated                                       |
| 403    | Not the leader and not removing yourself                |
| 404    | Member not found in group                               |
| 409    | Leader trying to leave while other members remain       |
| 500    | Server error                                            |

### DELETE /api/groups/:id

Deletes the group entirely. Leader only. All members are removed (cascade delete).

**Request body:** None.

**Success (200):**
```json
{
  "message": "Group deleted."
}
```

**Errors:**

| Status | When                    |
| ------ | ----------------------- |
| 401    | Not authenticated       |
| 403    | Not the leader          |
| 500    | Server error            |
