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
import cacheMiddleware from '../middlewares/cache.middleware.js';

const router = express.Router();

// GET /categories - Get all categories (public, cached 5 min)
router.get('/', cacheMiddleware(300), getCategories);

// POST /categories - Create new category (admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin']),
  createNewCategory
);

// GET /categories/:category_id - Get category details (public, cached 5 min)
router.get('/:category_id', cacheMiddleware(300), getCategory);

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
