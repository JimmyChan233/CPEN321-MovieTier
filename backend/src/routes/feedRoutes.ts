import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import FeedActivity from '../models/feed/FeedActivity';
import { Friendship } from '../models/friend/Friend';

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

    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get feed' });
  }
});

export default router;
