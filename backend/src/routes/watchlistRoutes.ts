import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import WatchlistItem from '../models/watch/WatchlistItem';

const router = Router();

// Get current user's watchlist
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const items = await WatchlistItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get watchlist' });
  }
});

// Add to watchlist
router.post('/', authenticate, async (req: AuthRequest, res) => {
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

    // 🔍 Step 1: Check for duplicate
    const existing = await WatchlistItem.findOne({ userId: req.userId, movieId })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Movie already in watchlist',
      })
    }

    // ✅ Step 2: Add new movie if not found
    const item = new WatchlistItem({
      userId: req.userId,
      movieId,
      title,
      posterPath,
      overview,
    })
    await item.save()

    return res.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ success: false, message: 'Failed to add to watchlist' })
  }
})


// Remove from watchlist (by movieId)
router.delete('/:movieId', authenticate, async (req: AuthRequest, res) => {
  try {
    const movieId = Number(req.params.movieId);
    const result = await WatchlistItem.deleteOne({ userId: req.userId, movieId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove from watchlist' });
  }
});

export default router;

