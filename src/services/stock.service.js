import prisma from '../config/db.js';

/**
 * Get stock movements with optional filtering
 * @param {Object} filters - Filter options
 * @param {number} [filters.product_id] - Filter by product ID
 * @param {string} [filters.type] - Filter by movement type (entry|exit)
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=50] - Items per page
 * @returns {Promise<Object>} Object with movements array and pagination info
 */
export const getStockMovements = async (filters = {}) => {
  const { product_id, type, page = 1, limit = 50 } = filters;

  const skip = (page - 1) * limit;

  const where = {
    ...(product_id && { product_id: parseInt(product_id, 10) }),
    ...(type && { type }),
  };

  const orderBy = {
    created_at: 'desc',
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create stock movement
 * @param {Object} movementData - Movement data
 * @param {number} movementData.product_id - Product ID
 * @param {string} movementData.type - Movement type (entry|exit)
 * @param {number} movementData.quantity - Movement quantity
 * @param {string} [movementData.reason] - Movement reason
 * @returns {Promise<Object>} Created movement
 */
export const createStockMovement = async (movementData) => {
  const { product_id, type, quantity, reason } = movementData;

  // Validate product exists
  const product = await prisma.product.findUnique({
    where: { product_id: parseInt(product_id, 10) },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // For exit movements, check if there's enough stock
  if (type === 'exit') {
    const availableStock = product.stock_quantity;
    if (quantity > availableStock) {
      throw new Error('Insufficient stock for exit movement');
    }

    // Update product stock
    await prisma.product.update({
      where: { product_id: parseInt(product_id, 10) },
      data: {
        stock_quantity: {
          decrement: quantity,
        },
      },
    });
  } else if (type === 'entry') {
    // Update product stock
    await prisma.product.update({
      where: { product_id: parseInt(product_id, 10) },
      data: {
        stock_quantity: {
          increment: quantity,
        },
      },
    });
  }

  // Create movement record
  const movement = await prisma.stockMovement.create({
    data: {
      product_id: parseInt(product_id, 10),
      type,
      quantity: parseInt(quantity, 10),
      reason,
    },
  });

  return movement;
};

/**
 * Get active stock reservations
 * @returns {Promise<Array>} Array of active reservations
 */
export const getActiveReservations = async () => {
  const reservations = await prisma.stockReservation.findMany({
    where: {
      expires_at: {
        gt: new Date(),
      },
    },
    include: {
      cart: {
        include: {
          user: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      product: {
        select: {
          product_id: true,
          name: true,
          stock_quantity: true,
        },
      },
    },
    orderBy: {
      expires_at: 'asc',
    },
  });

  return reservations;
};

/**
 * Cleanup expired reservations
 * @returns {Promise<Object>} Cleanup result
 */
export const cleanupExpiredReservations = async () => {
  const expiredReservations = await prisma.stockReservation.findMany({
    where: {
      expires_at: {
        lte: new Date(),
      },
    },
  });

  if (expiredReservations.length === 0) {
    return {
      message: 'No expired reservations to clean up',
      cleaned_reservations: 0,
    };
  }

  // Group by product to create movements
  const productMovements = {};

  expiredReservations.forEach((reservation) => {
    if (!productMovements[reservation.product_id]) {
      productMovements[reservation.product_id] = 0;
    }
    productMovements[reservation.product_id] += reservation.quantity;
  });

  // Create movements for expired reservations
  const movementPromises = Object.entries(productMovements).map(
    ([productId, quantity]) =>
      prisma.stockMovement.create({
        data: {
          product_id: parseInt(productId, 10),
          type: 'entry', // Return stock to available
          quantity,
          reason: 'RESERVATION_EXPIRED',
        },
      })
  );

  // Delete expired reservations
  const deletePromise = prisma.stockReservation.deleteMany({
    where: {
      expires_at: {
        lte: new Date(),
      },
    },
  });

  await Promise.all([...movementPromises, deletePromise]);

  return {
    message: 'Cleanup completed successfully',
    cleaned_reservations: expiredReservations.length,
  };
};
