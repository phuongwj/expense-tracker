import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import { getGroupSplitsBetweenUsers, getGroupSettlementsBetweenUsers, insertSettlement } from "./transactionRepository.ts";
import { computeNetBalances } from "./balancesController.ts";
import { CreateSettlementInput } from "./transactionSchemas.ts";
import { BadRequestError } from "../errors/AppError.ts";


/**
 * POST /transactions/group/:groupId/settlements
 * Creates a Settlement. Only the person being repaid can create one, and
 * only for the full amount between the two users.
 */
export const createSettlement = asyncHandler (async (req: Request<{ groupId: string }, {}, CreateSettlementInput>, res: Response) => {
    const groupId = Number(req.params.groupId);
    const {repayingUserId, amount } = req.body;
    const receivingUserId = req.userId!;

    if (repayingUserId === receivingUserId) {
        throw new BadRequestError('You cannot record a settlement with yourself. Please check that you selected the correct group member.');
    }

    const splitRows = await getGroupSplitsBetweenUsers(groupId, repayingUserId, receivingUserId);
    const settlementRows = await getGroupSettlementsBetweenUsers(groupId, repayingUserId, receivingUserId);

    const net = computeNetBalances(splitRows, settlementRows, repayingUserId);
    const amountOwed = net.get(receivingUserId) ?? 0;

    if (amountOwed <= 0) {
        throw new BadRequestError('This member does not currently owe you anything in this group, so there is nothing to settle.');
    }

    //For simplicity, settlements are assumed to be paid for the full amount owed. 
    if (Math.abs(amountOwed - amount) > 0) {
        throw new BadRequestError(`Partial settlements aren't supported yet. Please enter the full amount owed — $${amountOwed.toFixed(2)} — to settle up.`);
    }
    
    const settlement = await insertSettlement(groupId, repayingUserId, receivingUserId, amount);
    return res.status(201).json(settlement);
});