import prisma from '../config/db.js';

/**
 * Get all categories
 * @returns {Promise<Array>} Array of categories
 */
export const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    select: {
      category_id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return categories;
};

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @param {string} categoryData.name - Category name
 * @param {string} [categoryData.description] - Category description
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (categoryData) => {
  const { name, description } = categoryData;

  // Check if category name already exists
  const existingCategory = await prisma.category.findFirst({
    where: { name },
  });

  if (existingCategory) {
    throw new Error('Category name already exists');
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
    },
    select: {
      category_id: true,
      name: true,
      description: true,
    },
  });

  return category;
};

/**
 * Get category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
export const getCategoryById = async (categoryId) => {
  const category = await prisma.category.findUnique({
    where: { category_id: categoryId },
    select: {
      category_id: true,
      name: true,
      description: true,
    },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
};

/**
 * Update category by ID
 * @param {number} categoryId - Category ID
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.name] - New name
 * @param {string} [updateData.description] - New description
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (categoryId, updateData) => {
  const { name, description } = updateData;

  // Check if name is being updated and if it already exists
  if (name) {
    const existingCategory = await prisma.category.findFirst({
      where: { name },
    });

    if (existingCategory && existingCategory.category_id !== categoryId) {
      throw new Error('Category name already exists');
    }
  }

  const category = await prisma.category.update({
    where: { category_id: categoryId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
    select: {
      category_id: true,
      name: true,
      description: true,
    },
  });

  return category;
};

/**
 * Delete category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<void>}
 */
export const deleteCategory = async (categoryId) => {
  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { category_id: categoryId },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  // Delete all product-category relationships for this category
  await prisma.productCategory.deleteMany({
    where: { category_id: categoryId },
  });

  // Delete category
  await prisma.category.delete({
    where: { category_id: categoryId },
  });
};
