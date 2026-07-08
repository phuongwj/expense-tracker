import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validation.js';
import CategoryController from '../controllers/categories.js';
import { categorySchema } from '../models/categorySchema.js';

const router = express.Router();

/**
 * GET /api/categories/     Returns the user's custom and system-wide categories
 */
router.get('/', authenticateToken, CategoryController.getCategories);


/**
 * POST /api/categories/    Creates a new category for the user
 */
router.post('/', authenticateToken, validate(categorySchema), CategoryController.createCategory);

/**
 * PUT /api/categories/:id    Updates the user's category for the given ID
 */
router.put('/:id', authenticateToken, validate(categorySchema), CategoryController.updateCategory);

/**
 * DELETE /api/categories/:id    Deletes the user's category with the given ID
 */
router.delete('/:id', authenticateToken, CategoryController.deleteCategory);

export default router;