import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  abandonUserCart,
} from '../controllers/cart.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /cart - Get active cart
router.get('/', authenticateToken, getCart);

// POST /cart/items - Add product to cart
router.post('/items', authenticateToken, addToCart);

// PATCH /cart/items/:cart_item_id - Update cart item quantity
router.patch('/items/:cart_item_id', authenticateToken, updateCartItemQuantity);

// DELETE /cart/items/:cart_item_id - Remove item from cart
router.delete('/items/:cart_item_id', authenticateToken, removeFromCart);

// POST /cart/abandon - Abandon cart
router.post('/abandon', authenticateToken, abandonUserCart);

export default router;
