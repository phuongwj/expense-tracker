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

const generateJoinCode = (): string =>
    randomBytes(4).toString('hex').toUpperCase();

export const createGroup = async (req: Request<{}, {}, CreateGroupInput>, res: Response) => {
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
        console.error('Create group error:', err);
        return res.status(500).json({ error: 'Something went wrong creating the group.' });
    }
};

export const joinGroup = async (req: Request<{}, {}, JoinGroupInput>, res: Response) => {
    const { joinCode } = req.body;

    try {
        const group = await findGroupByJoinCode(joinCode);

        if (!group) {
            return res.status(404).json({ error: 'Invalid join code.' });
        }

        const existing = await findMembership(group.id, req.userId!);

        if (existing) {
            return res.status(409).json({ error: "You're already in this group." });
        }

        await addMember(group.id, req.userId!, 'member');

        return res.status(200).json({
            group: { id: group.id, name: group.name, role: 'member' },
        });
    } catch (err) {
        console.error('Join group error:', err);
        return res.status(500).json({ error: 'Something went wrong joining the group.' });
    }
};

export const listGroups = async (req: Request, res: Response) => {
    try {
        const groups = await findGroupsByUserId(req.userId!);
        return res.status(200).json({ groups });
    } catch (err) {
        console.error('List groups error:', err);
        return res.status(500).json({ error: 'Something went wrong fetching your groups.' });
    }
};

export const getGroup = async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    try {
        const group = await findGroupById(id);

        if (!group) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        const membership = await findMembership(id, req.userId!);

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
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
    } catch (err) {
        console.error('Get group error:', err);
        return res.status(500).json({ error: 'Something went wrong fetching the group.' });
    }
};

export const regenerateCode = async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    try {
        const group = await findGroupById(id);

        if (!group) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        const membership = await findMembership(id, req.userId!);

        if (!membership || membership.role !== 'leader') {
            return res.status(403).json({ error: 'Only the group leader can perform this action.' });
        }

        const newCode = generateJoinCode();
        await updateJoinCode(id, newCode);

        return res.status(200).json({ joinCode: newCode });
    } catch (err) {
        console.error('Regenerate code error:', err);
        return res.status(500).json({ error: 'Something went wrong regenerating the code.' });
    }
};

export const removeMember = async (req: Request, res: Response) => {
    const { id: groupId, userId: targetUserId } = (req as any).validatedParams;

    try {
        const requesterMembership = await findMembership(groupId, req.userId!);

        if (!requesterMembership) {
            return res.status(403).json({ error: "You don't have permission to remove this member." });
        }

        const isSelfRemoval = req.userId === targetUserId;

        if (!isSelfRemoval && requesterMembership.role !== 'leader') {
            return res.status(403).json({ error: "You don't have permission to remove this member." });
        }

        const targetMembership = await findMembership(groupId, targetUserId);

        if (!targetMembership) {
            return res.status(404).json({ error: 'Member not found in group.' });
        }

        if (targetMembership.role === 'leader') {
            const memberCount = await countMembers(groupId);
            if (memberCount > 1) {
                return res.status(409).json({ error: 'Transfer leadership before leaving the group.' });
            }
        }

        await removeMemberFromDb(groupId, targetUserId);

        return res.status(200).json({ message: 'Member removed.' });
    } catch (err) {
        console.error('Remove member error:', err);
        return res.status(500).json({ error: 'Something went wrong removing the member.' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    const { id } = (req as any).validatedParams;

    try {
        const membership = await findMembership(id, req.userId!);

        if (!membership || membership.role !== 'leader') {
            return res.status(403).json({ error: 'Only the group leader can delete this group.' });
        }

        await deleteGroupFromDb(id);

        return res.status(200).json({ message: 'Group deleted.' });
    } catch (err) {
        console.error('Delete group error:', err);
        return res.status(500).json({ error: 'Something went wrong deleting the group.' });
    }
};
