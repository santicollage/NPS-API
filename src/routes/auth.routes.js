import express from 'express';
import {
  login,
  googleAuth,
  logout,
  getMe,
  refreshToken,
  changePassword,
  getPresignedUrl,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateOptionalGuestId } from '../middlewares/guest.middleware.js';
import { authLimiter, passwordResetLimiter } from '../config/rateLimiters.js';

const router = express.Router();

// POST /auth/login - Login with email and password
router.post('/login', authLimiter, validateOptionalGuestId, login);

// POST /auth/google - Login/registration with Google OAuth
router.post('/google', authLimiter, validateOptionalGuestId, googleAuth);

// POST /auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /auth/logout - Logout (requires authentication)
router.post('/logout', authenticateToken, logout);

// GET /auth/me - Get authenticated user data (requires authentication)
router.get('/me', authenticateToken, getMe);

// PUT /auth/change-password - Change user password (requires authentication)
router.put('/change-password', authenticateToken, changePassword);

// POST /auth/presigned-url - Get S3 presigned URL (requires authentication)
router.post('/presigned-url', authenticateToken, getPresignedUrl);

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

// POST /auth/reset-password - Reset password
router.post('/reset-password', passwordResetLimiter, resetPassword);

export default router;
