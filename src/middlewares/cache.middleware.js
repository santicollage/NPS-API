import * as cache from '../config/cache.js';
import logger from '../utils/logger.js';

/**
 * Cache middleware for GET requests (PUBLIC routes only)
 * WARNING: Do NOT use on authenticated routes - cache key includes user_id
 * @param {number} ttl - Time to live in seconds
 * @param {boolean} includeUser - Include user_id in cache key (default: false)
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = 300, includeUser = false) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL, query params, and optionally user
    let key = `route:${req.originalUrl}`;

    // If includeUser is true and user is authenticated, add user_id to key
    if (includeUser && req.user?.user_id) {
      key = `route:user:${req.user.user_id}:${req.originalUrl}`;
    }

    // Try to get from cache
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      logger.debug(`Cache HIT for route: ${req.originalUrl}`);
      return res.json(cachedResponse);
    }

    logger.debug(`Cache MISS for route: ${req.originalUrl}`);

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      return originalJson(body);
    };

    next();
  };
};

export default cacheMiddleware;
