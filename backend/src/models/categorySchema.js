import { z } from 'zod';

//for both POST and PUT
export const categorySchema = z.object({
    name: z.string().min(1).max(100)
});