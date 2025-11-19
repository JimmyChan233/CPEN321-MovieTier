import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as userController from '../controllers/user/userController';

const router = Router();

// Search users by name or email (must be defined before '/:userId')
router.get('/search', authenticate, asyncHandler(userController.searchUsers));

// Update current user's profile (name and/or profileImageUrl)
router.put('/profile', authenticate, asyncHandler(userController.updateProfile));

// Register/update FCM token for push notifications
router.post('/fcm-token', authenticate, asyncHandler(userController.registerFcmToken));

// Get user by ID
router.get('/:userId', authenticate, asyncHandler(userController.getUserById));

// Get public watchlist of a user (friend view)
router.get('/:userId/watchlist', authenticate, asyncHandler(userController.getUserWatchlist));

// Get a user's ranked movies
router.get('/:userId/rankings', authenticate, asyncHandler(userController.getUserRankings));

export default router;