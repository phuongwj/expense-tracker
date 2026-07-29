import express from 'express'
import { signUp, logIn, refresh, logOut, getMe, forgotPassword, resetPassword } from "./authController.ts"
import { validateBody } from "../middleware/validateRequest.ts"
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./authSchemas.ts"
import { requireAuth } from "../middleware/authMiddleware.ts"

const router = express.Router()

router.post('/signup', validateBody(signupSchema), signUp)
router.post('/login', validateBody(loginSchema), logIn)
router.post('/refresh', refresh)
router.post('/logout', logOut)
router.get('/me', requireAuth, getMe)
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)

export default router
