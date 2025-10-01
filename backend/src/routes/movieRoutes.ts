import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import RankedMovie from '../models/movie/RankedMovie';

const router = Router();

router.get('/search', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Search movies route - placeholder', data: [] });
});

router.get('/ranked', authenticate, async (req: AuthRequest, res) => {
  try {
    const movies = await RankedMovie.find({ userId: req.userId }).sort({ rank: 1 });
    res.json({ success: true, data: movies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get ranked movies' });
  }
});

router.post('/rank', authenticate, async (req: AuthRequest, res) => {
  try {
    const { movieId, title, posterPath } = req.body;
    const count = await RankedMovie.countDocuments({ userId: req.userId });

    const rankedMovie = new RankedMovie({
      userId: req.userId,
      movieId,
      title,
      posterPath,
      rank: count + 1
    });

    await rankedMovie.save();
    res.json({ success: true, data: rankedMovie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to rank movie' });
  }
});

router.post('/compare', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Compare movies route - placeholder' });
});

export default router;
