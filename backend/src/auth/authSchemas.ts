/**
 * Shorthand convention for
 * import { signupSchema } from "@expense-tracker/shared/auth";
 * export { signupSchema }
 * etc.
 * 
 * Reason why we're writing it this way is so that all the existing imports
 * in the backend files don't have to be updated.
 */

export {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "@expense-tracker/shared/auth";

export type {
    SignupInput,
    LoginInput,
    ForgotPasswordInput,
    ResetPasswordInput,
} from "@expense-tracker/shared/auth";
