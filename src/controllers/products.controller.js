import {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteProductsBulk,
  updateProductsVisibilityBulk,
} from '../services/products.service.js';

/**
 * Get all products with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      category_id,
      name,
      min_price,
      max_price,
      sort_by,
      sort_order,
      page,
      limit,
    } = req.query;
    const userRole = req.user?.role || 'customer'; // Default to customer if no user

    const filters = {
      ...(category_id && { category_id }),
      ...(name && { name }),
      ...(min_price && { min_price }),
      ...(max_price && { max_price }),
      ...(sort_by && { sort_by }),
      ...(sort_order && { sort_order }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
      user_role: userRole,
    };

    const result = await getAllProducts(filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createNewProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    const product = await createProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    if (error.message === 'category_ids must be an array') {
      return res.status(400).json({
        error: {
          message: 'category_ids must be an array',
          status: 400,
        },
      });
    }
    if (error.message === 'image_urls must be an array') {
      return res.status(400).json({
        error: {
          message: 'image_urls must be an array',
          status: 400,
        },
      });
    }
    if (error.message === 'One or more categories not found') {
      return res.status(400).json({
        error: {
          message: 'One or more categories not found',
          status: 400,
        },
      });
    }
    if (error.message === 'Product name already exists') {
      return res.status(409).json({
        error: {
          message: 'Product name already exists',
          status: 409,
        },
      });
    }
    next(error);
  }
};

/**
 * Get product details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const productId = parseInt(product_id, 10);

    const product = await getProductById(productId);
    res.status(200).json(product);
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: {
          message: 'Product not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};

/**
 * Update product information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateProductInfo = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const productId = parseInt(product_id, 10);
    const updateData = req.body;

    const product = await updateProduct(productId, updateData);
    res.status(200).json(product);
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: {
          message: 'Product not found',
          status: 404,
        },
      });
    }
    if (error.message === 'category_ids must be an array') {
      return res.status(400).json({
        error: {
          message: 'category_ids must be an array',
          status: 400,
        },
      });
    }
    if (error.message === 'image_urls must be an array') {
      return res.status(400).json({
        error: {
          message: 'image_urls must be an array',
          status: 400,
        },
      });
    }
    if (error.message === 'One or more categories not found') {
      return res.status(400).json({
        error: {
          message: 'One or more categories not found',
          status: 400,
        },
      });
    }
    if (error.message === 'Product name already exists') {
      return res.status(409).json({
        error: {
          message: 'Product name already exists',
          status: 409,
        },
      });
    }
    next(error);
  }
};

/**
 * Delete product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteProductById = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const productId = parseInt(product_id, 10);

    await deleteProduct(productId);
    res.status(200).json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: {
          message: 'Product not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Cannot delete product that is in carts or orders') {
      return res.status(409).json({
        error: {
          message: 'Cannot delete product that is in carts or orders',
          status: 409,
        },
      });
    }
    next(error);
  }
};

/**
 * Bulk delete products
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const bulkDeleteProducts = async (req, res, next) => {
  try {
    const { product_ids } = req.body;

    const result = await deleteProductsBulk(product_ids);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'product_ids must be a non-empty array') {
      return res.status(400).json({
        error: {
          message: 'product_ids must be a non-empty array',
          status: 400,
        },
      });
    }
    next(error);
  }
};

/**
 * Bulk update products visibility
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const bulkUpdateVisibility = async (req, res, next) => {
  try {
    const { product_ids, visible } = req.body;

    const result = await updateProductsVisibilityBulk(product_ids, visible);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'product_ids must be a non-empty array') {
      return res.status(400).json({
        error: {
          message: 'product_ids must be a non-empty array',
          status: 400,
        },
      });
    }
    if (error.message === 'visible must be a boolean') {
      return res.status(400).json({
        error: {
          message: 'visible must be a boolean',
          status: 400,
        },
      });
    }
    next(error);
  }
};
