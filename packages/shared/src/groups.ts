import { z } from "zod";

export const createGroupSchema = z.object({
    name: z.string().trim().min(1, "Group name is required.").max(100, "Group name must be at most 100 characters."),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinGroupSchema = z.object({
    joinCode: z.string().min(1, "Join code is required."),
});
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

// Shared API response shapes used by frontend and backend
export interface GroupSummary {
    id: string
    name: string
    role: string
}

export interface GroupDetailMember {
    userId: string
    firstName: string
    lastName: string
    role: string
    joinedAt: string // ISO date string when returned to clients
}

export interface GroupDetailResponse {
    group: {
        id: string
        name: string
        createdBy: string
        createdAt: string // ISO date string
        updatedAt: string // ISO date string
        joinCode?: string
    }
    members: GroupDetailMember[]
}
