import prisma from '../config/db.js';

/**
 * Create order from active cart
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created order
 */
export const createOrderFromCart = async (userId) => {
  // Get active cart with items
  const cart = await prisma.cart.findFirst({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  // Calculate total amount
  let totalAmount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    // Check if product is still available (considering reservations)
    const product = await prisma.product.findUnique({
      where: { product_id: item.product_id },
      select: {
        product_id: true,
        name: true,
        price: true,
        stock_quantity: true,
        active: true,
        visible: true,
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

    if (!product || !product.active || !product.visible) {
      throw new Error(
        `Product ${item.product.product.name} is no longer available`
      );
    }

    // Calculate available stock
    const reservedQuantity = product.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0
    );
    const availableStock = product.stock_quantity - reservedQuantity;

    if (item.quantity > availableStock) {
      throw new Error(`Insufficient stock for product ${product.name}`);
    }

    const subtotal = item.product.price * item.quantity;
    totalAmount += subtotal;

    orderItems.push({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.product.price,
      subtotal,
    });
  }

  // Create order in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.order.create({
      data: {
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update cart status
    await tx.cart.update({
      where: { cart_id: cart.cart_id },
      data: { status: 'ordered' },
    });

    // Delete reservations (they are no longer needed)
    await tx.stockReservation.deleteMany({
      where: {
        cart_id: cart.cart_id,
      },
    });

    // Create stock movements for sale confirmation
    const movementPromises = orderItems.map((item) =>
      tx.stockMovement.create({
        data: {
          product_id: item.product_id,
          type: 'exit',
          quantity: item.quantity,
          reason: `SALE_CONFIRMED - Order ${order.order_id}`,
        },
      })
    );

    // Update product stock quantities
    const stockUpdatePromises = orderItems.map((item) =>
      tx.product.update({
        where: { product_id: item.product_id },
        data: {
          stock_quantity: {
            decrement: item.quantity,
          },
        },
      })
    );

    await Promise.all([...movementPromises, ...stockUpdatePromises]);

    return order;
  });

  return result;
};

/**
 * Get user orders
 * @param {number} userId - User ID
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Order status filter
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=20] - Items per page
 * @param {boolean} [filters.isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Object with orders array and pagination info
 */
export const getUserOrders = async (userId, filters = {}) => {
  const { status, page = 1, limit = 20, isAdmin = false } = filters;

  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(!isAdmin && { user_id: userId }), // If not admin, filter by user
  };

  const orderBy = {
    created_at: 'desc',
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get order by ID
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID (for authorization)
 * @param {boolean} [isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Order object
 */
export const getOrderById = async (orderId, userId, isAdmin = false) => {
  const order = await prisma.order.findUnique({
    where: { order_id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
      user: {
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Check authorization
  if (!isAdmin && order.user_id !== userId) {
    throw new Error('Forbidden');
  }

  return order;
};

/**
 * Update order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @param {boolean} [isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderStatus = async (orderId, status, isAdmin = false) => {
  if (!isAdmin) {
    throw new Error('Forbidden');
  }

  // Validate status
  const validStatuses = [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
  ];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const order = await prisma.order.update({
    where: { order_id: orderId },
    data: { status },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
  });

  return order;
};
