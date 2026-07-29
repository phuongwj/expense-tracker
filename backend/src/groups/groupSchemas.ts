import { z } from "zod";

export {
    createGroupSchema,
    joinGroupSchema,
} from "@expense-tracker/shared/groups";

export type {
    CreateGroupInput,
    JoinGroupInput,
} from "@expense-tracker/shared/groups";

export const groupIdParamSchema = z.object({
    id: z.string().uuid("A valid group id is required."),
});

export const memberRemoveParamSchema = z.object({
    id: z.string().uuid("A valid group id is required."),
    userId: z.string().uuid("A valid user id is required."),
});
