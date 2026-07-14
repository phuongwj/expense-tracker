import { z } from "zod";

export const signupSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().toLowerCase().email("A valid email is required."),
    // bcrypt silently truncates at 72 bytes, so cap here to avoid the
    // surprise of two different passwords hashing to the same value.
    password: z.string().min(8, "Password must be at least 8 characters.")
        .max(72, "Password must be at most 72 characters."),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email("A valid email is required."),
    password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token is required."),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
