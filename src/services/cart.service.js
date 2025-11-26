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
      await removeCartItem(userId, existingItem.cart_item_id);
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
