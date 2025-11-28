import prisma from '../config/db.js';

/**
 * Get or create active cart for user or guest
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @returns {Promise<Object>} Cart with items
 */

/**
 * Calculate shipping cost based on volumetric weight vs real weight
 * @param {Array} items - Array of items with size and quantity
 * @param {string} destinationZone - 'bogota', 'nacional', or 'remoto'
 * @returns {Object} Shipping cost details
 */
const calculateShippingCost = (items, destinationZone = 'nacional') => {
  const sizeSpecs = {
    extra_small: { width: 5, height: 5, length: 5, weight: 0.2 },
    small: { width: 10, height: 10, length: 10, weight: 1 },
    medium: { width: 15, height: 15, length: 15, weight: 2 },
    large: { width: 20, height: 20, length: 20, weight: 5 },
    extra_large: { width: 30, height: 30, length: 30, weight: 10 },
  };

  // Configurable tariffs
  const tariff = {
    base: 6000,
    perKg: 2000,
    nationalExtra: 5000,
  };

  let totalRealWeight = 0;
  let totalVolumetricWeight = 0;

  for (const item of items) {
    const { quantity, productSize } = item;
    const specs = sizeSpecs[productSize] || sizeSpecs.medium;
    const { weight, length, width, height } = specs;

    const q = quantity || 1;

    totalRealWeight += weight * q;

    const volumetricWeight = (length * width * height) / 5000;
    totalVolumetricWeight += volumetricWeight * q;
  }

  const finalWeight = Math.max(totalRealWeight, totalVolumetricWeight);

  let cost = tariff.base + finalWeight * tariff.perKg;

  const zone = destinationZone.toLowerCase();
  
  if (zone === "nacional") {
    cost += tariff.nationalExtra;
  }

  cost = Math.ceil(cost / 500) * 500;

  return {
    cost,
    finalWeight: Number(finalWeight.toFixed(2)),
    totalRealWeight: Number(totalRealWeight.toFixed(2)),
    totalVolumetricWeight: Number(totalVolumetricWeight.toFixed(2)),
  };
};

/**
 * Update cart shipping cost based on current items
 * @param {number} cartId - Cart ID
 * @returns {Promise<void>}
 */
