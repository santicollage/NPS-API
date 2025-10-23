import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { ENV } from '../config/env.js';

const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

/**
 * Login with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Object with token and user data
 */
export const loginWithEmail = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      user_id: true,
      name: true,
      email: true,
      password_hash: true,
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
    throw new Error('Invalid credentials');
  }

  // Verify password
  if (!user.password_hash) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const payload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Save refresh token in database
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { refresh_token: refreshToken },
  });

  // Remove password_hash from user object
  const { password_hash, ...userWithoutPassword } = user;

  return {
    token: accessToken,
    refresh_token: refreshToken,
    user: userWithoutPassword,
  };
};

/**
 * Login/register with Google OAuth
 * @param {string} idToken - Google OAuth ID token
 * @returns {Promise<Object>} Object with token and user data
 */
export const loginWithGoogle = async (idToken) => {
  try {
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let { sub: googleId, email, name: userName, picture } = payload;

    if (!userName) {
      const givenName = payload.given_name || '';
      const familyName = payload.family_name || '';
      userName = `${givenName} ${familyName}`.trim();
      if (!userName) {
        userName = email.split('@')[0]; // Fallback to email prefix
      }
    }

    const name = userName;

    // Find existing user by google_id or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ google_id: googleId }, { email }],
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

    if (!user) {
      // Create new user if doesn't exist
      user = await prisma.user.create({
        data: {
          name,
          email,
          google_id: googleId,
          image_url: picture,
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
    } else {
      // Update google_id if user exists but doesn't have google_id
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { user_id: user.user_id },
          data: { google_id: googleId },
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
      }
    }

    // Generate tokens
    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token in database
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { refresh_token: refreshToken },
    });

    return {
      token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  } catch (error) {
    throw new Error('Invalid Google token');
  }
};

/**
 * User logout
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export const logoutUser = async (userId) => {
  // Remove refresh token from database
  await prisma.user.update({
    where: { user_id: userId },
    data: { refresh_token: null },
  });
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and verify refresh token matches
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        email: true,
        role: true,
        refresh_token: true,
      },
    });

    if (!user || user.refresh_token !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(payload);

    return {
      token: newAccessToken,
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Get authenticated user data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User data
 */
export const getAuthenticatedUser = async (userId) => {
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
