import {
  getHealthStatus,
  manualCleanupReservations,
} from '../services/jobs.service.js';

/**
 * Get system health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getHealth = async (req, res, next) => {
  try {
    const healthStatus = await getHealthStatus();
    res.status(200).json(healthStatus);
  } catch (error) {
    next(error);
  }
};

/**
 * Manual cleanup of expired reservations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const cleanupReservationsController = async (req, res, next) => {
  try {
    const result = await manualCleanupReservations();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
