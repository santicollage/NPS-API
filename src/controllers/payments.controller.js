import {
  createPayment,
  processWebhook,
  getPaymentByOrderId,
} from '../services/payments.service.js';

/**
 * Create payment transaction
 * This endpoint does not require authentication and supports both authenticated users and guest users.
 * For guest orders, the request body must include a `guest_id` that matches the order's guest_id.
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {number} req.body.order_id - Order ID to create payment for
 * @param {string} [req.body.currency='COP'] - Payment currency (defaults to COP)
 * @param {string} [req.body.guest_id] - Guest ID (required for guest orders)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createPaymentController = async (req, res, next) => {
  try {
    const paymentData = req.body;
    const result = await createPayment(paymentData);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: {
          message: 'Order not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Invalid guest access to order') {
      return res.status(403).json({
        error: {
          message: 'Invalid guest access to order',
          status: 403,
        },
      });
    }
    if (error.message === 'Order already has a payment') {
      return res.status(400).json({
        error: {
          message: 'Order already has a payment',
          status: 400,
        },
      });
    }
    if (error.message === 'Payment amount does not match order total') {
      return res.status(400).json({
        error: {
          message: 'Payment amount does not match order total',
          status: 400,
        },
      });
    }
    if (error.message === 'Wompi configuration missing') {
      return res.status(500).json({
        error: {
          message: 'Payment service unavailable',
          status: 500,
        },
      });
    }
    if (error.message === 'Failed to create Wompi transaction') {
      return res.status(500).json({
        error: {
          message: 'Failed to create payment transaction',
          status: 500,
        },
      });
    }
    next(error);
  }
};

/**
 * Process payment webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const processWebhookController = async (req, res, next) => {
  try {
    const webhookData = req.body;
    const result = await processWebhook(webhookData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Payment not found') {
      return res.status(400).json({
        error: {
          message: 'Invalid webhook data',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Get payment status for order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user?.role || 'customer';

    const payment = await getPaymentByOrderId(
      parseInt(order_id, 10),
      userId,
      null,
      userRole === 'admin'
    );
    res.status(200).json(payment);
  } catch (error) {
    if (error.message === 'Payment not found') {
      return res.status(404).json({
        error: {
          message: 'Payment not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({
        error: {
          message: 'Forbidden',
          status: 403,
        },
      });
    }
    next(error);
  }
};
