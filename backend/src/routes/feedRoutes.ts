import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import FeedActivity from '../models/feed/FeedActivity';
import RankedMovie from '../models/movie/RankedMovie';
import { getTmdbClient } from '../services/tmdb/tmdbClient';
import { Friendship } from '../models/friend/Friend';
import { sseService } from '../services/sse/sseService';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const friendships = await Friendship.find({ userId: req.userId });
    const friendIds = friendships.map(f => f.friendId);

    const activities = await FeedActivity.find({
      userId: { $in: friendIds }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('userId', 'name email profileImageUrl');

    // Enrich missing overview/poster for first few items to avoid burst calls
    const tmdb = getTmdbClient();
    const toEnrich = activities.filter((a: any) => (!a.overview || !a.posterPath) && a.movieId).slice(0, 8);
    await Promise.all(toEnrich.map(async (a: any) => {
      try {
        const { data } = await tmdb.get(`/movie/${a.movieId}`, { params: { language: 'en-US' } });
        if (!a.overview && data?.overview) a.overview = data.overview;
        if (!a.posterPath && data?.poster_path) a.posterPath = data.poster_path;
        await a.save();
      } catch {}
    }));

    // Fetch current ranks from RankedMovie to ensure accuracy
    const movieRankMap = new Map<string, number>();
    await Promise.all(activities.map(async (a: any) => {
      try {
        const rankedMovie = await RankedMovie.findOne({
          userId: a.userId?._id,
          movieId: a.movieId
        });
        if (rankedMovie) {
          const key = `${a.userId?._id}_${a.movieId}`;
          movieRankMap.set(key, rankedMovie.rank);
        }
      } catch {}
    }));

    const shaped = activities.map((a: any) => {
      const key = `${a.userId?._id}_${a.movieId}`;
      const currentRank = movieRankMap.get(key);

      return {
        _id: a._id,
        userId: a.userId?._id,
        userName: a.userId?.name,
        userProfileImage: a.userId?.profileImageUrl,
        activityType: a.activityType,
        movie: {
          id: a.movieId,
          title: a.movieTitle,
          posterPath: a.posterPath || null,
          overview: a.overview || null,
          releaseDate: null,
          voteAverage: null
        },
        rank: currentRank ?? null,
        createdAt: a.createdAt
      };
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load feed. Please try again' });
  }
});

// SSE stream for feed events
router.get('/stream', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\n` + `data: {"ok":true}\n\n`);

    sseService.addClient(String(req.userId), res);
    req.on('close', () => sseService.removeClient(String(req.userId!), res));
  } catch {
    res.end();
  }
});

export default router;