const updateCartShippingCost = async (cartId) => {
  const cart = await prisma.cart.findUnique({
    where: { cart_id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart || !cart.items.length) {
    if (cart && cart.shipping_cost > 0) {
       await prisma.cart.update({
        where: { cart_id: cartId },
        data: { shipping_cost: 0 },
      });
    }
    return;
  }

  // Map items to format expected by calculateShippingCost
  const itemsForCalc = cart.items.map(item => ({
    quantity: item.quantity,
    productSize: item.product.size,
  }));

  // Default to 'nacional' as per requirements ("como si fuera internacional")
  // Ideally we would get this from user address if available, but for now we assume max cost or standard
  // User said "como si fuera internacional" which usually implies highest cost/complexity, 
  // but here we only have bogota/nacional. Let's stick to 'nacional' as a safe default for now.
  const { cost } = calculateShippingCost(itemsForCalc, 'nacional');

  await prisma.cart.update({
    where: { cart_id: cartId },
    data: { shipping_cost: cost },
  });
};
export const getOrCreateActiveCart = async (userId, guestId) => {
  if (!userId && !guestId) {
    throw new Error('Either userId or guestId must be provided');
  }

  const whereCondition = userId
    ? { user_id: userId, status: 'active' }
    : { guest_id: guestId, status: 'active' };

  let cart = await prisma.cart.findFirst({
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

  if (!cart) {
    const createData = {
      status: 'active',
    };

    if (userId) {
      createData.user_id = userId;
    } else {
      createData.guest_id = guestId;
    }

    cart = await prisma.cart.create({
      data: createData,
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
  }

  // Transform cart items to include images array
  if (cart.items) {
    cart.items = cart.items.map((item) => {
      const images = item.product.images?.map((img) => img.image_url) || [];
      return {
        ...item,
        product: {
          ...item.product,
          images,
        },
      };
    });
  }

  return cart;
};

/**
 * Add product to cart with stock reservation
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @param {number} productId - Product ID
 * @param {number} quantity - Quantity to add (can be negative to reduce)
 * @returns {Promise<Object>} Cart item
 */
export const addItemToCart = async (userId, guestId, productId, quantity) => {
  // Get or create active cart
  const cart = await getOrCreateActiveCart(userId, guestId);

  // Check if product exists and has sufficient stock
  const product = await prisma.product.findUnique({
    where: { product_id: productId },
    select: {
      product_id: true,
      name: true,
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
    throw new Error('Product not found');
  }

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cart_id: cart.cart_id,
      product_id: productId,
    },
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  if (existingItem) {
    // Calculate new quantity (existing + requested)
    const newQuantity = existingItem.quantity + quantity;

    // If new quantity is 0 or negative, remove the item
    if (newQuantity <= 0) {
      await removeCartItem(userId, existingItem.cart_item_id); // removeCartItem already updates shipping cost
      return null; // Item was removed
    }

    // Calculate available stock (considering reservations)
    const reservedQuantity = product.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0
    );
    const availableStock = product.stock_quantity - reservedQuantity;

    if (newQuantity > availableStock) {
      throw new Error('Insufficient stock');
    }

    // Update cart updated_at
    await prisma.cart.update({
      where: { cart_id: cart.cart_id },
      data: { updated_at: new Date() },
    });

    // Update cart item
    const updatedItem = await prisma.cartItem.update({
      where: { cart_item_id: existingItem.cart_item_id },
      data: {
        quantity: newQuantity,
      },
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
    });

    // Update shipping cost
    await updateCartShippingCost(cart.cart_id);

    // Transform to include images array
    const images = updatedItem.product.images?.map((img) => img.image_url) || [];
    return {
      ...updatedItem,
      product: {
        ...updatedItem.product,
        images,
      },
    };
  } else {
    // Only allow positive quantities for new items
    if (quantity <= 0) {
      throw new Error('Quantity must be positive for new cart items');
    }

    // Calculate available stock (considering reservations)
    const reservedQuantity = product.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0
    );
    const availableStock = product.stock_quantity - reservedQuantity;

    if (quantity > availableStock) {
      throw new Error('Insufficient stock');
    }

    // Create new cart item
    const cartItem = await prisma.cartItem.create({
      data: {
        cart_id: cart.cart_id,
        product_id: productId,
        quantity,
      },
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
    });

    // Update cart updated_at
    await prisma.cart.update({
      where: { cart_id: cart.cart_id },
      data: { updated_at: new Date() },
    });

    // Update shipping cost
    await updateCartShippingCost(cart.cart_id);

    // Transform to include images array
    const images = cartItem.product.images?.map((img) => img.image_url) || [];
    return {
      ...cartItem,
      product: {
        ...cartItem.product,
        images,
      },
    };
  }
};

/**
 * Update cart item quantity
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @param {number} cartItemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Updated cart item
 */
export const updateCartItem = async (userId, guestId, cartItemId, quantity) => {
  // Get cart item with cart and product info
  const cartItem = await prisma.cartItem.findUnique({
    where: { cart_item_id: cartItemId },
    include: {
      cart: true,
      product: {
        select: {
          product_id: true,
          stock_quantity: true,
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
      },
    },
  });

  if (!cartItem || cartItem.cart.status !== 'active') {
    throw new Error('Cart item not found');
  }

  // Check ownership (user or guest)
  const isOwner = userId
    ? cartItem.cart.user_id === userId
    : cartItem.cart.guest_id === guestId;

  if (!isOwner) {
    throw new Error('Cart item not found');
  }

  // Calculate available stock (considering reservations)
  const reservedQuantity = cartItem.product.stockReservations.reduce(
    (total, reservation) => total + reservation.quantity,
    0
  );
  const availableStock = cartItem.product.stock_quantity - reservedQuantity;

  if (quantity > availableStock) {
    throw new Error('Insufficient stock');
  }

  // Update cart item
  const updatedItem = await prisma.cartItem.update({
    where: { cart_item_id: cartItemId },
    data: {
      quantity,
    },
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
  });

  // Update cart updated_at
  await prisma.cart.update({
    where: { cart_id: cartItem.cart.cart_id },
    data: { updated_at: new Date() },
  });

  // Update shipping cost
  await updateCartShippingCost(cartItem.cart.cart_id);

  // Transform to include images array
  const images = updatedItem.product.images?.map((img) => img.image_url) || [];
  return {
    ...updatedItem,
    product: {
      ...updatedItem.product,
      images,
    },
  };
};

/**
 * Remove item from cart and release reservation
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @param {number} cartItemId - Cart item ID
 * @returns {Promise<void>}
 */
export const removeCartItem = async (userId, guestId, cartItemId) => {
  // Get cart item with cart info
  const cartItem = await prisma.cartItem.findUnique({
    where: { cart_item_id: cartItemId },
    include: {
      cart: true,
    },
  });

  if (!cartItem || cartItem.cart.status !== 'active') {
    throw new Error('Cart item not found');
  }

  // Check ownership (user or guest)
  const isOwner = userId
    ? cartItem.cart.user_id === userId
    : cartItem.cart.guest_id === guestId;

  if (!isOwner) {
    throw new Error('Cart item not found');
  }

  // Delete cart item
  await prisma.cartItem.delete({
    where: { cart_item_id: cartItemId },
  });

  // Update shipping cost
  await updateCartShippingCost(cartItem.cart.cart_id);
};

/**
 * Mark cart as abandoned
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @returns {Promise<Object>} Updated cart
 */
export const abandonCart = async (userId, guestId) => {
  const whereCondition = userId
    ? { user_id: userId, status: 'active' }
    : { guest_id: guestId, status: 'active' };

  const cart = await prisma.cart.findFirst({
    where: whereCondition,
  });

  if (!cart) {
    throw new Error('Active cart not found');
  }

  // Update cart status
  const updatedCart = await prisma.cart.update({
    where: { cart_id: cart.cart_id },
    data: { status: 'abandoned' },
  });

  return updatedCart;
};
