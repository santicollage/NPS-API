import prisma from '../config/db.js';

/**
 * Get or create active cart for user or guest
 * @param {number} userId - User ID (optional)
 * @param {string} guestId - Guest ID (optional)
 * @returns {Promise<Object>} Cart with items
 */
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
          product: true,
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
            product: true,
          },
        },
      },
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
      await removeCartItem(userId, existingItem.cart_item_id);
      return null; // Item was removed
    }

    // Calculate available stock (real stock - reserved stock + current reservation)
    const reservedQuantity = product.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0
    );
    const availableStock =
      product.stock_quantity - reservedQuantity + existingItem.quantity;

    if (newQuantity > availableStock) {
      throw new Error('Insufficient stock');
    }

    // Update reservation
    await prisma.stockReservation.updateMany({
      where: {
        cart_id: cart.cart_id,
        product_id: productId,
        expires_at: {
          gt: new Date(),
        },
      },
      data: {
        quantity: newQuantity,
        expires_at: expiresAt,
      },
    });

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
        reserved_until: expiresAt,
      },
      include: {
        product: true,
      },
    });

    return updatedItem;
  } else {
    // Only allow positive quantities for new items
    if (quantity <= 0) {
      throw new Error('Quantity must be positive for new cart items');
    }

    // Calculate available stock (real stock - reserved stock)
    const reservedQuantity = product.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0
    );
    const availableStock = product.stock_quantity - reservedQuantity;

    if (quantity > availableStock) {
      throw new Error('Insufficient stock');
    }

    // Create new cart item and reservation
    const cartItem = await prisma.cartItem.create({
      data: {
        cart_id: cart.cart_id,
        product_id: productId,
        quantity,
        reserved_until: expiresAt,
      },
      include: {
        product: true,
      },
    });

    // Create stock reservation
    await prisma.stockReservation.create({
      data: {
        cart_id: cart.cart_id,
        product_id: productId,
        quantity,
        expires_at: expiresAt,
      },
    });

    // Update cart updated_at
    await prisma.cart.update({
      where: { cart_id: cart.cart_id },
      data: { updated_at: new Date() },
    });

    return cartItem;
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

  // Calculate available stock (excluding current reservation)
  const reservedQuantity = cartItem.product.stockReservations.reduce(
    (total, reservation) => total + reservation.quantity,
    0
  );
  const availableStock =
    cartItem.product.stock_quantity - reservedQuantity + cartItem.quantity;

  if (quantity > availableStock) {
    throw new Error('Insufficient stock');
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  // Update cart item
  const updatedItem = await prisma.cartItem.update({
    where: { cart_item_id: cartItemId },
    data: {
      quantity,
      reserved_until: expiresAt,
    },
    include: {
      product: true,
    },
  });

  // Update reservation
  await prisma.stockReservation.updateMany({
    where: {
      cart_id: cartItem.cart.cart_id,
      product_id: cartItem.product_id,
      expires_at: {
        gt: new Date(),
      },
    },
    data: {
      quantity,
      expires_at: expiresAt,
    },
  });

  // Update cart updated_at
  await prisma.cart.update({
    where: { cart_id: cartItem.cart.cart_id },
    data: { updated_at: new Date() },
  });

  return updatedItem;
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

  // Delete associated reservation
  await prisma.stockReservation.deleteMany({
    where: {
      cart_id: cartItem.cart.cart_id,
      product_id: cartItem.product_id,
    },
  });
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

  // Delete associated reservations (they will be cleaned up by the cleanup job)
  await prisma.stockReservation.deleteMany({
    where: {
      cart_id: cart.cart_id,
    },
  });

  return updatedCart;
};
