import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Friendship, FriendRequest } from '../models/friend/Friend';
import User from '../models/user/User';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const friendships = await Friendship.find({ userId: req.userId }).populate('friendId');
    const friends = friendships.map(f => (f as any).friendId);
    res.json({ success: true, data: friends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get friends' });
  }
});

router.get('/requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const requests = await FriendRequest.find({
      receiverId: req.userId,
      status: 'pending'
    }).populate('senderId');
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get requests' });
  }
});

router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;
    const friend = await User.findOne({ email });

    if (!friend) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const request = new FriendRequest({
      senderId: req.userId,
      receiverId: friend._id
    });
    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send request' });
  }
});

router.post('/respond', authenticate, async (req: AuthRequest, res) => {
  res.json({ success: true, message: 'Friend respond route - placeholder' });
});

router.delete('/:friendId', authenticate, async (req: AuthRequest, res) => {
  res.json({ success: true, message: 'Remove friend route - placeholder' });
});

export default router;
