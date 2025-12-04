import express from 'express';
import {
  getCategories,
  createNewCategory,
  getCategory,
  updateCategoryInfo,
  deleteCategoryById,
} from '../controllers/categories.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /categories - Get all categories (public)
router.get('/', getCategories);

// POST /categories - Create new category (admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin']),
  createNewCategory
);

// GET /categories/:category_id - Get category details (public)
router.get('/:category_id', getCategory);

// PATCH /categories/:category_id - Update category (admin only)
router.patch(
  '/:category_id',
  authenticateToken,
  authorizeRoles(['admin']),
  updateCategoryInfo
);

// DELETE /categories/:category_id - Delete category (admin only)
router.delete(
  '/:category_id',
  authenticateToken,
  authorizeRoles(['admin']),
  deleteCategoryById
);

export default router;
