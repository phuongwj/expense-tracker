import { Request, Response } from "express";
import { getGroupSplitsBetweenUsers, getGroupSettlementsBetweenUsers, insertSettlement } from "./transactionRepository.ts";
import { computeNetBalances } from "./balancesController.ts";
import { CreateSettlementInput } from "./transactionSchemas.ts";


/**
 * POST /transactions/group/:groupId/settlements
 * Creates a Settlement. Only the person being repaid can create one, and
 * only for the full amount between the two users.
 */
export const createSettlement = async (req: Request<{ groupId: string }, {}, CreateSettlementInput>, res: Response) => {
    const groupId = Number(req.params.groupId);
    const { userId, repayingUserId, amount } = req.body; // TEMPORARY: userId is receivingUserId until req.userId is sorted
    const receivingUserId = userId;

    if (repayingUserId === receivingUserId) {
        return res.status(400).json({ error: 'The same user cannot pay and be paid in the same settlement, please double check the users selected.' });
    }

    try {
        const splitRows = await getGroupSplitsBetweenUsers(groupId, repayingUserId, receivingUserId);
        const settlementRows = await getGroupSettlementsBetweenUsers(groupId, repayingUserId, receivingUserId);

        const net = computeNetBalances(splitRows, settlementRows, repayingUserId);
        const amountOwed = net.get(receivingUserId) ?? 0;

        if (amountOwed <= 0) {
            return res.status(400).json({ error: 'This member does not currently owe you anything in this group.' });
        }

        //For simplicity, settlements are assumed to be paid for the full amount owed. 
        if (Math.abs(amountOwed - amount) > 0) {
            return res.status(400).json({
                error: 'Partial settlements are not supported. Amount must match the full amount owed.',
                expectedAmount: amountOwed
            });
        }

        const settlement = await insertSettlement(groupId, repayingUserId, receivingUserId, amount);
        return res.status(201).json(settlement);
    } catch (err) {
        console.error('Create settlement error:', err);
        return res.status(500).json({ error: 'Something went wrong recording the settlement.' });
    }
};