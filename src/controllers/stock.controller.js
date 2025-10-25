import {
  getStockMovements,
  createStockMovement,
  getActiveReservations,
  cleanupExpiredReservations,
} from '../services/stock.service.js';

/**
 * Get stock movements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getMovements = async (req, res, next) => {
  try {
    const { product_id, type, page, limit } = req.query;

    const filters = {
      ...(product_id && { product_id }),
      ...(type && { type }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    const result = await getStockMovements(filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create stock movement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createMovement = async (req, res, next) => {
  try {
    const movementData = req.body;
    const movement = await createStockMovement(movementData);
    res.status(201).json(movement);
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: {
          message: 'Product not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Insufficient stock for exit movement') {
      return res.status(400).json({
        error: {
          message: 'Insufficient stock for exit movement',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Get active reservations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getReservations = async (req, res, next) => {
  try {
    const reservations = await getActiveReservations();
    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup expired reservations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const cleanupReservations = async (req, res, next) => {
  try {
    const result = await cleanupExpiredReservations();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
