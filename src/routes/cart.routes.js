import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  abandonUserCart,
  createGuestCart,
  getGuestCart,
  addToGuestCart,
  updateGuestCartItemQuantity,
  removeFromGuestCart,
  abandonGuestCart,
} from '../controllers/cart.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Authenticated user routes
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

// Guest routes (no authentication required)
// POST /cart/guest - Create guest cart
router.post('/guest', createGuestCart);

// GET /cart/guest/:guest_id - Get guest cart
router.get('/guest/:guest_id', getGuestCart);

// POST /cart/guest/:guest_id/items - Add item to guest cart
router.post('/guest/:guest_id/items', addToGuestCart);

// PATCH /cart/guest/:guest_id/items/:cart_item_id - Update guest cart item quantity
router.patch(
  '/guest/:guest_id/items/:cart_item_id',
  updateGuestCartItemQuantity
);

// DELETE /cart/guest/:guest_id/items/:cart_item_id - Remove item from guest cart
router.delete('/guest/:guest_id/items/:cart_item_id', removeFromGuestCart);

// POST /cart/guest/:guest_id/abandon - Abandon guest cart
router.post('/guest/:guest_id/abandon', abandonGuestCart);

export default router;
