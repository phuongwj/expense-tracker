import { Request, Response } from "express";
import { randomBytes } from "crypto";
import {
    createGroup as createGroupInDb,
    addMember,
    findGroupByJoinCode,
    findMembership,
    findGroupsByUserId,
    findGroupById,
    findGroupMembers,
    updateJoinCode,
    removeMember as removeMemberFromDb,
    deleteGroup as deleteGroupFromDb,
    countMembers,
} from "./groupRepository.ts";
import { CreateGroupInput, JoinGroupInput } from "./groupSchemas.ts";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../errors/AppError.ts";

const generateJoinCode = (): string =>
    randomBytes(4).toString('hex').toUpperCase();

export const createGroup = asyncHandler (async (req: Request<{}, {}, CreateGroupInput>, res: Response) => {
    const { name } = req.body;

    try {
        const joinCode = generateJoinCode();

        const group = await createGroupInDb(name, joinCode, req.userId!);
        await addMember(group.id, req.userId!, 'leader');

        return res.status(201).json({ group });
    } catch (err: any) {
        if (err.code === '23505' && err.constraint?.includes('join_code')) {
            try {
                const retryCode = generateJoinCode();
                const group = await createGroupInDb(name, retryCode, req.userId!);
                await addMember(group.id, req.userId!, 'leader');
                return res.status(201).json({ group });
            } catch (retryErr) {
                console.error('Create group retry error:', retryErr);
                return res.status(500).json({ error: 'Something went wrong creating the group.' });
            }
        }

        throw new AppError("The Server was unable to create the group, please try again later or contact support at placeholder@email.com.", 500)
    }
});

export const joinGroup = asyncHandler (async (req: Request<{}, {}, JoinGroupInput>, res: Response) => {
    const { joinCode } = req.body;

    const group = await findGroupByJoinCode(joinCode);

    if (!group) {
        throw new NotFoundError("No group was found for that join code, please double check the code or contact the group leader");
    }

    const existing = await findMembership(group.id, req.userId!);

    if (existing) {
        throw new ConflictError("You're already a member of this group and cannot join it again.")
    }

    await addMember(group.id, req.userId!, 'member');

    return res.status(200).json({
        group: { id: group.id, name: group.name, role: 'member' },
    });
});

export const listGroups = asyncHandler (async (req: Request, res: Response) => {
    const groups = await findGroupsByUserId(req.userId!);
    return res.status(200).json({ groups });
});

export const getGroup = asyncHandler (async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    const group = await findGroupById(id);
    const membership = await findMembership(id, req.userId!);

    //returning 404 for non-members to avoid exposing information about existing group IDs 
    if (!group || !membership) {
        throw new NotFoundError("We couldn't find that group, please contact the group leader if you believe this is a mistake.");
    }

    const members = await findGroupMembers(id);

    const response: any = {
        group: {
            id: group.id,
            name: group.name,
            createdBy: group.createdBy,
            createdAt: group.createdAt,
        },
        members,
    };

    if (membership.role === 'leader') {
        response.group.joinCode = group.joinCode;
    }

    return res.status(200).json(response);
});

export const regenerateCode = asyncHandler (async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    const group = await findGroupById(id);
    const membership = await findMembership(id, req.userId!);

    //returning 404 for non-members to avoid exposing information about existing group IDs 
    if (!group || !membership) {
        throw new NotFoundError("We couldn't find that group, please contact the group leader if you believe this is a mistake.");
    }

    if (membership.role && membership.role !== 'leader') {
        throw new ForbiddenError("Only the group leader can perform this action.")
    }

    const newCode = generateJoinCode();
    await updateJoinCode(id, newCode);

    return res.status(200).json({ joinCode: newCode });
});

export const removeMember = asyncHandler (async (req: Request, res: Response) => {
    const { id: groupId, userId: targetUserId } = (req as any).validatedParams;

    const requesterMembership = await findMembership(groupId, req.userId!);

    //returning 404 to non-members to avoid exposing IDs of existing groups
    if (!requesterMembership) {
        throw new NotFoundError("We couldn't find this group, please contact the group leader if you believe this is a mistake");
    }

    const isSelfRemoval = req.userId === targetUserId;

    if (!isSelfRemoval && requesterMembership.role !== 'leader') {
        throw new ForbiddenError("Only the group leader can remove other members.");
    }

    const targetMembership = await findMembership(groupId, targetUserId);

    if (!targetMembership) {
        throw new NotFoundError("Member not found in group, please refresh the page to ensure member list is up to date.");
    }

    if (targetMembership.role === 'leader') {
        const memberCount = await countMembers(groupId);
        if (memberCount > 1) {
            throw new ConflictError("You must transfer leadership to another member before leaving the group.")
        }
    }

    await removeMemberFromDb(groupId, targetUserId);

    return res.status(200).json({ message: 'Member removed.' });
});

export const deleteGroup = asyncHandler (async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    const membership = await findMembership(id, req.userId!);

    //returning 404 for non-members to avoid exposing information about existing group IDs 
    if (!membership) {
        throw new NotFoundError("We couldn't find that group, please contact the group leader if you believe this is a mistake.");
    }

    if (membership.role && membership.role !== 'leader') {
        throw new ForbiddenError("Only the group leader can delete a group.")
    }

    await deleteGroupFromDb(id);

    return res.status(200).json({ message: 'Group deleted.' });
});
