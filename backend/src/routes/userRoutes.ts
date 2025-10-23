import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user/User';
import mongoose from 'mongoose';
import WatchlistItem from '../models/watch/WatchlistItem';
import { logger } from '../utils/logger';

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
    res.status(500).json({ success: false, message: 'Unable to search users. Please try again' });
  }
});

// Update current user's profile (name and profile picture)
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, profileImageUrl } = req.body as { name?: string; profileImageUrl?: string };
    logger.info(`Profile update request for user ${req.userId}`, { name: name ? 'updating' : 'unchanged', image: profileImageUrl !== undefined ? 'updating' : 'unchanged' });

    if (!name && !profileImageUrl) {
      logger.warn('Profile update failed: no fields provided');
      return res.status(400).json({ success: false, message: 'At least one field (name or profileImageUrl) is required' });
    }

    const updateFields: any = {};
    if (name) {
      if (name.trim().length < 1) {
        logger.warn('Profile update failed: empty name');
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      updateFields.name = name.trim();
    }
    if (profileImageUrl !== undefined) {
      updateFields.profileImageUrl = profileImageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('_id email name profileImageUrl');

    if (!user) {
      logger.error(`Profile update failed: user ${req.userId} not found`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.success(`Profile updated for user ${req.userId}`);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Unable to update profile. Please try again' });
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
    res.status(500).json({ success: false, message: 'Unable to load user. Please try again' });
  }
});

// Public watchlist of a user (friend view)
router.get('/:userId/watchlist', authenticate, async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const items = await WatchlistItem.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load user watchlist. Please try again' });
  }
});

export default router;
