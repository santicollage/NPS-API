import { randomUUID } from 'crypto';
import prisma from '../config/db.js';

/**
 * Create order from active cart
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @param {Object} customerData - Customer data for guest orders
 * @returns {Promise<Object>} Created order
 */
export const createOrderFromCart = async (
  userId,
  guestId,
  customerData = {}
) => {
  // Get active cart with items
  const whereCondition = userId
    ? { user_id: userId, status: 'active' }
    : { guest_id: guestId, status: 'active' };

  const cart = await prisma.cart.findFirst({
    where: whereCondition,
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                select: {
                  image_url: true,
                },
                orderBy: {
                  created_at: 'asc',
                },
              },
            },
          },
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

  // Generate order token for guest orders
  const orderToken = guestId ? randomUUID() : null;

  // Create order in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create order
    const orderData = {
      total_amount: totalAmount,
      status: 'pending',
      items: {
        create: orderItems,
      },
    };

    if (userId) {
      orderData.user_id = userId;
    } else {
      orderData.guest_id = guestId;
      orderData.order_token = orderToken;
    }

    // Add customer data
    if (customerData) {
      orderData.customer_name = customerData.customer_name ?? null;
      orderData.customer_email = customerData.customer_email ?? null;
      orderData.customer_phone = customerData.customer_phone ?? null;
      orderData.customer_document = customerData.customer_document ?? null;
      orderData.department = customerData.department ?? null;
      orderData.city = customerData.city ?? null;
      orderData.address_line = customerData.address_line ?? null;
      orderData.postal_code = customerData.postal_code ?? null;
    }

    const order = await tx.order.create({
      data: orderData,
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  select: {
                    image_url: true,
                  },
                  orderBy: {
                    created_at: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transform order items to include images array
    order.items = order.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    });

    // Update cart status
    await tx.cart.update({
      where: { cart_id: cart.cart_id },
      data: { status: 'ordered' },
    });

    // Create stock reservations for the order (will be confirmed on payment)
    const reservationPromises = orderItems.map((item) =>
      tx.stockReservation.create({
        data: {
          cart_id: cart.cart_id,
          product_id: item.product_id,
          quantity: item.quantity,
          expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      })
    );

    await Promise.all(reservationPromises);

    return {
      ...order,
      order_token: orderToken, // Include token in response for guest orders
    };
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
            product: {
              include: {
                images: {
                  select: {
                    image_url: true,
                  },
                  orderBy: {
                    created_at: 'asc',
                  },
                },
              },
            },
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

  // Transform orders to include images array in products
  const transformedOrders = orders.map((order) => ({
    ...order,
    items: order.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    }),
  }));

  return {
    orders: transformedOrders,
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
 * @param {number} userId - User ID (for authorization, optional)
 * @param {string} orderToken - Order token (for guest orders, optional)
 * @param {boolean} [isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Order object
 */
export const getOrderById = async (
  orderId,
  userId,
  orderToken,
  isAdmin = false
) => {
  const order = await prisma.order.findUnique({
    where: { order_id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                select: {
                  image_url: true,
                },
                orderBy: {
                  created_at: 'asc',
                },
              },
            },
          },
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
  if (!isAdmin) {
    const isOwner = userId
      ? order.user_id === userId
      : order.order_token === orderToken;
    if (!isOwner) {
      throw new Error('Forbidden');
    }
  }

  // Transform order items to include images array
  const transformedOrder = {
    ...order,
    items: order.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    }),
  };

  return transformedOrder;
};

/**
 * Get order by token (for guest orders)
 * @param {string} orderToken - Order token
 * @returns {Promise<Object>} Order object
 */
export const getOrderByToken = async (orderToken) => {
  const order = await prisma.order.findFirst({
    where: { order_token: orderToken },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                select: {
                  image_url: true,
                },
                orderBy: {
                  created_at: 'asc',
                },
              },
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Transform order items to include images array
  const transformedOrder = {
    ...order,
    items: order.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    }),
  };

  return transformedOrder;
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
          product: {
            include: {
              images: {
                select: {
                  image_url: true,
                },
                orderBy: {
                  created_at: 'asc',
                },
              },
            },
          },
        },
      },
      payments: true,
    },
  });

  // Transform order items to include images array
  const transformedOrder = {
    ...order,
    items: order.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    }),
  };

  return transformedOrder;
};
