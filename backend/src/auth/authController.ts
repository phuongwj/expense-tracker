import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { randomBytes, randomInt, createHash } from "crypto";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import {
    findUserByEmail,
    findUserById,
    createUser,
    insertRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshToken,
    revokeAllUserRefreshTokens,
    insertPasswordResetToken,
    findActiveResetTokenByUser,
    incrementResetTokenAttempts,
    markAllUserResetTokensUsed,
    updateUserPassword,
} from "./authRepository.ts";
import { SignupInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from "./authSchemas.ts";
import { toPublicUser } from "./authModel.ts";
import { sendPasswordResetEmail } from "../config/email.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 10;
const MAX_RESET_ATTEMPTS = 5;
const COOKIE_NAME = 'refresh_token';

/** Attaches the raw refresh token as an httpOnly cookie on the response. */
const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                                       // protects against XSS attacks by hiding cookie from client-side JS
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
export const signUp = asyncHandler(async (req: Request<{}, {}, SignupInput>, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

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
  });

/**
 * POST /login
 * Verifies credentials and issues a new access/refresh token pair.
 */
export const logIn = asyncHandler(async (req: Request<{}, {}, LoginInput>, res: Response) => {
  const { email, password } = req.body;

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
});

/**
 * POST /refresh
 * Rotates a refresh token: the presented token is revoked and replaced by a new pair.
 */
export const refresh = asyncHandler ( async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

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
});

/**
 * POST /logout
 * Revokes the presented refresh token, ending that session.
 */
export const logOut = asyncHandler (async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];

  if (refreshToken) {
      const existingToken = await findRefreshTokenByHash(hashToken(refreshToken));

      if (existingToken) {
        await revokeAllUserRefreshTokens(existingToken.userId);
      }
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
});

/**
 * GET /me
 * Returns the authenticated user's profile.
 */
export const getMe = asyncHandler (async (req: Request, res: Response) => {
  const user = await findUserById(req.userId!);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.status(200).json({ user: toPublicUser(user) });
});

/**
 * POST /forgot-password
 * Generates a 6-digit OTP and logs it to the console (email service TODO).
 * Always returns 200 to prevent email enumeration.
 */
export const forgotPassword = asyncHandler (async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
  const { email } = req.body;

  const user = await findUserByEmail(email);

  if (user) {
    await markAllUserResetTokensUsed(user.id);

    const otp = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await insertPasswordResetToken(user.id, hashToken(otp), expiresAt);

    await sendPasswordResetEmail(email, otp);
  }

  return res.status(200).json({
    message: 'If an account with that email exists, a verification code has been sent.',
  });
});

/**
 * POST /reset-password
 * Validates the OTP, updates the password, and invalidates all sessions.
 * Locks out after MAX_RESET_ATTEMPTS failed tries.
 */
export const resetPassword = asyncHandler (async (req: Request<{}, {}, ResetPasswordInput>, res: Response) => {
  const { email, code, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  const tokenRecord = await findActiveResetTokenByUser(user.id);

  if (!tokenRecord) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  if (tokenRecord.attempts >= MAX_RESET_ATTEMPTS) {
    await markAllUserResetTokensUsed(user.id);
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  if (hashToken(code) !== tokenRecord.codeHash) {
    await incrementResetTokenAttempts(tokenRecord.id);
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await updateUserPassword(user.id, passwordHash);
  await markAllUserResetTokensUsed(user.id);
  await revokeAllUserRefreshTokens(user.id);

  return res.status(200).json({
    message: 'Password has been reset successfully. Please log in with your new password.',
  });
});
