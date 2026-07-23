import { z } from 'zod';

//for both POST and PUT
export const categorySchema = z.object({
    name: z.string().min(1).max(100),
});


export type CategoryInput = z.infer<typeof categorySchema>;

export const categoryIdSchema = z.object({
    id: z.string().uuid("A valid category id is required."),
});

export type CategoryDeleteParam = z.infer<typeof categoryIdSchema>;