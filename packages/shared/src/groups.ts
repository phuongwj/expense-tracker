import { z } from "zod";

export const createGroupSchema = z.object({
    name: z.string().trim().min(1, "Group name is required.").max(100, "Group name must be at most 100 characters."),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinGroupSchema = z.object({
    joinCode: z.string().min(1, "Join code is required."),
});
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
