import { Router } from 'express';
import { randomInt } from 'crypto';
import { authenticate } from '../middleware/auth';
import { fetchMovieTagline } from '../services/tmdb/tmdbTaglineService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Fallback quotes for when TMDB doesn't have a tagline
const fallbackQuotes = [
  'Every story has a beginning.',
  'The best movies are yet to come.',
  'Cinema is a mirror of reality.',
  'Great films inspire great moments.',
  'Movies bring stories to life.',
  'Where words fail, cinema speaks.',
  'A journey through moving pictures.',
  'Experience the magic of film.'
];

// GET /api/quotes?title=Inception&year=2010
// Fetches TMDB tagline for a movie.
// Returns the official movie tagline if available, or a fallback quote otherwise.
router.get('/', authenticate, asyncHandler(async (req, res) => {
  try {
    const title = String(req.query.title ?? '').trim();
    const year = String(req.query.year ?? '').trim() || undefined;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Missing title', data: null });
    }

    const tagline = await fetchMovieTagline(title, year);
    if (tagline) {
      return res.json({ success: true, data: tagline });
    }
    // Return fallback quote if no tagline found (still 200 status for frontend compatibility)
    const randomQuote = fallbackQuotes[randomInt(fallbackQuotes.length)];
    return res.json({ success: true, data: randomQuote, fallback: true });
  } catch (e: unknown) {
    // On error, return fallback quote
    const randomQuote = fallbackQuotes[randomInt(fallbackQuotes.length)];
    return res.json({ success: true, data: randomQuote, fallback: true });
  }
}));

export default router;

