import {
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  getAuthenticatedUser,
} from '../services/auth.service.js';

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

    res.status(200).json(result);
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
    const { token } = req.body;

    const result = await loginWithGoogle(token);

    res.status(200).json(result);
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
    const { refresh_token } = req.body;

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
