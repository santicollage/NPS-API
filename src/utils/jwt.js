import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Generate JWT access token
 * @param {Object} payload - User data
 * @returns {string} JWT token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Generate JWT refresh token
 * @param {Object} payload - User data
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
}

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}
