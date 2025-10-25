import {
  createOrderFromCart,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
} from '../services/orders.service.js';

/**
 * Create order from cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const order = await createOrderFromCart(userId);
    res.status(201).json(order);
  } catch (error) {
    if (error.message === 'Cart is empty') {
      return res.status(400).json({
        error: {
          message: 'Cart is empty',
          status: 400,
        },
      });
    }
    if (
      error.message.includes('is no longer available') ||
      error.message.includes('Insufficient stock')
    ) {
      return res.status(400).json({
        error: {
          message: error.message,
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Get user orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user?.role || 'customer';
    const { status, page, limit } = req.query;

    const filters = {
      ...(status && { status }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
      isAdmin: userRole === 'admin',
    };

    const result = await getUserOrders(userId, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get order details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user?.role || 'customer';

    const order = await getOrderById(
      parseInt(order_id, 10),
      userId,
      userRole === 'admin'
    );
    res.status(200).json(order);
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: {
          message: 'Order not found',
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

/**
 * Update order status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateOrderStatusController = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    const userRole = req.user?.role || 'customer';

    const order = await updateOrderStatus(
      parseInt(order_id, 10),
      status,
      userRole === 'admin'
    );
    res.status(200).json(order);
  } catch (error) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({
        error: {
          message: 'Forbidden',
          status: 403,
        },
      });
    }
    if (error.message === 'Invalid status') {
      return res.status(400).json({
        error: {
          message: 'Invalid status',
          status: 400,
        },
      });
    }
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: {
          message: 'Order not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};
