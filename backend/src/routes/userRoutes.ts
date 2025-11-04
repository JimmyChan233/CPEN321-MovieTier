import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user/User';
import mongoose from 'mongoose';
import WatchlistItem from '../models/watch/WatchlistItem';
import { Friendship } from '../models/friend/Friend';
import RankedMovie from '../models/movie/RankedMovie';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Escape special regex characters for MongoDB $regex operator
 * This prevents ReDoS attacks by sanitizing user input before using it in a regex pattern
 */
function escapeRegexForMongo(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search users by name or email (must be defined before '/:userId')
router.get('/search', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const query = String(req.query.query ?? '');
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }

    // Escape special regex characters to prevent ReDoS attacks
    // Use MongoDB's $regex operator with a string pattern instead of RegExp object
    const escapedQuery = escapeRegexForMongo(query.trim());
    const users = await User.find({
      _id: { $ne: req.userId },
      name: { $regex: escapedQuery, $options: 'i' }
    })
      .select('_id email name profileImageUrl')
      .limit(20);

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to search users. Please try again' });
  }
}));

// Update current user's profile (name and/or profileImageUrl)
router.put('/profile', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { name, profileImageUrl } = req.body as { name?: string; profileImageUrl?: string };
    logger.info(`Profile update request for user ${req.userId}`, { name: name !== undefined ? 'updating' : 'unchanged', profileImageUrl: profileImageUrl !== undefined ? 'updating' : 'unchanged' });

    if (name === undefined && profileImageUrl === undefined) {
      logger.warn('Profile update failed: no fields provided');
      return res.status(400).json({ success: false, message: 'At least one field (name or profileImageUrl) is required' });
    }

    if (name !== undefined && (!name || name.trim().length < 1)) {
      logger.warn('Profile update failed: empty name');
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const updateFields: { name?: string; profileImageUrl?: string } = {};
    if (name !== undefined) {
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
}));

// Register/update FCM token for push notifications
router.post('/fcm-token', authenticate, asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.get('/:userId', authenticate, asyncHandler(async (req, res) => {
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
}));

// Public watchlist of a user (friend view)
router.get('/:userId/watchlist', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    // Allow users to see their own watchlist
    if (String(req.userId) !== userId) {
      // For other users, check for friendship
      const areFriends = await Friendship.findOne({ userId: req.userId, friendId: userId });
      if (!areFriends) {
        return res.status(403).json({ success: false, message: 'You must be friends to view this watchlist.' });
      }
    }
    const items = await WatchlistItem.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load user watchlist. Please try again' });
  }
}));

// Get a user's ranked movies
router.get('/:userId/rankings', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // Friendship check
    const areFriends = await Friendship.findOne({ userId: req.userId, friendId: userId });
    if (!areFriends && String(req.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'You must be friends to view these rankings.' });
    }

    const movies = await RankedMovie.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ rank: 1 });
    const shaped = movies.map((m) => {
        const movieDoc = m as unknown as { _id: unknown; userId: unknown; movieId: number; title: string; posterPath?: string; rank: number; createdAt?: Date };
        return {
            _id: movieDoc._id,
            userId: movieDoc.userId,
            movie: {
                id: movieDoc.movieId,
                title: movieDoc.title,
                overview: null,
                posterPath: movieDoc.posterPath ?? null,
                releaseDate: null,
                voteAverage: null
            },
            rank: movieDoc.rank,
            createdAt: movieDoc.createdAt
        };
    });
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load rankings. Please try again' });
  }
}));

export default router;
