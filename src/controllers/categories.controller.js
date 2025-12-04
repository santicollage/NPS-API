import {
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../services/categories.service.js';

/**
 * Get all categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createNewCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    const category = await createCategory(categoryData);
    res.status(201).json(category);
  } catch (error) {
    if (error.message === 'Category name already exists') {
      return res.status(409).json({
        error: {
          message: 'Category name already exists',
          status: 409,
        },
      });
    }
    next(error);
  }
};

/**
 * Get category details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getCategory = async (req, res, next) => {
  try {
    const { category_id } = req.params;
    const categoryId = parseInt(category_id, 10);

    const category = await getCategoryById(categoryId);
    res.status(200).json(category);
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        error: {
          message: 'Category not found',
          status: 404,
        },
      });
    }
    next(error);
  }
};

/**
 * Update category information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateCategoryInfo = async (req, res, next) => {
  try {
    const { category_id } = req.params;
    const categoryId = parseInt(category_id, 10);
    const updateData = req.body;

    const category = await updateCategory(categoryId, updateData);
    res.status(200).json(category);
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        error: {
          message: 'Category not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Category name already exists') {
      return res.status(409).json({
        error: {
          message: 'Category name already exists',
          status: 409,
        },
      });
    }
    next(error);
  }
};

/**
 * Delete category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteCategoryById = async (req, res, next) => {
  try {
    const { category_id } = req.params;
    const categoryId = parseInt(category_id, 10);

    await deleteCategory(categoryId);
    res.status(200).json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        error: {
          message: 'Category not found',
          status: 404,
        },
      });
    }
    if (error.message === 'Cannot delete category with existing products') {
      return res.status(409).json({
        error: {
          message: 'Cannot delete category with existing products',
          status: 409,
        },
      });
    }
    next(error);
  }
};
