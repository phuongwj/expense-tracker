import express from 'express'
import { signUp, logIn, refresh, logOut } from "./authController.ts"
import { validateBody } from "../middleware/validateRequest.ts"
import { signupSchema, loginSchema, refreshTokenSchema } from "./authSchemas.ts"

const router = express.Router()

router.post('/signup', validateBody(signupSchema), signUp)
router.post('/login', validateBody(loginSchema), logIn)
router.post('/refresh', validateBody(refreshTokenSchema), refresh)
router.post('/logout', validateBody(refreshTokenSchema), logOut)

export default router
