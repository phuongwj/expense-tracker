import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import {
    getGroupSplitsForUser,
    getGroupSettlementsForUser,
    getAllSplitsForUser,
    getAllSettlementsForUser,
} from "./transactionRepository.ts";

import { BalanceRow } from "./transactionModel.ts";

/**
 * Helper function called by other functions in this controller to create a map of users who owe or are owed by a given user
 * The way it works is that it gets the sum off all amounts owed (either paid or not), and then gets all the amounts paid, 
 * it subtracts the amounts paid from the total amounts owed, so that what's left is still to be paid.
 * 
 * @param splitRows An array of objects containing two user IDs and the amount owed from one user to the other
 * @param settlementRows An array of objects containing two user IDs and the amount settled from one user and the other
 * @param userId The user to calculate net balances for 
 * @returns a map of otherUserId -> net amount owed to or owed by userId. 
 * If amount is positive, userId owes otherUserId. If amount is negative, otherUserId owes userId
 */
export const computeNetBalances = (splitRows: BalanceRow[], settlementRows: BalanceRow[], userId: string): Map<string, number> => {
    const balances = new Map<string, number>();

    //the first loop gets all amounts owed, whether they've been paid already or not
    for (const { owes, is_owed, amount } of splitRows) {
        //if userId is the one who owes, then the other user is owed. 
        const otherUser = owes === userId ? is_owed : owes;
        //check if there's an existing balance between the two users
        const existingBalance = balances.get(otherUser) ?? 0;
        balances.set(otherUser, existingBalance + (owes === userId ? Number(amount) : -Number(amount)));
    }

    //this second loop gets all the amounts owed that were already paid, and then subtracts them from the map
    //so that all that's left are the amounts still owed
    for (const { owes, is_owed, amount } of settlementRows) {
        const otherUser = owes === userId ? is_owed : owes;
        const existingBalance = balances.get(otherUser) ?? 0;
        balances.set(otherUser, existingBalance - (owes === userId ? Number(amount) : -Number(amount)));
    }

    return balances;
};

/**
 * GET /transactions/group/:groupId/balances
 * Returns the authenticated user's net balance with each other member of the group.
 */
export const getGroupBalances = asyncHandler (async (req: Request<{ groupId: string }>, res: Response) => {
    const groupId = Number(req.params.groupId);
    const userId = req.userId!;
    const splitRows = await getGroupSplitsForUser(groupId, userId);
    const settlementRows = await getGroupSettlementsForUser(groupId, userId);

    const currentBalances = computeNetBalances(splitRows, settlementRows, userId);

    const balances = [];

    //adds a 'direction' property to balances indicating whether user owes or is owed
    for (const [otherUserId, amount] of currentBalances) {
        if (amount === 0) continue;
        balances.push({
            userId: otherUserId,
            amount: Math.abs(amount),
            direction: amount > 0 ? 'you_owe' : 'owes_you'
        });
    }

    return res.status(200).json({ groupId, balances });
});

/**
 * GET /transactions/balances
 * Returns the authenticated user's net balance with every other user
 * across all their groups, plus a summary total.
 */
export const getGlobalBalances = asyncHandler (async (req: Request, res: Response) => {
    const userId = req.userId!;

    const splitRows = await getAllSplitsForUser(userId);
    const settlementRows = await getAllSettlementsForUser(userId);

    const net = computeNetBalances(splitRows, settlementRows, userId);

    const balances = [];
    for (const [otherUserId, amount] of net) {
        if (amount === 0) continue;
        balances.push({
            userId: otherUserId,
            amount: Math.abs(amount),
            direction: amount > 0 ? 'you_owe' : 'owes_you'
        });
    }

    let totalOwedByYou = 0;
    let totalOwedToYou = 0;
    for (const balance of balances) {
        if (balance.direction === 'you_owe') {
            totalOwedByYou += balance.amount;
        } else {
            totalOwedToYou += balance.amount;
        }
    }

    return res.status(200).json({
        balances,
        summary: { totalOwedByYou, totalOwedToYou, net: totalOwedToYou - totalOwedByYou }
    });
});