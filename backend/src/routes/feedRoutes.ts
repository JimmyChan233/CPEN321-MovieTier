import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import FeedActivity from '../models/feed/FeedActivity';
import RankedMovie from '../models/movie/RankedMovie';
import { getTmdbClient } from '../services/tmdb/tmdbClient';
import { Friendship } from '../models/friend/Friend';
import { sseService } from '../services/sse/sseService';
import Like from '../models/feed/Like';
import Comment from '../models/feed/Comment';

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

    // Fetch like counts and user's like status for all activities
    const activityIds = activities.map(a => a._id);
    const likeCounts = await Like.aggregate([
      { $match: { activityId: { $in: activityIds } } },
      { $group: { _id: '$activityId', count: { $sum: 1 } } }
    ]);
    const likeCountMap = new Map(likeCounts.map((lc: any) => [String(lc._id), lc.count]));

    const userLikes = await Like.find({
      userId: req.userId,
      activityId: { $in: activityIds }
    });
    const userLikeSet = new Set(userLikes.map(l => String(l.activityId)));

    // Fetch comment counts for all activities
    const commentCounts = await Comment.aggregate([
      { $match: { activityId: { $in: activityIds } } },
      { $group: { _id: '$activityId', count: { $sum: 1 } } }
    ]);
    const commentCountMap = new Map(commentCounts.map((cc: any) => [String(cc._id), cc.count]));

    const shaped = activities.map((a: any) => {
      const key = `${a.userId?._id}_${a.movieId}`;
      const currentRank = movieRankMap.get(key);
      const activityIdStr = String(a._id);

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
        likeCount: likeCountMap.get(activityIdStr) || 0,
        commentCount: commentCountMap.get(activityIdStr) || 0,
        isLikedByUser: userLikeSet.has(activityIdStr),
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

// Like an activity
router.post('/:activityId/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityId } = req.params;

    // Verify activity exists
    const activity = await FeedActivity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    // Create like (unique index prevents duplicates)
    const like = new Like({
      userId: req.userId,
      activityId: activityId
    });
    await like.save();

    res.json({ success: true, message: 'Activity liked' });
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - already liked
      return res.status(400).json({ success: false, message: 'Already liked' });
    }
    res.status(500).json({ success: false, message: 'Failed to like activity' });
  }
});

// Unlike an activity
router.delete('/:activityId/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityId } = req.params;

    const result = await Like.findOneAndDelete({
      userId: req.userId,
      activityId: activityId
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Like not found' });
    }

    res.json({ success: true, message: 'Like removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unlike activity' });
  }
});

// Get comments for an activity
router.get('/:activityId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityId } = req.params;

    const comments = await Comment.find({ activityId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name profileImageUrl')
      .limit(100);

    const shaped = comments.map((c: any) => ({
      _id: c._id,
      userId: c.userId?._id,
      userName: c.userId?.name,
      userProfileImage: c.userId?.profileImageUrl,
      text: c.text,
      createdAt: c.createdAt
    }));

    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load comments' });
  }
});

// Add a comment to an activity
router.post('/:activityId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ success: false, message: 'Comment must be 500 characters or less' });
    }

    // Verify activity exists
    const activity = await FeedActivity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const comment = new Comment({
      userId: req.userId,
      activityId: activityId,
      text: text.trim()
    });
    await comment.save();

    // Populate user info for response
    await comment.populate('userId', 'name profileImageUrl');

    const shaped = {
      _id: comment._id,
      userId: (comment.userId as any)?._id,
      userName: (comment.userId as any)?.name,
      userProfileImage: (comment.userId as any)?.profileImageUrl,
      text: comment.text,
      createdAt: comment.createdAt
    };

    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
});

// Delete a comment
router.delete('/:activityId/comments/:commentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityId, commentId } = req.params;

    // Find comment and verify ownership
    const comment = await Comment.findOne({
      _id: commentId,
      activityId: activityId
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only the comment author can delete their comment
    if (String(comment.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

export default router;
