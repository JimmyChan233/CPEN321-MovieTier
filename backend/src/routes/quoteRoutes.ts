import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { fetchMovieQuote } from '../services/wikiquote/wikiquoteService';

const router = Router();

// GET /api/quotes?title=Inception&year=2010
router.get('/', authenticate, async (req, res) => {
  try {
    const title = String(req.query.title || '').trim();
    const year = String(req.query.year || '').trim() || undefined;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Missing title', data: null });
    }

    const quote = await fetchMovieQuote(title, year);
    if (quote) {
      return res.json({ success: true, data: quote });
    }
    return res.status(404).json({ success: false, message: 'No quote found', data: null });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quote', data: null });
  }
});

export default router;

