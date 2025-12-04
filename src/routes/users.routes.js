import express from 'express';
import {
  registerUser,
  getUsers,
  getUser,
  updateUserInfo,
  deleteUserAccount,
} from '../controllers/users.controller.js';
import {
  authenticateToken,
  authorizeRoles,
  authorizeOwnResource,
} from '../middlewares/auth.middleware.js';
import { validateOptionalGuestId } from '../middlewares/guest.middleware.js';

const router = express.Router();

// GET /users - Get all users (requires authentication - admin only)
router.get('/', authenticateToken, authorizeRoles(['admin']), getUsers);

// POST /users - Register a new user (público)
router.post('/', validateOptionalGuestId, registerUser);

// GET /users/:user_id - Get user details (requires authentication - admin or own user)
router.get('/:user_id', authenticateToken, authorizeOwnResource, getUser);

// PATCH /users/:user_id - Update user information (requires authentication - admin or own user)
router.patch(
  '/:user_id',
  authenticateToken,
  authorizeOwnResource,
  updateUserInfo
);

// DELETE /users/:user_id - Delete user (requires authentication - admin or own user)
router.delete(
  '/:user_id',
  authenticateToken,
  authorizeOwnResource,
  deleteUserAccount
);

export default router;
