import express from 'express';
import {
  getProducts,
  createNewProduct,
  getProduct,
  updateProductInfo,
  deleteProductById,
  bulkDeleteProducts,
  bulkUpdateVisibility,
} from '../controllers/products.controller.js';
import {
  authenticateToken,
  authorizeRoles,
  optionalAuthenticateToken,
} from '../middlewares/auth.middleware.js';
import cacheMiddleware from '../middlewares/cache.middleware.js';

const router = express.Router();

// GET /products - Get all products with optional filtering (public, cached 3 min)
router.get('/', optionalAuthenticateToken, cacheMiddleware(180), getProducts);

// POST /products - Create new product (admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin']),
  createNewProduct
);

// DELETE /products/bulk - Bulk delete products (admin only)
router.delete(
  '/bulk',
  authenticateToken,
  authorizeRoles(['admin']),
  bulkDeleteProducts
);

// PATCH /products/bulk/visibility - Bulk update visibility (admin only)
router.patch(
  '/bulk/visibility',
  authenticateToken,
  authorizeRoles(['admin']),
  bulkUpdateVisibility
);

// GET /products/:product_id - Get product details (public, cached 3 min)
router.get('/:product_id', cacheMiddleware(180), getProduct);

// PATCH /products/:product_id - Update product (admin only)
router.patch(
  '/:product_id',
  authenticateToken,
  authorizeRoles(['admin']),
  updateProductInfo
);

// DELETE /products/:product_id - Delete product (admin only)
router.delete(
  '/:product_id',
  authenticateToken,
  authorizeRoles(['admin']),
  deleteProductById
);

export default router;
