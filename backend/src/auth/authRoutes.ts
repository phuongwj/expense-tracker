import express from 'express'
import { signUp, logIn, refresh, logOut } from "./authController.ts"
import { validateBody } from "../middleware/validateRequest.ts"
import { signupSchema, loginSchema } from "./authSchemas.ts"

const router = express.Router()

router.post('/signup', validateBody(signupSchema), signUp)
router.post('/login', validateBody(loginSchema), logIn)
router.post('/refresh', refresh)
router.post('/logout', logOut)

export default router
