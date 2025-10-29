import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user/User';
import mongoose from 'mongoose';
import WatchlistItem from '../models/watch/WatchlistItem';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search users by name or email (must be defined before '/:userId')
router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = (req.query.query as string) ?? '';
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }

    // Escape special regex characters to prevent ReDoS attacks
    const escapedQuery = escapeRegExp(query.trim());
    const regex = new RegExp(escapedQuery, 'i');
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

// Update current user's profile (name only)
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body as { name?: string };
    logger.info(`Profile update request for user ${req.userId}`, { name: name ? 'updating' : 'unchanged' });

    if (!name) {
      logger.warn('Profile update failed: no name provided');
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (name.trim().length < 1) {
      logger.warn('Profile update failed: empty name');
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name: name.trim() } },
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

// Register/update FCM token for push notifications
router.post('/fcm-token', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body as { token?: string };

    if (!token || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { fcmToken: token.trim() } },
      { new: true }
    ).select('_id email name profileImageUrl fcmToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.success(`FCM token registered for user ${req.userId}`);
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    logger.error('FCM token registration error:', error);
    res.status(500).json({ success: false, message: 'Unable to register FCM token. Please try again' });
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
