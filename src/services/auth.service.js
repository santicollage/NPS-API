import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../config/db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { ENV } from '../config/env.js';
import { linkGuestResourcesToUser } from './users.service.js';
import { sendPasswordResetEmail } from './email.service.js';

const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

const s3Client = new S3Client({
  region: ENV.S3_REGION,
  credentials: {
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned URL for S3 upload
 * @param {string} fileName - Name of the file
 * @param {string} fileType - MIME type of the file
 * @returns {Promise<Object>} Presigned URL and file key
 */
export const generatePresignedUrl = async (fileName, fileType) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(fileType)) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  const key = `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const command = new PutObjectCommand({
    Bucket: ENV.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes

  return {
    url,
    key,
  };
};

/**
 * Login with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} [guestId] - Optional guest identifier
 * @returns {Promise<Object>} Object with token and user data
 */
export const loginWithEmail = async (email, password, guestId) => {
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

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { refresh_token: hashedRefreshToken },
  });

  // Link guest resources to user if guestId is provided
  if (guestId && typeof guestId === 'string' && guestId.trim() !== '') {
    await linkGuestResourcesToUser(user.user_id, guestId.trim());
  }

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
 * @param {string} [guestId] - Optional guest identifier
 * @returns {Promise<Object>} Object with token and user data
 */
export const loginWithGoogle = async (idToken, guestId) => {
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
      let imageUrl = picture;
      if (imageUrl && imageUrl.includes('googleusercontent.com')) {
        imageUrl = imageUrl.replace(/=s\d+(-c)?/g, '=s800$1');
      }

      user = await prisma.user.create({
        data: {
          name,
          email,
          google_id: googleId,
          image_url: imageUrl,
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

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { refresh_token: hashedRefreshToken },
    });

    // Link guest resources to user if guestId is provided
    if (guestId && typeof guestId === 'string' && guestId.trim() !== '') {
      await linkGuestResourcesToUser(user.user_id, guestId.trim());
    }

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

    if (!user || !user.refresh_token) {
      throw new Error('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!isValid) {
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

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  // Find user by ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      email: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has a password set (not a Google OAuth user)
  if (!user.password_hash) {
    throw new Error('No password set');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.password_hash
  );
  if (!isValidPassword) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password in database
  await prisma.user.update({
    where: { user_id: userId },
    data: { password_hash: newPasswordHash },
  });

  return {
    message: 'Password changed successfully',
  };
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { user_id: true, name: true, email: true },
  });

  // Always return success even if user doesn't exist (security)
  if (!user) {
    return;
  }

  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(resetToken, 10);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  // Invalidate previous tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.user_id, used: false },
    data: { used: true },
  });

  // Save new token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.user_id,
      tokenHash,
      expiresAt,
    },
  });

  // Send email
  await sendPasswordResetEmail(user.email, user.name, resetToken);
};

/**
 * Reset password
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const resetPassword = async (token, newPassword) => {
  // Find all valid tokens (not used, not expired)
  const activeTokens = await prisma.passwordResetToken.findMany({
    where: {
      used: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  let validTokenRecord = null;

  for (const record of activeTokens) {
    const isValid = await bcrypt.compare(token, record.tokenHash);
    if (isValid) {
      validTokenRecord = record;
      break;
    }
  }

  if (!validTokenRecord) {
    throw new Error('Invalid or expired token');
  }

  const user = validTokenRecord.user;

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update user password and invalidate sessions (optional but requested)
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      password_hash: newPasswordHash,
      refresh_token: null, // Invalidate sessions
    },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: validTokenRecord.id },
    data: { used: true },
  });
};
