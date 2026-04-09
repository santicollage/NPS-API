import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

// Cache configuration
// stdTTL: Time to live in seconds (default: 5 minutes)
// checkperiod: Automatic delete check interval in seconds
// useClones: Clone variables before returning them (prevents mutation)
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: true,
});

// Cache event listeners for monitoring
cache.on('set', (key, value) => {
  logger.debug(`Cache SET: ${key}`);
});

cache.on('del', (key, value) => {
  logger.debug(`Cache DEL: ${key}`);
});

cache.on('expired', (key, value) => {
  logger.debug(`Cache EXPIRED: ${key}`);
});

cache.on('flush', () => {
  logger.info('Cache FLUSHED');
});

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
export const get = (key) => {
  return cache.get(key);
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} Success status
 */
export const set = (key, value, ttl) => {
  return cache.set(key, value, ttl);
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
export const del = (key) => {
  return cache.del(key);
};

/**
 * Delete multiple keys from cache
 * @param {string[]} keys - Array of cache keys
 * @returns {number} Number of deleted entries
 */
export const delMultiple = (keys) => {
  return cache.del(keys);
};

/**
 * Flush all cache
 */
export const flush = () => {
  cache.flushAll();
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
export const getStats = () => {
  return cache.getStats();
};

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists
 */
export const has = (key) => {
  return cache.has(key);
};

// In-flight promises to prevent cache stampede (thundering herd)
const inFlight = new Map();

/**
 * Get or set pattern - get from cache or execute function and cache result
 * Prevents cache stampede by reusing in-flight promises
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<*>} Cached or fresh value
 */
export const getOrSet = async (key, fn, ttl) => {
  // Check cache first
  const cached = get(key);

  if (cached !== undefined) {
    logger.debug(`Cache HIT: ${key}`);
    return cached;
  }

  // Check if there's already a request in flight for this key
  if (inFlight.has(key)) {
    logger.debug(`Cache IN-FLIGHT: ${key} (reusing existing promise)`);
    return inFlight.get(key);
  }

  logger.debug(`Cache MISS: ${key}`);

  // Create promise and store it to prevent stampede
  const promise = fn()
    .then((value) => {
      set(key, value, ttl);
      inFlight.delete(key);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
};

export default cache;
