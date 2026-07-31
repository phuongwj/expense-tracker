import { Request, Response } from "express";
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
export const getCategories = async (req: Request, res: Response) => {
    // TODO: Replace with req.userId once JWT middleware is fixed.
    const userId  = req.userId!;

    try {
        const categories = await getUserCategories(userId);

        return res.status(200).json({ categories });
    } catch (err) {
        console.error("Get categories error:", err);
        return res.status(500).json({
            error: "Something went wrong retrieving categories.",
        });
    }
};

/**
 * POST /api/categories
 * Creates a new category.
 */
export const create = async (
    req: Request<{}, {}, CategoryInput>,
    res: Response
) => {

    const { name } = req.body;
    const userId = req.userId!;

    try {
        const category = await createCategory(name, userId);

        return res.status(201).json(category);
    } catch (err) {
        console.error("Create category error:", err);
        return res.status(500).json({
            error: "Something went wrong creating the category.",
        });
    }
};

/**
 * PUT /api/categories/:id
 * Updates an existing category.
 */
export const update = async (
    req: Request<{ id: string }, {}, CategoryInput>,
    res: Response
) => {
    const { id } = req.params;

    const userId = req.userId!;
    const {  name } = req.body;

    try {
        const category = await updateCategory(
            id,
            name,
            userId
        );

        if (!category) {
            return res.status(404).json({
                error: "Category not found.",
            });
        }

        return res.status(200).json(category);
    } catch (err) {
        console.error("Update category error:", err);
        return res.status(500).json({
            error: "Something went wrong updating the category.",
        });
    }
};

/**
 * DELETE /api/categories/:id
 * Deletes an existing category.
 */
export const remove = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;

    const userId  = req.userId!;

    try {
        const deleted = await deleteCategory(
            id,
            userId
        );

        if (!deleted) {
            return res.status(404).json({
                error: "Category not found.",
            });
        }

        return res.status(204).send();
    } catch (err) {
        console.error("Delete category error:", err);
        return res.status(500).json({
            error: "Something went wrong deleting the category.",
        });
    }
};