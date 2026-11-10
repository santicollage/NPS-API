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
  } else {
    // Default to last month
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);

    where.created_at = {
      gte: start,
      lte: end,
    };
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
  } else {
    // Default to last month
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);

    cartWhere.created_at = {
      gte: start,
      lte: end,
    };
  }

  const totalCarts = await prisma.cart.count({ where: cartWhere });
  const conversionRate =
    totalCarts > 0 ? Number((totalOrders / totalCarts).toFixed(2)) : 0;

  // Average purchase time calculation (heuristic)
  // Since we don't have a direct link in the DB schema provided in read_file,
  // we'll leave this for the specific purchase-time endpoint or calculating it here might be too heavy?
  // The requirements asked for it in the getPurchaseTime endpoint specifically, but summary also asks for "averagePurchaseTimeMinutes".
  // Let's implement calculatePurchaseTime here reusing the logic we will put in getPurchaseTime.

  const averagePurchaseTimeMinutes = await calculateAveragePurchaseTime({
    from,
    to,
  });

  return {
    totalSales,
    totalOrders,
    averageTicket: Number(averageTicket.toFixed(2)),
    totalCustomers,
    conversionRate,
    averagePurchaseTimeMinutes,
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

  // Fetch product details in a single query (avoid N+1)
  const productIds = orderItems.map((item) => item.product_id);
  const products = await prisma.product.findMany({
    where: {
      product_id: { in: productIds },
    },
    select: {
      product_id: true,
      name: true,
    },
  });

  // Create a map for quick lookup
  const productMap = new Map(products.map((p) => [p.product_id, p.name]));

  // Build response with product names
  const topProducts = orderItems.map((item) => ({
    productId: item.product_id,
    name: productMap.get(item.product_id) || 'Unknown Product',
    unitsSold: item._sum.quantity,
    revenue: Number(item._sum.subtotal || 0),
  }));

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

  const conversionRate =
    totalCarts > 0 ? Number((totalOrders / totalCarts).toFixed(2)) : 0;

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
  // Build WHERE clause for date filtering
  const dateConditions = [];
  const params = [];
  let paramIndex = 1;

  if (from) {
    dateConditions.push(`o.created_at >= $${paramIndex}`);
    params.push(new Date(from));
    paramIndex++;
  }
  if (to) {
    dateConditions.push(`o.created_at <= $${paramIndex}`);
    params.push(new Date(to));
    paramIndex++;
  }

  const dateFilter =
    dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

  // Raw SQL query with JOIN to avoid N+1
  // Uses DISTINCT ON to get the most recent cart per order
  const query = `
    WITH order_cart_pairs AS (
      SELECT DISTINCT ON (o.order_id)
        o.order_id,
        o.created_at AS order_created_at,
        c.created_at AS cart_created_at,
        EXTRACT(EPOCH FROM (o.created_at - c.created_at)) AS diff_seconds
      FROM orders o
      LEFT JOIN carts c ON (
        c.status = 'ordered'
        AND c.created_at < o.created_at
        AND (
          (o.user_id IS NOT NULL AND c.user_id = o.user_id)
          OR (o.guest_id IS NOT NULL AND c.guest_id = o.guest_id)
        )
      )
      WHERE o.status IN ('paid', 'shipped', 'delivered')
        ${dateFilter}
      ORDER BY o.order_id, c.created_at DESC
    )
    SELECT 
      COUNT(*) FILTER (WHERE diff_seconds IS NOT NULL AND diff_seconds > 0 AND diff_seconds < 2592000) AS matches_count,
      AVG(diff_seconds) FILTER (WHERE diff_seconds IS NOT NULL AND diff_seconds > 0 AND diff_seconds < 2592000) AS avg_seconds
    FROM order_cart_pairs;
  `;

  const result = await prisma.$queryRawUnsafe(query, ...params);

  if (
    !result ||
    result.length === 0 ||
    !result[0].matches_count ||
    result[0].matches_count === '0'
  ) {
    return 0;
  }

  const avgSeconds = parseFloat(result[0].avg_seconds);
  const averageMinutes = avgSeconds / 60;

  return Number(averageMinutes.toFixed(1));
};

export const getPurchaseTimeStats = async ({ from, to }) => {
  const averageMinutes = await calculateAveragePurchaseTime({ from, to });
  return { averageMinutes };
};
