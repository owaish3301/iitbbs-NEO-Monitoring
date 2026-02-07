import axios from 'axios';
import { ValidationError } from '../errors/appError.js';
import { getCached, setCache } from '../lib/redis.js';

const NASA_BASE_URL = 'https://api.nasa.gov/neo/rest/v1';
const CACHE_TTL = 15 * 60; // 15 minutes in seconds

const getApiKey = () => {
  const key = process.env.NASA_API_KEY;
  if (!key) {
    throw new ValidationError('NASA_API_KEY is not configured');
  }
  return key;
};

const fetchFeed = async ({ start_date, end_date }) => {
  const cacheKey = `neo:feed:${start_date}:${end_date}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    console.log(`Redis cache hit → ${cacheKey}`);
    return cached;
  }

  const apiKey = getApiKey();
  try {
    const { data } = await axios.get(`${NASA_BASE_URL}/feed`, {
      params: {
        api_key: apiKey,
        start_date,
        end_date,
      },
      timeout: 30000,
    });
    await setCache(cacheKey, data, CACHE_TTL);
    console.log(`Redis cache set → ${cacheKey}`);
    return data;
  } catch (err) {
    console.error('NASA Feed API error:', err.response?.status, err.response?.data || err.message);
    throw err;
  }
};

const fetchLookup = async (id) => {
  const cacheKey = `neo:lookup:${id}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    console.log(`Redis cache hit → ${cacheKey}`);
    return cached;
  }

  const apiKey = getApiKey();
  try {
    const { data } = await axios.get(`${NASA_BASE_URL}/neo/${id}`, {
      params: {
        api_key: apiKey,
      },
      timeout: 30000,
    });
    await setCache(cacheKey, data, CACHE_TTL);
    console.log(`Redis cache set → ${cacheKey}`);
    return data;
  } catch (err) {
    console.error('NASA Lookup API error:', err.response?.status, err.response?.data || err.message);
    throw err;
  }
};

export {
  fetchFeed,
  fetchLookup,
};
