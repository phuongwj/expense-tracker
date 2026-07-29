export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password_hash: string;
    created_at: Date;
}

// The user shape safe to send back to clients: no password_hash, and no
// created_at (auth responses don't need it — a profile/settings route can
// expose that later).
export type PublicUser = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

// Maps any full/partial user row down to the client-safe shape. Single source
// of truth so signup and login return an identical user object.
export const toPublicUser = (user: PublicUser): PublicUser => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
});

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
    createdAt: Date;
}

export interface PasswordResetToken {
    id: string;
    userId: string;
    codeHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    attempts: number;
    createdAt: Date;
}