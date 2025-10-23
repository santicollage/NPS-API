import express from 'express';
import {
  getProducts,
  createNewProduct,
  getProduct,
  updateProductInfo,
  deleteProductById,
} from '../controllers/products.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /products - Get all products with optional filtering (public)
router.get('/', getProducts);

// POST /products - Create new product (admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin']),
  createNewProduct
);

// GET /products/:product_id - Get product details (public)
router.get('/:product_id', getProduct);

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
