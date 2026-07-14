import express from 'express'
import { createPersonal, getPersonal, updatePersonal, deletePersonal } from "./transactionController.ts"
import { validateBody, validateQuery } from "../middleware/validateRequest.ts"
import { createTransactionSchema, getTransactionsSchema, updateTransactionSchema } from "./transactionSchemas.ts"

const router = express.Router()


//**IMPORTANT: Need to update these routes to include authMiddleware once issue with adding token to Request object is sorted */

/**
 * GET /api/transactions/     Returns Personal Transactions for the user, optionally filtered by query parameters
 */
router.get('/', getPersonal)

/**
 * POST /api/transactions/    Creates a new Personal Transaction for the user
 */
router.post('/', validateBody(createTransactionSchema), createPersonal)

/**
 * PUT /api/transactions/:id    Updates the user's Personal Transaction for the given ID
 */
router.put('/:id', validateBody(updateTransactionSchema), updatePersonal)

/**
 * DELETE /api/transactions/:id    Deletes the user's Personal Transaction with the given ID
 */
router.delete('/:id', deletePersonal)

export default router