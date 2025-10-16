import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import FeedActivity from '../models/feed/FeedActivity';
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

    const shaped = activities.map((a: any) => ({
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
      rank: a.rank ?? null,
      createdAt: a.createdAt
    }));

    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get feed' });
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
