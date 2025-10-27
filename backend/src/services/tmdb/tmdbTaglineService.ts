import { getTmdbClient } from './tmdbClient';
import { logger } from '../../utils/logger';

type CacheItem = { tagline: string; ts: number };
const cache = new Map<string, CacheItem>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getCacheKey(title: string, year?: string | number): string {
  const norm = title.trim().toLowerCase();
  return `${norm}::${year ?? ''}`;
}

function isFresh(item: CacheItem): boolean {
  return Date.now() - item.ts < TTL_MS;
}

/**
 * Fetch a movie tagline from TMDB.
 * First tries to search by title+year, then falls back to title only.
 * Returns the movie's official tagline or null if not found/available.
 */
export async function fetchMovieTagline(title: string, year?: string | number): Promise<string | null> {
  const cacheKey = getCacheKey(title, year);
  const hit = cache.get(cacheKey);
  if (hit && isFresh(hit)) return hit.tagline;

  try {
    const tmdb = getTmdbClient();

    // Search for the movie
    const searchQuery = year ? `${title} ${year}` : title;
    const searchResp = await tmdb.get('/search/movie', {
      params: {
        query: searchQuery,
        language: 'en-US',
        include_adult: false,
        page: 1
      }
    });

    const results = searchResp.data?.results || [];
    if (results.length === 0) {
      return null;
    }

    // Get first result's ID
    const movieId = results[0].id;
    if (!movieId) {
      return null;
    }

    // Fetch full movie details to get tagline
    const detailsResp = await tmdb.get(`/movie/${movieId}`, {
      params: {
        language: 'en-US'
      }
    });

    const tagline = detailsResp.data?.tagline;
    if (tagline && tagline.trim().length > 0) {
      cache.set(cacheKey, { tagline, ts: Date.now() });
      return tagline;
    }

    return null;
  } catch (e) {
    // Log error but don't throw - gracefully degrade
    logger.warn('Error fetching movie tagline', {
      title,
      year,
      error: (e as Error).message,
    });
    return null;
  }
}
