import bcrypt from 'bcrypt';
import prisma from '../config/db.js';

/**
 * Get all users
 * @returns {Promise<Object>} Object containing users array and total count
 */
export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
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
  });

  return {
    users,
    total: users.length,
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
