import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import WatchlistItem from '../models/watch/WatchlistItem';
import { getTmdbClient } from '../services/tmdb/tmdbClient';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Get current user's watchlist
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const items = await WatchlistItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load watchlist. Please try again' });
  }
}));

// Add to watchlist
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { movieId, title, posterPath, overview } = req.body as {
      movieId: number
      title: string
      posterPath?: string
      overview?: string
    }

    if (!movieId || !title) {
      return res
        .status(400)
        .json({ success: false, message: 'movieId and title are required' })
    }

    // Step 1: Check for duplicate
    const existing = await WatchlistItem.findOne({ userId: req.userId, movieId })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Movie already in watchlist',
      })
    }

    // Step 2: Enrich from TMDB if fields are missing
    let finalPoster = posterPath
    let finalOverview = overview
    if (!finalPoster || !finalOverview) {
      try {
        const tmdb = getTmdbClient()
        const { data } = await tmdb.get(`/movie/${movieId}`, { params: { language: 'en-US' } })
        if (!finalPoster) finalPoster = data?.poster_path || undefined
        if (!finalOverview) finalOverview = data?.overview || undefined
      } catch {}
    }

    // Step 3: Add new movie
    const item = new WatchlistItem({
      userId: req.userId,
      movieId,
      title,
      posterPath: finalPoster,
      overview: finalOverview,
    })
    await item.save()

    return res.status(201).json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ success: false, message: 'Unable to add to watchlist. Please try again' })
  }
}));


// Remove from watchlist (by movieId)
router.delete('/:movieId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const movieId = Number(req.params.movieId);
    const result = await WatchlistItem.deleteOne({ userId: req.userId, movieId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found in watchlist' });
    }
    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to remove from watchlist. Please try again' });
  }
}));

export default router;
