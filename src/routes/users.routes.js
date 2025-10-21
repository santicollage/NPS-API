import express from 'express';
import {
  registerUser,
  getUsers,
  getUser,
  updateUserInfo,
  deleteUserAccount,
} from '../controllers/users.controller.js';

const router = express.Router();

// GET /users - Get all users
router.get('/', getUsers);

// POST /users - Register a new user
router.post('/', registerUser);

// GET /users/:user_id - Get user details
router.get('/:user_id', getUser);

// PATCH /users/:user_id - Update user information
router.patch('/:user_id', updateUserInfo);

// DELETE /users/:user_id - Delete user
router.delete('/:user_id', deleteUserAccount);

export default router;
