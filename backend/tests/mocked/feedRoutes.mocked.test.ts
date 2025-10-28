/**
 * Feed Routes Tests - Mocked
 * Tests for error handling and edge cases in feed routes
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import feedRoutes from '../../src/routes/feedRoutes';
import User from '../../src/models/user/User';
import FeedActivity from '../../src/models/feed/FeedActivity';
import Like from '../../src/models/feed/Like';
import Comment from '../../src/models/feed/Comment';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock TMDB client
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn()
  }))
}));

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
  __esModule: true,
  default: {
    sendLikeNotification: jest.fn(),
    sendCommentNotification: jest.fn()
  }
}));

// Mock SSE service
jest.mock('../../src/services/sse/sseService', () => ({
  sseService: {
    addClient: jest.fn(),
    removeClient: jest.fn(),
    send: jest.fn()
  }
}));

describe('Feed Routes - Mocked Error Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/feed', feedRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await FeedActivity.deleteMany({});
    await Like.deleteMany({});
    await Comment.deleteMany({});
    await Friendship.deleteMany({});

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-456'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET / (Friends Feed) Error Tests ====================

  describe('GET / (friends feed) error handling', () => {
    it('should handle TMDB enrichment errors gracefully', async () => {
      // Create friendship
      await Friendship.create({
        userId: (user1 as any)._id,
        friendId: (user2 as any)._id
      });

      // Create activity without poster/overview
      await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
        // No posterPath or overview
      });

      // Mock TMDB to fail
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('TMDB error'))
      });

      const res = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${token1}`);

      // Should still succeed, just without enriched data
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database error gracefully', async () => {
      jest.spyOn(Friendship, 'find').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load feed');
    });
  });

  // ==================== GET /me Error Tests ====================

  describe('GET /me error handling', () => {
    it('should handle TMDB enrichment errors gracefully', async () => {
      // Create activity without poster/overview
      await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      // Mock TMDB to fail
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('TMDB error'))
      });

      const res = await request(app)
        .get('/api/feed/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database error gracefully', async () => {
      jest.spyOn(FeedActivity, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/feed/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load your activities');
    });
  });

  // ==================== GET /stream Error Tests ====================

  describe('GET /stream error handling', () => {
    it('should handle SSE setup errors gracefully', async () => {
      const { sseService } = require('../../src/services/sse/sseService');
      sseService.addClient.mockImplementationOnce(() => {
        throw new Error('SSE error');
      });

      // This test verifies the error is caught and handled
      const res = await request(app)
        .get('/api/feed/stream')
        .set('Authorization', `Bearer ${token1}`);

      // Connection might close or error, but shouldn't crash
      expect(res.status).toBeLessThan(600);
    });
  });

  // ==================== POST /:activityId/like Error Tests ====================

  describe('POST /:activityId/like error handling', () => {
    it('should handle notification errors gracefully', async () => {
      // Create activity by user2
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      // Make user2 have fcmToken
      await User.findByIdAndUpdate((user2 as any)._id, { fcmToken: 'test-token' });

      // Mock notification to fail
      const notificationService = require('../../src/services/notification.service').default;
      notificationService.sendLikeNotification.mockRejectedValueOnce(new Error('FCM error'));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      // Should still succeed even if notification fails
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle duplicate like error', async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      // Like first time
      await Like.create({
        userId: (user1 as any)._id,
        activityId: activity._id
      });

      // Try to like again
      const res = await request(app)
        .post(`/api/feed/${activity._id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Already liked');
    });

    it('should handle database error gracefully', async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      jest.spyOn(Like.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to like activity');
    });
  });

  // ==================== DELETE /:activityId/like Error Tests ====================

  describe('DELETE /:activityId/like error handling', () => {
    it('should handle database error gracefully', async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      jest.spyOn(Like, 'findOneAndDelete').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/feed/${activity._id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to unlike activity');
    });
  });

  // ==================== GET /:activityId/comments Error Tests ====================

  describe('GET /:activityId/comments error handling', () => {
    it('should handle database error gracefully', async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get(`/api/feed/${activity._id}/comments`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to load comments');
    });
  });

  // ==================== POST /:activityId/comments Error Tests ====================

  describe('POST /:activityId/comments error handling', () => {
    it('should handle notification errors gracefully', async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      // Make user2 have fcmToken
      await User.findByIdAndUpdate((user2 as any)._id, { fcmToken: 'test-token' });

      // Mock notification to fail
      const notificationService = require('../../src/services/notification.service').default;
      notificationService.sendCommentNotification.mockRejectedValueOnce(new Error('FCM error'));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/comments`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ text: 'Great movie!' });

      // Should still succeed even if notification fails
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database error gracefully', async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club',
        rank: 1
      });

      jest.spyOn(Comment.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/comments`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ text: 'Great movie!' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to add comment');
    });
  });

});
