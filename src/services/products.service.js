import prisma from '../config/db.js';

/**
 * Get all products with optional filtering
 * @param {Object} filters - Filter options
 * @param {number} [filters.category_id] - Filter by category ID
 * @param {string} [filters.name] - Filter by product name (partial match)
 * @param {number} [filters.min_price] - Minimum price filter
 * @param {number} [filters.max_price] - Maximum price filter
 * @param {string} [filters.sort_by='created_at'] - Sort field (price|stock_quantity|name|created_at)
 * @param {string} [filters.sort_order='desc'] - Sort order (asc|desc)
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=20] - Items per page
 * @param {string} [filters.user_role='customer'] - User role for visibility filtering
 * @returns {Promise<Object>} Object with products array and pagination info
 */
export const getAllProducts = async (filters = {}) => {
  const {
    category_id,
    name,
    min_price,
    max_price,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    limit = 20,
    user_role = 'customer',
  } = filters;

  const skip = (page - 1) * limit;

  const normalizedName = name
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const where = {
    active: true, // Only show active products
    // If user is customer, also filter by visible products
    ...(user_role === 'customer' && { visible: true }),
    ...(category_id && {
      productCategories: {
        some: {
          category_id: parseInt(category_id, 10),
        },
      },
    }),
    ...(name && {
      AND: normalizedName
        .split(' ')
        .filter(Boolean)
        .map((word) => ({
          OR: [
            { name: { contains: word, mode: 'insensitive' } },
            { description: { contains: word, mode: 'insensitive' } },
            { reference: { contains: word, mode: 'insensitive' } },
          ],
        })),
    }),
    ...(min_price !== undefined || max_price !== undefined
      ? {
          price: {
            ...(min_price !== undefined && { gte: parseFloat(min_price) }),
            ...(max_price !== undefined && { lte: parseFloat(max_price) }),
          },
        }
      : {}),
  };

  // Validate sort_by field
  const validSortFields = ['price', 'stock_quantity', 'name', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDirection = sort_order === 'asc' ? 'asc' : 'desc';

  const orderBy = {
    [sortField]: sortDirection,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        product_id: true,
        name: true,
        description: true,
        price: true,
        size: true,
        stock_quantity: true,
        image_url: true,
        reference: true,
        visible: true,
        active: true,
        created_at: true,
        productCategories: {
          select: {
            category: {
              select: {
                category_id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  // Transform products to include categories array
  const transformedProducts = products.map((product) => {
    const categories = product.productCategories.map((pc) => pc.category);
    const { productCategories, ...productWithoutCategories } = product;
    return {
      ...productWithoutCategories,
      categories,
    };
  });

  return {
    products: transformedProducts,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @param {number[]} productData.category_ids - Array of category IDs
 * @param {string} productData.name - Product name
 * @param {string} [productData.description] - Product description
 * @param {number} productData.price - Product price
 * @param {string} productData.size - Product size (small|medium|large)
 * @param {number} productData.stock_quantity - Stock quantity
 * @param {string} [productData.image_url] - Product image URL
 * @param {string} [productData.reference] - Product reference
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  const {
    category_ids,
    name,
    description,
    price,
    size,
    stock_quantity,
    image_url,
    reference,
  } = productData;

  // Validate category_ids is an array (if provided)
  if (category_ids !== undefined && !Array.isArray(category_ids)) {
    throw new Error('category_ids must be an array');
  }

  // Check if all categories exist (if provided)
  if (category_ids && category_ids.length > 0) {
    const categories = await prisma.category.findMany({
      where: {
        category_id: {
          in: category_ids,
        },
      },
    });

    if (categories.length !== category_ids.length) {
      throw new Error('One or more categories not found');
    }
  }

  // Check if product name already exists
  const existingProduct = await prisma.product.findFirst({
    where: { name },
  });

  if (existingProduct) {
    throw new Error('Product name already exists');
  }

  const createData = {
    name,
    description,
    price: parseFloat(price),
    size,
    stock_quantity: parseInt(stock_quantity, 10),
    image_url,
    reference,
  };

  // Only add categories if provided
  if (category_ids && category_ids.length > 0) {
    createData.productCategories = {
      create: category_ids.map((category_id) => ({
        category_id,
      })),
    };
  }

  const product = await prisma.product.create({
    data: createData,
    select: {
      product_id: true,
      name: true,
      description: true,
      price: true,
      size: true,
      stock_quantity: true,
      image_url: true,
      reference: true,
      visible: true,
      active: true,
      created_at: true,
      productCategories: {
        select: {
          category: {
            select: {
              category_id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  // Transform the response to include categories array
  const categoriesArray =
    product.productCategories?.map((pc) => pc.category) || [];
  const { productCategories, ...productWithoutCategories } = product;

  return {
    ...productWithoutCategories,
    categories: categoriesArray,
  };
};

/**
 * Get product by ID with visible stock (real - reserved)
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Product object with visible stock
 */
export const getProductById = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { product_id: productId },
    select: {
      product_id: true,
      name: true,
      description: true,
      price: true,
      size: true,
      stock_quantity: true,
      image_url: true,
      reference: true,
      visible: true,
      active: true,
      created_at: true,
      productCategories: {
        select: {
          category: {
            select: {
              category_id: true,
              name: true,
              description: true,
            },
          },
        },
      },
      stockReservations: {
        where: {
          expires_at: {
            gt: new Date(),
          },
        },
        select: {
          quantity: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // Calculate visible stock (real stock - reserved stock)
  const reservedQuantity = product.stockReservations.reduce(
    (total, reservation) => total + reservation.quantity,
    0
  );

  const visibleStock = product.stock_quantity - reservedQuantity;

  // Transform categories and remove unnecessary fields
  const categories = product.productCategories.map((pc) => pc.category);
  const { productCategories, stockReservations, ...productWithoutExtras } =
    product;

  return {
    ...productWithoutExtras,
    stock_quantity: visibleStock,
    categories,
  };
};

/**
 * Update product by ID
 * @param {number} productId - Product ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (productId, updateData) => {
  const {
    category_ids,
    name,
    description,
    price,
    size,
    stock_quantity,
    image_url,
    reference,
    visible,
  } = updateData;

  // Check if categories exist if being updated
  if (category_ids) {
    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      throw new Error('At least one category is required');
    }

    const categories = await prisma.category.findMany({
      where: {
        category_id: {
          in: category_ids,
        },
      },
    });

    if (categories.length !== category_ids.length) {
      throw new Error('One or more categories not found');
    }
  }

  // Check if name is being updated and if it already exists
  if (name) {
    const existingProduct = await prisma.product.findFirst({
      where: { name },
    });

    if (existingProduct && existingProduct.product_id !== productId) {
      throw new Error('Product name already exists');
    }
  }

  const updateDataPrisma = {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(size && { size }),
    ...(stock_quantity !== undefined && {
      stock_quantity: parseInt(stock_quantity, 10),
    }),
    ...(image_url !== undefined && { image_url }),
    ...(reference !== undefined && { reference }),
    ...(visible !== undefined && { visible }),
  };

  // Handle category updates
  if (category_ids) {
    // Delete existing categories and create new ones
    await prisma.productCategory.deleteMany({
      where: { product_id: productId },
    });

    updateDataPrisma.productCategories = {
      create: category_ids.map((category_id) => ({
        category_id,
      })),
    };
  }

  const product = await prisma.product.update({
    where: { product_id: productId },
    data: updateDataPrisma,
    select: {
      product_id: true,
      name: true,
      description: true,
      price: true,
      size: true,
      stock_quantity: true,
      image_url: true,
      reference: true,
      created_at: true,
      productCategories: {
        select: {
          category: {
            select: {
              category_id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  // Transform the response to include categories array
  const categoriesArray = product.productCategories.map((pc) => pc.category);
  const { productCategories, ...productWithoutCategories } = product;

  return {
    ...productWithoutCategories,
    categories: categoriesArray,
  };
};

/**
 * Delete product by ID (soft delete - sets active to false)
 * @param {number} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { product_id: productId },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // Check if product is in any cart or order
  // const [cartItemsCount, orderItemsCount] = await Promise.all([
  //   prisma.cartItem.count({ where: { product_id: productId } }),
  //   prisma.orderItem.count({ where: { product_id: productId } }),
  // ]);

  // if (cartItemsCount > 0 || orderItemsCount > 0) {
  //   throw new Error('Cannot delete product that is in carts or orders');
  // }

  // Soft delete - set active to false
  await prisma.product.update({
    where: { product_id: productId },
    data: { active: false },
  });
};
