import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import {
    findUserByEmail,
    createUser,
    insertRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshToken,
    revokeAllUserRefreshTokens,
} from "./authRepository.ts";
import { SignupInput, LoginInput } from "./authSchemas.ts";
import { toPublicUser } from "./authModel.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;
const COOKIE_NAME = 'refresh_token';

/** Attaches the raw refresh token as an httpOnly cookie on the response. */
const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                                       //protects against XSS attacks by hiding cookie from client-side JS
    secure: process.env.NODE_ENV === 'production',        // enforces HTTPS connections (set to false only in local development)
    sameSite: 'strict',                                   // protects against Cross-Site Request Forgery (CSRF)
    path: '/api/auth',                                    // only sent to auth routes
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, // cookie lifespan
  });
};

/** Removes the refresh-token cookie, used on logout and invalid-token paths. */
const clearRefreshCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
}

/**
 * Hashes a raw refresh token for storage/lookup. We only ever persist the
 * SHA-256 hash, never the raw token, so a database leak can't be used to forge
 * sessions. The same hash is recomputed to look a token up on refresh/logout.
 */
const hashToken = (token: string): string =>
    createHash('sha256').update(token).digest('hex');

/**
 * Issues a fresh access/refresh token pair for a user.
 * - The access token is a short-lived signed JWT (JWT_EXPIRES_IN).
 * - The refresh token is a long-lived random opaque string; only its hash is
 *   stored (via insertRefreshToken), and it expires after REFRESH_TOKEN_TTL_DAYS.
 * @param userId - The user the tokens are issued to.
 * @returns The raw accessToken and refreshToken (to return to the client) plus
 *          the stored refreshTokenRecord (used to link rotation on refresh).
 */
const issueTokenPair = async (userId: string) => {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const refreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const refreshTokenRecord = await insertRefreshToken(userId, hashToken(refreshToken), expiresAt);

    return { accessToken, refreshToken, refreshTokenRecord };
};

/**
 * POST /signup
 * Creates a new user and logs them in immediately.
 */
export const signUp = async (req: Request<{}, {}, SignupInput>, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(firstName, lastName, email, passwordHash);
    const { accessToken, refreshToken } = await issueTokenPair(user.id);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      message: 'Account created.',
      accessToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
};

/**
 * POST /login
 * Verifies credentials and issues a new access/refresh token pair.
 */
export const logIn = async (req: Request<{}, {}, LoginInput>, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);

    // Same generic error for both cases on purpose — don't leak which
    // registered emails exist.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Logged in successfully.',
      accessToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
};

/**
 * POST /refresh
 * Rotates a refresh token: the presented token is revoked and replaced by a new pair.
 */
export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  try {
    const existingToken = await findRefreshTokenByHash(hashToken(refreshToken));

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt.getTime() < Date.now()) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const issued = await issueTokenPair(existingToken.userId);
    await revokeRefreshToken(existingToken.id, issued.refreshTokenRecord.id);
    setRefreshCookie(res, issued.refreshToken);

    return res.status(200).json({
      accessToken: issued.accessToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Something went wrong refreshing your session.' });
  }
};

/**
 * POST /logout
 * Revokes the presented refresh token, ending that session.
 */
export const logOut = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];

  try {
    if (refreshToken) {
      const existingToken = await findRefreshTokenByHash(hashToken(refreshToken));

      if (existingToken) {
        await revokeAllUserRefreshTokens(existingToken.userId);
      }
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Something went wrong logging you out.' });
  }
};
