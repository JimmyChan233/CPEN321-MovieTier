import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user/User';
import mongoose from 'mongoose';
import WatchlistItem from '../models/watch/WatchlistItem';
import { logger } from '../utils/logger';
import { upload } from '../middleware/upload';
import { ImageStorageService } from '../services/imageStorageService';

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

// Upload profile picture (multipart/form-data)
router.post('/profile/picture', authenticate, upload.single('profileImage'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      logger.warn('Profile picture upload failed: no file provided');
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    logger.info(`Uploading profile picture for user ${req.userId}`);

    // Get current user to check for existing Cloudinary image
    const currentUser = await User.findById(req.userId).select('profileImageUrl googlePictureUrl');
    if (!currentUser) {
      logger.error(`Profile picture upload failed: user ${req.userId} not found`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Upload new image to local storage
    const imageUrl = await ImageStorageService.saveImage(req.file.buffer, req.userId!);
    logger.info(`Image uploaded to local storage: ${imageUrl}`);

    // Delete old local image if it exists (but not Google picture)
    if (currentUser.profileImageUrl && ImageStorageService.isLocalStorageUrl(currentUser.profileImageUrl)) {
      logger.info(`Deleting old local image: ${currentUser.profileImageUrl}`);
      await ImageStorageService.deleteImage(currentUser.profileImageUrl);
    }

    // Update user with new image URL
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { profileImageUrl: imageUrl } },
      { new: true, runValidators: true }
    ).select('_id email name profileImageUrl');

    logger.success(`Profile picture updated for user ${req.userId}`);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: 'Unable to upload profile picture. Please try again' });
  }
});

// Delete profile picture (reset to Google default)
router.delete('/profile/picture', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.info(`Deleting profile picture for user ${req.userId}`);

    const currentUser = await User.findById(req.userId).select('profileImageUrl googlePictureUrl');
    if (!currentUser) {
      logger.error(`Profile picture delete failed: user ${req.userId} not found`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete local image if it exists
    if (currentUser.profileImageUrl && ImageStorageService.isLocalStorageUrl(currentUser.profileImageUrl)) {
      logger.info(`Deleting local image: ${currentUser.profileImageUrl}`);
      await ImageStorageService.deleteImage(currentUser.profileImageUrl);
    }

    // Reset to Google picture
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { profileImageUrl: currentUser.googlePictureUrl || null } },
      { new: true, runValidators: true }
    ).select('_id email name profileImageUrl');

    logger.success(`Profile picture deleted for user ${req.userId}`);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error('Profile picture delete error:', error);
    res.status(500).json({ success: false, message: 'Unable to delete profile picture. Please try again' });
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
