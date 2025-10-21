import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
} from '../services/users.service.js';

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getUsers = async (req, res, next) => {
  try {
    // TODO: Add authentication and authorization checks (admin only)
    // For now, allow access to all users

    const result = await getAllUsers();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const registerUser = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'The provided email is already in use',
        code: 409,
      });
    }
    next(error);
  }
};

/**
 * Get user details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const userId = parseInt(user_id, 10);

    // TODO: Add authentication and authorization checks
    // For now, allow access to any user

    const user = await getUserById(userId);
    res.status(200).json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
      });
    }
    next(error);
  }
};

/**
 * Update user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateUserInfo = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const userId = parseInt(user_id, 10);
    const updateData = req.body;

    // TODO: Add authentication and authorization checks
    // For now, allow update to any user

    const user = await updateUser(userId, updateData);
    res.status(200).json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
      });
    }
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'The provided email is already in use',
        code: 409,
      });
    }
    next(error);
  }
};

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteUserAccount = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const userId = parseInt(user_id, 10);

    // TODO: Add authentication and authorization checks
    // For now, allow delete to any user

    await deleteUser(userId);
    res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
      });
    }
    next(error);
  }
};
