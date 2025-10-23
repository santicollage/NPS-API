import express from 'express';
import {
  login,
  googleAuth,
  logout,
  getMe,
  refreshToken,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /auth/login - Login with email and password
router.post('/login', login);

// POST /auth/google - Login/registration with Google OAuth
router.post('/google', googleAuth);

// POST /auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /auth/logout - Logout (requires authentication)
router.post('/logout', authenticateToken, logout);

// GET /auth/me - Get authenticated user data (requires authentication)
router.get('/me', authenticateToken, getMe);

export default router;
