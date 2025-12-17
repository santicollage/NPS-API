import prisma from '../config/db.js';

/**
 * Get general stats summary
 * @param {Object} filters - Filter options
 * @param {string} filters.from - From date
 * @param {string} filters.to - To date
 * @returns {Promise<Object>} Summary object
 */
export const getStatsSummary = async ({ from, to }) => {
  const where = {
    status: { in: ['paid', 'shipped', 'delivered'] },
  };

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) where.created_at.lte = new Date(to);
  }

  const [totalSalesResult, totalOrders, totalCustomers] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where,
    }),
    prisma.order.count({ where }),
    prisma.user.count({ where: { role: 'customer' } }),
  ]);

  const totalSales = Number(totalSalesResult._sum.total_amount || 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Conversion rate: Orders / Carts (created in range)
  const cartWhere = {};
  if (from || to) {
    cartWhere.created_at = {};
    if (from) cartWhere.created_at.gte = new Date(from);
    if (to) cartWhere.created_at.lte = new Date(to);
  }
  
  const totalCarts = await prisma.cart.count({ where: cartWhere });
  const conversionRate = totalCarts > 0 ? Number((totalOrders / totalCarts).toFixed(2)) : 0;

  // Average purchase time calculation (heuristic)
  // Since we don't have a direct link in the DB schema provided in read_file, 
  // we'll leave this for the specific purchase-time endpoint or calculating it here might be too heavy?
  // The requirements asked for it in the getPurchaseTime endpoint specifically, but summary also asks for "averagePurchaseTimeMinutes".
  // Let's implement calculatePurchaseTime here reusing the logic we will put in getPurchaseTime.
  
  const averagePurchaseTimeMinutes = await calculateAveragePurchaseTime({ from, to });

  return {
    totalSales,
    totalOrders,
    averageTicket: Number(averageTicket.toFixed(2)),
    totalCustomers,
    conversionRate,
    averagePurchaseTimeMinutes
  };
};

/**
 * Get sales by period
 * @param {Object} filters - Filter options
 * @param {string} filters.from - From date
 * @param {string} filters.to - To date
 * @param {string} filters.groupBy - Group by 'day' or 'month'
 * @returns {Promise<Array>} Sales array
 */
export const getSalesByPeriod = async ({ from, to, groupBy = 'day' }) => {
  const where = {
    status: { in: ['paid', 'shipped', 'delivered'] },
  };

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) where.created_at.lte = new Date(to);
  } else {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    
    where.created_at = {
      gte: start,
      lte: end,
    };
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      created_at: true,
      total_amount: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  const salesMap = new Map();

  orders.forEach((order) => {
    const date = new Date(order.created_at);
    let key;

    if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = date.toISOString().split('T')[0];
    }

    const currentTotal = salesMap.get(key) || 0;
    salesMap.set(key, currentTotal + Number(order.total_amount));
  });

  return Array.from(salesMap.entries()).map(([date, total]) => ({
    date,
    total,
  }));
};

/**
 * Get top selling products
 * @param {Object} filters - Filter options
 * @param {string} filters.from - From date
 * @param {string} filters.to - To date
 * @param {number} filters.limit - Limit results
 * @returns {Promise<Array>} Top products array
 */
export const getTopProducts = async ({ from, to, limit = 5 }) => {
  const where = {
    order: {
      status: { in: ['paid', 'shipped', 'delivered'] },
    },
  };

  if (from || to) {
    where.order.created_at = {};
    if (from) where.order.created_at.gte = new Date(from);
    if (to) where.order.created_at.lte = new Date(to);
  }

  const orderItems = await prisma.orderItem.groupBy({
    by: ['product_id'],
    where,
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  // Fetch product details
  const topProducts = await Promise.all(
    orderItems.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { product_id: item.product_id },
        select: { name: true },
      });

      return {
        productId: item.product_id,
        name: product ? product.name : 'Unknown Product',
        unitsSold: item._sum.quantity,
        revenue: Number(item._sum.subtotal || 0),
      };
    })
  );

  return topProducts;
};

