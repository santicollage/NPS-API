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
import rateLimit from 'express-rate-limit'; // Import rateLimit
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateOptionalGuestId } from '../middlewares/guest.middleware.js';

const router = express.Router();

// POST /auth/login - Login with email and password
router.post('/login', validateOptionalGuestId, login);

// POST /auth/google - Login/registration with Google OAuth
router.post('/google', validateOptionalGuestId, googleAuth);

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
router.post('/forgot-password', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
      error: {
        message: 'Too many password reset requests, please try again after 15 minutes',
        status: 429
      }
    }
}), forgotPassword); // TODO: Add Rate limiting middleware here if not using inline

// POST /auth/reset-password - Reset password
router.post('/reset-password', resetPassword);

export default router;
