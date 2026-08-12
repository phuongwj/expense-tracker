import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.ts";
import { ConflictError, NotFoundError } from "../errors/AppError.ts";
import {
    createCategory,
    getUserCategories,
    updateCategory,
    deleteCategory,
} from "./categoryRepository.ts";

import {
    CategoryInput
} from "./categorySchemas.ts";

// Postgres error codes surfaced by the categories table's constraints.
const UNIQUE_VIOLATION = "23505";      // UNIQUE (user_id, name)
const FOREIGN_KEY_VIOLATION = "23503"; // transactions.category_id -> categories.id

const isPgError = (error: unknown, code: string) =>
    typeof error === "object" && error !== null && (error as { code?: string }).code === code;

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

    try {
        const category = await createCategory(name, userId);

        return res.status(201).json(category);
    } catch (error) {
        if (isPgError(error, UNIQUE_VIOLATION)) {
            throw new ConflictError("You already have a category with this name. Please choose a different name.");
        }

        throw error;
    }
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

    let category;

    try {
        category = await updateCategory(
            id,
            name,
            userId
        );
    } catch (error) {
        if (isPgError(error, UNIQUE_VIOLATION)) {
            throw new ConflictError("You already have a category with this name. Please choose a different name.");
        }

        throw error;
    }

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
    
    let deleted;

    try {
        deleted = await deleteCategory(
            id,
            userId
        );
    } catch (error) {
        // transactions.category_id has no ON DELETE rule, so deleting a
        // category that is still in use raises a raw FK violation.
        if (isPgError(error, FOREIGN_KEY_VIOLATION)) {
            throw new ConflictError("This category is still used by one or more transactions. Move those transactions to another category before deleting it.");
        }

        throw error;
    }

    if (!deleted) {
        throw new NotFoundError("This category could not be found. It may have already been deleted, or it may not belong to your account.");
    }

    return res.status(204).send()
});