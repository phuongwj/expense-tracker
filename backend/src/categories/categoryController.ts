import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import { NotFoundError } from "../errors/AppError.ts";
import {
    createCategory,
    getUserCategories,
    updateCategory,
    deleteCategory,
} from "./categoryRepository.ts";

import {
    CategoryInput
} from "./categorySchemas.ts";

/**
 * GET /api/categories
 * Returns all system and user-specific categories.
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const categories = await getUserCategories(String(userId));

    return res.status(200).json({ categories });
});


/**
 * POST /api/categories
 * Creates a new category.
 */
export const create = asyncHandler(async (
    req: Request<{}, {}, CategoryInput>,
    res: Response
) => {
    const { name } = req.body;
    const userId = req.userId!;

    const category = await createCategory(name, userId);

    return res.status(201).json(category);
});

/**
 * PUT /api/categories/:id
 * Updates an existing category.
 */
export const update = asyncHandler(async (
    req: Request<{ id: string }, {}, CategoryInput>,
    res: Response
) => {
    const { id } = req.params;
    const userId = req.userId!;
    const { name } = req.body;

    const category = await updateCategory(
        id,
        name,
        userId
    );

    if (!category) {
        throw new NotFoundError("This category could not be found. It may have already been deleted, or it may not belong to your account.");
    }

    return res.status(200).json(category);
});

/**
 * DELETE /api/categories/:id
 * Deletes an existing category.
 */
export const remove = asyncHandler( async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;

    const userId  = req.userId!;
    
    const deleted = await deleteCategory(
            id,
            userId
        );

    if (!deleted) {
        throw new NotFoundError("This category could not be found. It may have already been deleted, or it may not belong to your account.");
    }

    return res.status(204).send()
});