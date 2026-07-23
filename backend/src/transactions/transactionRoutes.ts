import express from 'express'
import { createPersonal, getPersonal, updatePersonal, deletePersonal,
        createGroup, getGroup, updateGroup, deleteGroup
 } from "./transactionController.ts"
import { validateBody, validateQuery, validateParams } from "../middleware/validateRequest.ts"
import { getGroupBalances, getGlobalBalances } from "./balancesController.ts"
import { createSettlement } from "./settlementsController.ts"
import { 
    createTransactionSchema, 
    getTransactionsSchema, 
    updateTransactionSchema,
    deleteTransactionSchema,
    createGroupTransactionSchema,
    createSettlementSchema,
    updateGroupTransactionSchema } from "./transactionSchemas.ts"
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


//  ##### Group Transaction Routes #####

/**
 * GET /api/transactions/group/:groupId     Returns Group Transactions for the given group, optionally filtered by query parameters
 */
router.get('/group/:groupId', requireAuth, validateQuery(getTransactionsSchema), getGroup);

/**
 * POST /api/transactions/group/:groupId    Creates a new Group Transaction for the given group
 */
router.post('/group/:groupId', requireAuth, validateBody(createGroupTransactionSchema), createGroup);

/**
 * PUT /api/transactions/group/:groupId/:id    Updates a group transaction.
 */
router.put('/group/:groupId/:id', requireAuth, validateBody(updateGroupTransactionSchema), updateGroup);

/**
 * DELETE /api/transactions/group/:groupId/:id   Delete a group transaction.
 */
router.delete('/group/:groupId/:id', requireAuth, deleteGroup);

//  ##### Balance & Settlement Routes #####


/**
 * GET /api/transactions/balances    Returns the user's balance summary across all groups
 */
router.get('/balances', requireAuth, getGlobalBalances);

/**
 * GET /api/transactions/group/:groupId/balances    Returns the user's balances with each member of the given group
 */
router.get('/group/:groupId/balances', requireAuth, getGroupBalances);

/**
 * POST /api/transactions/group/:groupId/settlements    Records a settlement; only callable by the user being repaid
 */
router.post('/group/:groupId/settlements', requireAuth, validateBody(createSettlementSchema), createSettlement);

export default router
