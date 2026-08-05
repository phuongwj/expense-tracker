import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { randomBytes, randomInt, createHash } from "crypto";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import { NotFoundError, UnauthorizedError, ConflictError, TooManyRequestsError, BadRequestError } from "../errors/AppError.ts";
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
import { processRecurringTransactionsForOwner } from "../transactions/transactionRepository.ts";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 10;
const MAX_RESET_ATTEMPTS = 5;
const COOKIE_NAME = 'refresh_token';

/** Attaches the raw refresh token as an httpOnly cookie on the response. */
const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                                       // protects against XSS attacks by hiding cookie from client-side JS
    secure: process.env.NODE_ENV === 'production',        // enforces HTTPS connections (set to false only in local development)
    // 'strict' locally (frontend/backend share the localhost site); 'none' in
    // production since the frontend and backend live on different Render
    // subdomains, which browsers treat as different sites. 'none' requires
    // secure: true, which is already enforced above in production.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
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
    const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

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
    throw new ConflictError('An account with this email already exists. Try logging in if you own the account, or sign up with a different email.');
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
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedError('Incorrect email or password. Please double-check your credentials and try again.');
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id);
  setRefreshCookie(res, refreshToken);

  //if user has recurring transactions that are past due, create them now and return the number of created transactions.
  const recurringProcessed = await processRecurringTransactionsForOwner(user.id);

  return res.status(200).json({
    message: 'Logged in successfully.',
    accessToken,
    user: toPublicUser(user),
    recurringProcessed,
  });
});

/**
 * POST /refresh
 * Rotates a refresh token: the presented token is revoked and replaced by a new pair.
 */
export const refresh = asyncHandler ( async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];

  if (!refreshToken) {
      throw new UnauthorizedError('Your session has expired. Please log in again.');
  }

  const existingToken = await findRefreshTokenByHash(hashToken(refreshToken));

  if (!existingToken || existingToken.revokedAt || existingToken.expiresAt.getTime() < Date.now()) {
      clearRefreshCookie(res);
      throw new UnauthorizedError('Your session has expired. Please log in again.');
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
      throw new NotFoundError('We could not find your account. Please log out and log back in — if this keeps happening, your account may need to be recreated.');
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
  
  //Giving generic message to not expose info about the entered email not existing in the system. 
  if (!user) {
      throw new BadRequestError('Invalid or expired verification code. Please request a new one.');
  }

  const tokenRecord = await findActiveResetTokenByUser(user.id);

  if (!tokenRecord) {
    throw new BadRequestError('Invalid or expired verification code. Please request a new one.');
  }

  if (tokenRecord.attempts >= MAX_RESET_ATTEMPTS) {
    await markAllUserResetTokensUsed(user.id);
    throw new TooManyRequestsError('Too many incorrect attempts. Please request a new verification code.');
  }

  if (hashToken(code) !== tokenRecord.codeHash) {
      await incrementResetTokenAttempts(tokenRecord.id);
      throw new BadRequestError('Invalid or expired verification code. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await updateUserPassword(user.id, passwordHash);
  await markAllUserResetTokensUsed(user.id);
  await revokeAllUserRefreshTokens(user.id);

  return res.status(200).json({
    message: 'Password has been reset successfully. Please log in with your new password.',
  });
});
