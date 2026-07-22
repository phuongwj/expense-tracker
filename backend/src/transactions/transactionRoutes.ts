import express from 'express'
import { createPersonal, getPersonal, updatePersonal, deletePersonal } from "./transactionController.ts"
import { validateBody, validateQuery, validateParams } from "../middleware/validateRequest.ts"
import { createTransactionSchema, getTransactionsSchema, updateTransactionSchema, deleteTransactionSchema } from "./transactionSchemas.ts"
import { requireAuth } from "../middleware/authMiddleware.ts"

const router = express.Router()

/**
 * GET /api/transactions/     Returns Personal Transactions for the user, optionally filtered by query parameters
 */
router.get('/', requireAuth, validateQuery(getTransactionsSchema), getPersonal)

/**
 * POST /api/transactions/    Creates a new Personal Transaction for the user
 */
router.post('/', requireAuth, validateBody(createTransactionSchema), createPersonal)

/**
 * PUT /api/transactions/:id    Updates the user's Personal Transaction for the given ID
 */
router.put('/:id', requireAuth, validateBody(updateTransactionSchema), updatePersonal)

/**
 * DELETE /api/transactions/:id    Deletes the user's Personal Transaction with the given ID
 */
router.delete('/:id', requireAuth, validateParams(deleteTransactionSchema), deletePersonal)

export default router
