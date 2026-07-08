import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validation.js';
import PersonalTransactionController from '../controllers/personalTransactions.js';
import GroupTransactionController from '../controllers/groupTransactions.js';
import { createTransactionSchema, getTransactionsSchema, updateTransactionSchema, createGroupTransactionSchema } from '../models/transactionSchema.js';

const router = express.Router();

//Personal Transaction Endpoints:

/**
 * GET /api/transactions/     Returns Personal Transactions for the user, optionally filtered by query parameters
 */
router.get('/', authenticateToken, validateQuery(getTransactionsSchema), PersonalTransactionController.getPersonalTransactions);


/**
 * POST /api/transactions/    Creates a new Personal Transaction for the user
 */
router.post('/', authenticateToken, validate(createTransactionSchema), PersonalTransactionController.createPersonalTransaction);

/**
 * PUT /api/transactions/:id    Updates the user's Personal Transaction for the given ID
 */
router.put('/:id', authenticateToken, validate(updateTransactionSchema), PersonalTransactionController.updatePersonalTransaction);

/**
 * DELETE /api/transactions/:id    Deletes the user's Personal Transaction with the given ID
 */
router.delete('/:id', authenticateToken, PersonalTransactionController.deletePersonalTransaction);


// --------------------------------------------------------------------------------------------------

//Group Transaction Endpoints: <TODO> Call the Middleware that checks if user belongs to the group.
//todo -> need to consider how/where to get transaction splits. separate endpoint or part of GET? 

/**
 * GET /api/transactions/group/:groupId     Returns Group Transactions for the given group, optionally filtered by query parameters
 */
router.get('/group/:groupId', authenticateToken, /*group middleware() ,*/ validateQuery(getTransactionsSchema), GroupTransactionController.getGroupTransactions);


/*
* POST /api/transactions/group/:groupId    Creates a new Group Transaction for the given group
*/

router.post('/group/:groupId', authenticateToken, /*group middleware() ,*/validate(createGroupTransactionSchema), GroupTransactionController.createGroupTransaction);

//todo: Maybe add additional middleware for PUT/Delete, depending on how we want to handle permissions for that
router.put('/group/:groupId/:id', authenticateToken, /*group middleware(),*/ /*RBAC middleware*/ validate(updateTransactionSchema), GroupTransactionController.updateGroupTransaction);     
    
router.delete('/group/:groupId/:id', authenticateToken, /*group middleware(),*/ /*RBAC middleware*/ GroupTransactionController.deleteGroupTransaction);


export default router;