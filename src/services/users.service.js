import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

/**
 * Get all users
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Search by name or email
 * @param {string} role - Filter by role (admin or customer)
 * @returns {Promise<Object>} Object containing users array and total count
 */
export const getAllUsers = async (page = 1, limit = 20, search, role) => {
  const skip = (page - 1) * limit;

  // Build where clause for filtering
  const where = {};

  // Add search filter (name or email)
  if (search && search.trim() !== '') {
    where.OR = [
      {
        name: {
          contains: search.trim(),
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: search.trim(),
          mode: 'insensitive',
        },
      },
    ];
  }

  // Add role filter
  if (role && (role === 'admin' || role === 'customer')) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        user_id: true,
        name: true,
        email: true,
        google_id: true,
        phone: true,
        city: true,
        department: true,
        address_line: true,
        postal_code: true,
        image_url: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create a new user (registration)
 * @param {Object} userData - User data from request body
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} [userData.phone] - User's phone
 * @param {string} [userData.city] - User's city
 * @param {string} [userData.department] - User's department
 * @param {string} [userData.address_line] - User's address line
 * @param {string} [userData.postal_code] - User's postal code
 * @param {string} [userData.image_url] - User's profile image URL
 * @param {string} [userData.role='customer'] - User's role
 * @returns {Promise<Object>} Created user object
 */
export const createUser = async (userData) => {
  const {
    name,
    email,
    password,
    phone,
    city,
    department,
    address_line,
    postal_code,
    image_url,
    role = 'customer',
  } = userData;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      phone,
      city,
      department,
      address_line,
      postal_code,
      image_url,
      role,
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      google_id: true,
      phone: true,
      city: true,
      department: true,
      address_line: true,
      postal_code: true,
      image_url: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return user;
};

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User object
 */
export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      email: true,
      google_id: true,
      phone: true,
      city: true,
      department: true,
      address_line: true,
      postal_code: true,
      image_url: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Update user by ID
 * @param {number} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.name] - New name
 * @param {string} [updateData.email] - New email
 * @param {string} [updateData.phone] - New phone
 * @param {string} [updateData.city] - New city
 * @param {string} [updateData.department] - New department
 * @param {string} [updateData.address_line] - New address line
 * @param {string} [updateData.postal_code] - New postal code
 * @param {string} [updateData.image_url] - New profile image URL
 * @param {string} [updateData.role] - New role
 * @returns {Promise<Object>} Updated user object
 */
export const updateUser = async (userId, updateData) => {
  const {
    name,
    email,
    phone,
    city,
    department,
    address_line,
    postal_code,
    image_url,
    role,
  } = updateData;

  // Check if email is being updated and if it already exists
  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.user_id !== userId) {
      throw new Error('Email already exists');
    }
  }

  // Update user
  const user = await prisma.user.update({
    where: { user_id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(city && { city }),
      ...(department && { department }),
      ...(address_line && { address_line }),
      ...(postal_code && { postal_code }),
      ...(image_url !== undefined && { image_url }),
      ...(role && { role }),
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      google_id: true,
      phone: true,
      city: true,
      department: true,
      address_line: true,
      postal_code: true,
      image_url: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return user;
};

/**
 * Delete user by ID
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Delete user
  await prisma.user.delete({
    where: { user_id: userId },
  });
};

/**
 * Link guest carts and orders to a registered user
 * @param {number} userId - User ID to assign resources to
 * @param {string} guestId - Guest identifier
 * @returns {Promise<{ carts: number, orders: number }>} Counts of migrated resources
 */
export const linkGuestResourcesToUser = async (userId, guestId) => {
  if (!guestId || typeof guestId !== 'string' || guestId.trim() === '') {
    return { carts: 0, orders: 0 };
  }

  // Normalize guest_id to ensure consistency
  const normalizedGuestId = guestId.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Migrate all carts from guest to user (active and ordered)
      // This ensures data consistency even for carts that were converted to orders
      const cartsUpdate = await tx.cart.updateMany({
        where: {
          guest_id: normalizedGuestId,
          user_id: null,
        },
        data: {
          user_id: userId,
          guest_id: null,
        },
      });

      // Migrate orders from guest to user (excluding cancelled orders)
      const ordersUpdate = await tx.order.updateMany({
        where: {
          guest_id: normalizedGuestId,
          user_id: null,
          NOT: {
            status: 'cancelled',
          },
        },
        data: {
          user_id: userId,
          guest_id: null,
        },
      });

      // Also migrate payments associated with guest_id (if any)
      // Payments linked to orders will be handled through the order migration
      const paymentsUpdate = await tx.payment.updateMany({
        where: {
          guest_id: normalizedGuestId,
          order_id: null, // Only update payments not linked to orders
        },
        data: {
          guest_id: null,
        },
      });

      return {
        carts: cartsUpdate.count,
        orders: ordersUpdate.count,
        payments: paymentsUpdate.count,
      };
    });

    return result;
  } catch (error) {
    // Log error but don't fail the registration/login process
    console.error('Error linking guest resources to user:', error);
    return { carts: 0, orders: 0, payments: 0 };
  }
};

/**
 * Update user role (admin only)
 * @param {number} userId - User ID
 * @param {string} newRole - New role ('admin' or 'customer')
 * @returns {Promise<Object>} Updated user object
 */
export const updateUserRole = async (userId, newRole) => {
  // Validate role
  if (newRole !== 'admin' && newRole !== 'customer') {
    throw new Error('Invalid role');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Update user role
  const updatedUser = await prisma.user.update({
    where: { user_id: userId },
    data: { role: newRole },
    select: {
      user_id: true,
      name: true,
      email: true,
      google_id: true,
      phone: true,
      city: true,
      department: true,
      address_line: true,
      postal_code: true,
      image_url: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedUser;
};
