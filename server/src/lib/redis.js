import Redis from 'ioredis';

let client = null;

/**
 * Creates (or returns) a singleton Redis client.
 * ioredis automatically buffers commands until connected,
 * so we return the client immediately.
 */
const getRedis = () => {
  if (client) return client;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 500, 10000);
      },
      lazyConnect: false,
      enableOfflineQueue: true,
    });

    client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    client.on('error', (err) => {
      console.error('Redis error:', err.message || err.code || err);
    });

    return client;
  } catch (err) {
    console.error('Redis init error:', err.message);
    return null;
  }
};

/**
 * Get a cached value from Redis.
 * Returns the parsed JSON or null on miss / error.
 */
const getCached = async (key) => {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Store a value in Redis with an optional TTL (in seconds).
 * Silently fails if Redis is unavailable.
 */
const setCache = async (key, data, ttlSeconds = 900) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // non-critical — cache write failures are acceptable
  }
};

export { getRedis, getCached, setCache };