/**
 * Get customer stats
 * @returns {Promise<Object>} Customer stats
 */
export const getCustomerStats = async () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRegistered, newThisMonth] = await Promise.all([
    prisma.user.count({ where: { role: 'customer' } }),
    prisma.user.count({
      where: {
        role: 'customer',
        created_at: {
          gte: firstDayOfMonth,
        },
      },
    }),
  ]);

  // Recurrent customers: users with >= 2 paid orders
  // This is a bit complex in Prisma efficiently without raw query, so we'll do aggregation
  const ordersByUser = await prisma.order.groupBy({
    by: ['user_id'],
    where: {
      user_id: { not: null },
      status: { in: ['paid', 'shipped', 'delivered'] },
    },
    _count: {
      order_id: true,
    },
    having: {
      order_id: {
        _count: {
          gte: 2,
        },
      },
    },
  });

  const recurrentCustomers = ordersByUser.length;

  return {
    totalRegistered,
    newThisMonth,
    recurrentCustomers,
  };
};

/**
 * Get conversion stats
 * @param {Object} filters - Filter options
 * @param {string} filters.from - From date
 * @param {string} filters.to - To date
 * @returns {Promise<Object>} Conversion stats
 */
export const getConversionStats = async ({ from, to }) => {
  const dateFilter = {};
  if (from || to) {
    dateFilter.created_at = {};
    if (from) dateFilter.created_at.gte = new Date(from);
    if (to) dateFilter.created_at.lte = new Date(to);
  }

  const [totalCarts, totalOrders] = await Promise.all([
    prisma.cart.count({ where: dateFilter }),
    prisma.order.count({
      where: {
        ...dateFilter,
        status: { in: ['paid', 'shipped', 'delivered'] },
      },
    }),
  ]);

  const conversionRate = totalCarts > 0 ? Number((totalOrders / totalCarts).toFixed(2)) : 0;

  return {
    totalCarts,
    totalOrders,
    conversionRate,
  };
};

/**
 * Calculate average purchase time
 * @param {Object} filters - Filter options
 * @param {string} filters.from - From date
 * @param {string} filters.to - To date
 * @returns {Promise<number>} Average minutes
 */
export const calculateAveragePurchaseTime = async ({ from, to }) => {
  const where = {
    status: { in: ['paid', 'shipped', 'delivered'] },
  };

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) where.created_at.lte = new Date(to);
  }

  // Get paid orders
  const orders = await prisma.order.findMany({
    where,
    select: {
      order_id: true,
      user_id: true,
      guest_id: true,
      created_at: true,
    },
  });

  if (orders.length === 0) return 0;

  let totalTimeMs = 0;
  let matchesCount = 0;

  // For each order, find the corresponding cart
  // Heuristic: Find the most recent 'ordered' cart for this user/guest created BEFORE the order
  for (const order of orders) {
    const cartWhere = {
      status: 'ordered',
      created_at: {
        lt: order.created_at,
      },
    };

    if (order.user_id) {
      cartWhere.user_id = order.user_id;
    } else if (order.guest_id) {
      cartWhere.guest_id = order.guest_id;
    } else {
      continue;
    }

    const cart = await prisma.cart.findFirst({
      where: cartWhere,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        created_at: true,
      },
    });

    if (cart) {
      const diff = new Date(order.created_at) - new Date(cart.created_at);
      // Filter out unreasonable times (e.g., > 30 days) to avoid bad data skewing results
      if (diff > 0 && diff < 30 * 24 * 60 * 60 * 1000) {
        totalTimeMs += diff;
        matchesCount++;
      }
    }
  }

  if (matchesCount === 0) return 0;

  const averageMinutes = totalTimeMs / matchesCount / 60000;
  return Number(averageMinutes.toFixed(1));
};

export const getPurchaseTimeStats = async ({ from, to }) => {
  const averageMinutes = await calculateAveragePurchaseTime({ from, to });
  return { averageMinutes };
};
