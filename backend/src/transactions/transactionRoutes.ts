import express from 'express'
import { createPersonal, getPersonal, updatePersonal, deletePersonal,
        createGroup, getGroup, updateGroup, deleteGroup
 } from "./transactionController.ts"
import { getGroupBalances, getGlobalBalances } from "./balancesController.ts"
import { createSettlement } from "./settlementsController.ts"
import { validateBody, validateQuery } from "../middleware/validateRequest.ts"
import { 
    createTransactionSchema, 
    getTransactionsSchema, 
    updateTransactionSchema,
    createGroupTransactionSchema,
    updateGroupTransactionSchema,
    createSettlementSchema } from "./transactionSchemas.ts"

const router = express.Router()

//**IMPORTANT: Need to update these routes to include authMiddleware once issue with adding token to Request object is sorted */

/**
 * GET /api/transactions/     Returns Personal Transactions for the user, optionally filtered by query parameters
 */
router.get('/', validateQuery(getTransactionsSchema), getPersonal)

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


//  ##### Group Transaction Routes #####

//IMPORTANT: re-add middleware for user auth once issue with extracting user from jwt is solved


/**
 * GET /api/transactions/group/:groupId     Returns Group Transactions for the given group, optionally filtered by query parameters
 */
router.get('/group/:groupId', /*auth middleware() ,*/ validateQuery(getTransactionsSchema), getGroup);


/*
* POST /api/transactions/group/:groupId    Creates a new Group Transaction for the given group
*/

router.post('/group/:groupId',  /*auth middleware() ,*/ validateBody(createGroupTransactionSchema), createGroup);

/*
* PUT /api/transactions/group/:groupId/:id    Updates a group transaction. 
*/
router.put('/group/:groupId/:id', /*auth middleware() ,*/ validateBody(updateGroupTransactionSchema), updateGroup);     
    
/*
* DELETE /api/transactions/group/:groupId/:id   Delete a group transaction.
*/
router.delete('/group/:groupId/:id', /*auth middleware() ,*/ deleteGroup);


//  ##### Balance & Settlement Routes #####

//IMPORTANT: re-add middleware for user auth once issue with extracting user from jwt is solved

/**
 * GET /api/transactions/balances    Returns the user's balance summary across all groups
 */
router.get('/balances', /*auth middleware() ,*/ getGlobalBalances);

/**
 * GET /api/transactions/group/:groupId/balances    Returns the user's balances with each member of the given group
 */
router.get('/group/:groupId/balances', /*auth middleware() ,*/ getGroupBalances);

/**
 * POST /api/transactions/group/:groupId/settlements    Records a settlement; only callable by the user being repaid
 */
router.post('/group/:groupId/settlements', /*auth middleware() ,*/ validateBody(createSettlementSchema), createSettlement);

export default router