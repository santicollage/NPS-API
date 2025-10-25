import {
  getOrCreateActiveCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  abandonCart,
} from '../services/cart.service.js';

/**
 * Get active cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const cart = await getOrCreateActiveCart(userId);
    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { product_id, quantity } = req.body;

    const cartItem = await addItemToCart(
      userId,
      parseInt(product_id, 10),
      parseInt(quantity, 10)
    );
    res.status(201).json(cartItem);
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: {
          message: 'Product not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Insufficient stock') {
      return res.status(400).json({
        error: {
          message: 'Insufficient stock',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Update cart item quantity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { cart_item_id } = req.params;
    const { quantity } = req.body;

    const cartItem = await updateCartItem(
      userId,
      parseInt(cart_item_id, 10),
      parseInt(quantity, 10)
    );
    res.status(200).json(cartItem);
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
        error: {
          message: 'Cart item not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Insufficient stock') {
      return res.status(400).json({
        error: {
          message: 'Insufficient stock',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Remove item from cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { cart_item_id } = req.params;

    await removeCartItem(userId, parseInt(cart_item_id, 10));
    res.status(200).json({
      message: 'Item removed from cart',
    });
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
        error: {
          message: 'Cart item not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};

/**
 * Abandon cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const abandonUserCart = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    await abandonCart(userId);
    res.status(200).json({
      message: 'Cart marked as abandoned',
    });
  } catch (error) {
    if (error.message === 'Active cart not found') {
      return res.status(404).json({
        error: {
          message: 'Active cart not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};
