import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { fetchMovieTagline } from '../services/tmdb/tmdbTaglineService';

const router = Router();

// GET /api/quotes?title=Inception&year=2010
// Fetches TMDB tagline for a movie.
// Returns the official movie tagline if available, or null otherwise.
router.get('/', authenticate, async (req, res) => {
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
    // Return 404 if no tagline found, frontend will fall back to local quotes
    return res.status(404).json({ success: false, message: 'No tagline found', data: null });
  } catch (e: unknown) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tagline', data: null });
  }
});

export default router;

