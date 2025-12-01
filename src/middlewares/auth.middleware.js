import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Middleware to verify JWT access token
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token =
    req.cookies?.accessToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Access token required',
        status: 401,
      },
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: 'Invalid access token',
        status: 401,
      },
    });
  }
}

/**
 * Middleware to optionally verify JWT access token
 * If token is valid, req.user is set
 * If token is missing or invalid, request proceeds as unauthenticated
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token =
    req.cookies?.accessToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, proceed as unauthenticated
    next();
  }
}

/**
 * Middleware to verify user roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export function authorizeRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          status: 401,
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          status: 403,
        },
      });
    }

    next();
  };
}

/**
 * Middleware to verify that users can only access their own resources
 * Admins can access any resource
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function authorizeOwnResource(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        status: 401,
      },
    });
  }

  const userId = parseInt(req.params.user_id, 10);
  const authenticatedUserId = req.user.user_id;
  const userRole = req.user.role;

  if (userRole === 'admin') {
    return next();
  }

  if (userRole === 'customer' && authenticatedUserId === userId) {
    return next();
  }

  return res.status(403).json({
    error: {
      message: 'Access denied: can only access own resources',
      status: 403,
    },
  });
}
