import express from "express";

import {
    getCategories,
    create,
    update,
    remove,
} from "./categoryController.ts";

import {
    validateBody,
    validateQuery,
    validateParams,
} from "../middleware/validateRequest.ts";

import { categorySchema,  categoryIdSchema } from "./categorySchemas.ts";

import { requireAuth } from "../middleware/authMiddleware.ts";

const router = express.Router();

/**
 * GET /api/categories
 * Returns the user's categories along with system categories.
 */
router.get("/", requireAuth, getCategories);

/**
 * POST /api/categories
 * Creates a new category for the user.
 */
router.post("/", requireAuth, validateBody(categorySchema), create);

/**
 * PUT /api/categories/:id
 * Updates the user's category with the given ID.
 */
router.put("/:id", requireAuth, validateParams(categoryIdSchema), validateBody(categorySchema), update);

/**
 * DELETE /api/categories/:id
 * Deletes the user's category with the given ID.
 */
router.delete("/:id", requireAuth, validateParams(categoryIdSchema), remove);

export default router;