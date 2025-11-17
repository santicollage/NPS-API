import {
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  getAuthenticatedUser,
  refreshAccessToken,
} from '../services/auth.service.js';
import { ENV } from '../config/env.js';

/**
 * Helper function to convert JWT expiresIn to milliseconds
 * @param {string} expiresIn - JWT expiresIn string (e.g., "7d", "15m")
 * @returns {number} Milliseconds
 */
const expiresInToMs = (expiresIn) => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }
};

/**
 * Login with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginWithEmail(email, password);

    // Set refresh token as HttpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresInToMs(ENV.JWT_REFRESH_EXPIRES_IN),
      path: '/',
    };

    res.cookie('refresh_token', result.refresh_token, cookieOptions);

    // Remove refresh_token from response body
    const { refresh_token, ...responseData } = result;

    res.status(200).json(responseData);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }
    next(error);
  }
};

/**
 * Login/register with Google OAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const googleAuth = async (req, res, next) => {
  try {
    const { token, id_token } = req.body;
    const idToken = token || id_token;

    if (!idToken) {
      return res.status(400).json({
        error: {
          message: 'Token is required',
          status: 400,
        },
      });
    }

    const result = await loginWithGoogle(idToken);

    // Set refresh token as HttpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresInToMs(ENV.JWT_REFRESH_EXPIRES_IN),
      path: '/',
    };

    res.cookie('refresh_token', result.refresh_token, cookieOptions);

    // Remove refresh_token from response body
    const { refresh_token, ...responseData } = result;

    res.status(200).json(responseData);
  } catch (error) {
    if (error.message === 'Invalid Google token') {
      return res.status(400).json({
        error: {
          message: 'Invalid Google OAuth token',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * User logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const logout = async (req, res, next) => {
  try {
    const { user_id } = req.user;

    await logoutUser(user_id);

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      return res.status(400).json({
        error: {
          message: 'Refresh token is required',
          status: 400,
        },
      });
    }

    const result = await refreshAccessToken(refresh_token);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid refresh token') {
      // Clear invalid refresh token cookie
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return res.status(401).json({
        error: {
          message: 'Invalid refresh token',
          status: 401,
        },
      });
    }
    next(error);
  }
};

/**
 * Get authenticated user data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getMe = async (req, res, next) => {
  try {
    const { user_id } = req.user;

    const user = await getAuthenticatedUser(user_id);

    res.status(200).json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: {
          message: 'User not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};
