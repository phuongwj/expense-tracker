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

import { categorySchema } from "./categorySchemas.ts";

const router = express.Router();

// **IMPORTANT: Need to update these routes to include authMiddleware once
// issue with adding token to Request object is sorted.

/**
 * GET /api/categories
 * Returns the user's categories along with system categories.
 */
router.get("/",  getCategories);

/**
 * POST /api/categories
 * Creates a new category for the user.
 */
router.post("/", validateBody(categorySchema), create);

/**
 * PUT /api/categories/:id
 * Updates the user's category with the given ID.
 */
router.put("/:id", validateBody(categorySchema), update);

/**
 * DELETE /api/categories/:id
 * Deletes the user's category with the given ID.
 */
router.delete("/:id", validateParams(categorySchema), remove);

export default router;