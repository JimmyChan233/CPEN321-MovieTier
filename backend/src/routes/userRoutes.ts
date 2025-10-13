import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user/User';
import mongoose from 'mongoose';

const router = Router();

// Search users by name or email (must be defined before '/:userId')
router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = (req.query.query as string) || '';
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }

    const regex = new RegExp(query.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ name: regex }, { email: regex }]
    })
      .select('_id email name profileImageUrl')
      .limit(20);

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const user = await User.findById(userId).select('_id email name profileImageUrl');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

export default router;
