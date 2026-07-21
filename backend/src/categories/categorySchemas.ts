import { z } from 'zod';

//for both POST and PUT
export const categorySchema = z.object({
    name: z.string().min(1).max(100),
    userId: z.string() //temporary until JWT fix
});

export type CategoryInput = z.infer<typeof categorySchema>;