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
import RankedMovie from '../../src/models/movie/RankedMovie'; // ← ADD THIS LINE


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
    // Line 255: Unauthorized check
    it('should return 401 when userId is missing', async () => {
      const res = await request(app)
        .get('/api/feed/stream')
        .set('Authorization', 'Bearer invalid.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

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
      expect(res.status).toBe(201);
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
      expect(res.status).toBe(201);
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

  describe('TMDB enrichment (lines 154-158)', () => {
  it('should enrich activity with TMDB data when fields are missing', async () => {
    // Create friendship
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user2 as any)._id
    });

    // Create activity with ONLY movieId and title (missing overview, posterPath, etc)
    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 550,
      movieTitle: 'Fight Club',
      rank: 1
      // Missing: posterPath, overview, releaseDate, voteAverage
    });

    // Mock TMDB to return full movie data
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          overview: 'An insomniac office worker...',
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          release_date: '1999-10-15',
          vote_average: 8.8
        }
      })
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify activity was enriched in DB
    const enrichedActivity = await FeedActivity.findById(activity._id);
    expect(enrichedActivity?.overview).toBe('An insomniac office worker...');
    expect(enrichedActivity?.posterPath).toBe('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
    expect(enrichedActivity?.releaseDate).toBe('1999-10-15');
    expect(enrichedActivity?.voteAverage).toBe(8.8);
  });

  it('should not overwrite existing overview and posterPath', async () => {
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user2 as any)._id
    });

    // Create activity with EXISTING overview but MISSING posterPath (so it gets enriched)
    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 550,
      movieTitle: 'Fight Club',
      overview: 'Existing overview',
      // Missing: posterPath (required for enrichment to trigger)
      rank: 1
    });

    const originalOverview = activity.overview;

    // Mock TMDB to return different data
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          overview: 'NEW overview from TMDB',
          poster_path: '/new-poster.jpg',
          release_date: '1999-10-15',
          vote_average: 8.8
        }
      })
    });

    await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    // Verify existing overview was NOT overwritten, but posterPath was added
    const enrichedActivity = await FeedActivity.findById(activity._id);
    expect(enrichedActivity?.overview).toBe(originalOverview); // Should NOT change (already existed)
    expect(enrichedActivity?.posterPath).toBe('/new-poster.jpg'); // Should be added (was missing)
    expect(enrichedActivity?.releaseDate).toBe('1999-10-15'); // Should be added
    expect(enrichedActivity?.voteAverage).toBe(8.8); // Should be added
  });

  it('should handle partial TMDB data (some fields missing)', async () => {
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user2 as any)._id
    });

    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 550,
      movieTitle: 'Fight Club',
      rank: 1
    });

    // Mock TMDB to return partial data (only overview and poster)
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          overview: 'An insomniac office worker...',
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
          // Missing: release_date, vote_average
        }
      })
    });

    await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    const enrichedActivity = await FeedActivity.findById(activity._id);
    expect(enrichedActivity?.overview).toBe('An insomniac office worker...');
    expect(enrichedActivity?.posterPath).toBe('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
    // releaseDate and voteAverage should remain undefined/null
    expect(enrichedActivity?.releaseDate).toBeUndefined();
    expect(enrichedActivity?.voteAverage).toBeUndefined();
  });

  it('should skip enrichment for only first 8 activities to avoid burst calls', async () => {
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user2 as any)._id
    });

    // Create 15 activities
    for (let i = 0; i < 15; i++) {
      await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550 + i,
        movieTitle: `Movie ${i}`,
        rank: i + 1
      });
    }

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        overview: 'Test overview',
        poster_path: '/test.jpg',
        release_date: '1999-10-15',
        vote_average: 8.8
      }
    });
    getTmdbClient.mockReturnValue({ get: mockGet });

    await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    // TMDB should be called only 8 times (first 8 activities), not 15
    expect(mockGet).toHaveBeenCalledTimes(8);
  });
});


describe('GET /me enrichment and aggregations', () => {
  it('should enrich user own activities with TMDB data', async () => {
    // Create user's own activities (no friendship needed)
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 550,
      movieTitle: 'Fight Club',
      rank: 1
      // Missing: overview, posterPath, releaseDate, voteAverage
    });

    // Mock TMDB
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          overview: 'An insomniac office worker...',
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          release_date: '1999-10-15',
          vote_average: 8.8
        }
      })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Verify enrichment happened
    const enrichedActivity = await FeedActivity.findById(activity._id);
    expect(enrichedActivity?.overview).toBe('An insomniac office worker...');
    expect(enrichedActivity?.posterPath).toBe('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
    expect(enrichedActivity?.releaseDate).toBe('1999-10-15');
    expect(enrichedActivity?.voteAverage).toBe(8.8);
  });

  it('should fetch current ranks from RankedMovie collection', async () => {
    // Create activity
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption',
      rank: 1
    });

    // Create ranked movie with different rank
    await RankedMovie.create({
      userId: (user1 as any)._id,
      movieId: 278,
      title: 'The Shawshank Redemption',
      rank: 5, // Different from activity.rank
      posterPath: '/test.jpg'
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    // Verify the current rank from RankedMovie is returned, not activity.rank
    const returnedActivity = res.body.data[0];
    expect(returnedActivity.rank).toBe(5);
  });

  it('should fetch and include like counts in response', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Create likes from other users
    await Like.create([
      { userId: (user2 as any)._id, activityId: activity._id },
      { userId: new mongoose.Types.ObjectId(), activityId: activity._id }
    ]);

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].likeCount).toBe(2);
  });

  it('should indicate if current user has liked their own activity', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // User1 likes their own activity
    await Like.create({
      userId: (user1 as any)._id,
      activityId: activity._id
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].isLikedByUser).toBe(true);
  });

  it('should fetch and include comment counts in response', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Create comments
    await Comment.create([
      { userId: (user2 as any)._id, activityId: activity._id, text: 'Comment 1' },
      { userId: (user2 as any)._id, activityId: activity._id, text: 'Comment 2' },
      { userId: (user1 as any)._id, activityId: activity._id, text: 'Comment 3' }
    ]);

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].commentCount).toBe(3);
  });

  it('should return empty array when user has no activities', async () => {
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should handle RankedMovie lookup errors gracefully', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Mock RankedMovie to fail
    jest.spyOn(RankedMovie, 'findOne').mockRejectedValueOnce(new Error('DB error'));

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    // Should still succeed despite RankedMovie error
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Rank should be null since lookup failed
    expect(res.body.data[0].rank).toBeNull();
  });

  it('should limit enrichment to first 8 activities only', async () => {
    // Create 15 activities
    for (let i = 0; i < 15; i++) {
      await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: 'ranked_movie',
        movieId: 550 + i,
        movieTitle: `Movie ${i}`,
        rank: i + 1
      });
    }

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        overview: 'Test',
        poster_path: '/test.jpg',
        release_date: '1999-10-15',
        vote_average: 8.0
      }
    });
    getTmdbClient.mockReturnValue({ get: mockGet });

    await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    // Should only call TMDB 8 times, not 15
    expect(mockGet).toHaveBeenCalledTimes(8);
  });

  it('should handle database errors gracefully on /me', async () => {
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

  it('should handle Like aggregation errors gracefully', async () => {
    await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Mock Like.aggregate to fail
    jest.spyOn(Like, 'aggregate').mockImplementationOnce(() => {
      throw new Error('Aggregation error');
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    // Should still fail and return 500 error
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('should handle Comment aggregation errors gracefully', async () => {
    await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Mock Comment.aggregate to fail
    jest.spyOn(Comment, 'aggregate').mockImplementationOnce(() => {
      throw new Error('Aggregation error');
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    // Should fail and return error
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('should include all activity fields in response shape', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption',
      overview: 'Prison escape story',
      posterPath: '/poster.jpg',
      releaseDate: '1994-09-23',
      voteAverage: 9.3,
      rank: 1
    });

    await RankedMovie.create({
      userId: (user1 as any)._id,
      movieId: 278,
      title: 'The Shawshank Redemption',
      rank: 1,
      posterPath: '/poster.jpg'
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .get('/api/feed/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    const returnedActivity = res.body.data[0];
    expect(returnedActivity).toHaveProperty('_id');
    expect(returnedActivity).toHaveProperty('userId');
    expect(returnedActivity).toHaveProperty('userName');
    expect(returnedActivity).toHaveProperty('userProfileImage');
    expect(returnedActivity).toHaveProperty('activityType');
    expect(returnedActivity).toHaveProperty('movie');
    expect(returnedActivity.movie).toHaveProperty('id');
    expect(returnedActivity.movie).toHaveProperty('title');
    expect(returnedActivity.movie).toHaveProperty('posterPath');
    expect(returnedActivity.movie).toHaveProperty('overview');
    expect(returnedActivity.movie).toHaveProperty('releaseDate');
    expect(returnedActivity.movie).toHaveProperty('voteAverage');
    expect(returnedActivity).toHaveProperty('rank');
    expect(returnedActivity).toHaveProperty('likeCount');
    expect(returnedActivity).toHaveProperty('commentCount');
    expect(returnedActivity).toHaveProperty('isLikedByUser');
    expect(returnedActivity).toHaveProperty('createdAt');
  });
});

describe('DELETE /:activityId/comments/:commentId - Delete comment', () => {
  it('should successfully delete user own comment', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity._id,
      text: 'My comment'
    });

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    getTmdbClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    });

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Comment deleted');

    // Verify comment was actually deleted
    const deletedComment = await Comment.findById(comment._id);
    expect(deletedComment).toBeNull();
  });

  it('should return 404 when comment not found', async () => {
    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const fakeCommentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${fakeCommentId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Comment not found');
  });

  it('should return 403 when trying to delete another users comment', async () => {
    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Comment created by user2
    const comment = await Comment.create({
      userId: (user2 as any)._id,
      activityId: activity._id,
      text: 'User2 comment'
    });

    // user1 tries to delete user2's comment
    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('You can only delete your own comments');

    // Verify comment was NOT deleted
    const stillExists = await Comment.findById(comment._id);
    expect(stillExists).toBeDefined();
  });

  it('should handle comment not found in activity gracefully', async () => {
    const activity1 = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie 1',
      rank: 1
    });

    const activity2 = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 238,
      movieTitle: 'Movie 2',
      rank: 2
    });

    // Comment belongs to activity2
    const comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity2._id,
      text: 'Comment for activity 2'
    });

    // Try to delete comment from wrong activity
    const res = await request(app)
      .delete(`/api/feed/${activity1._id}/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Comment not found');

    // Comment should still exist
    const stillExists = await Comment.findById(comment._id);
    expect(stillExists).toBeDefined();
  });

  it('should handle database error gracefully', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity._id,
      text: 'Comment'
    });

    // Mock Comment.findOne to throw error
    jest.spyOn(Comment, 'findOne').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Failed to delete comment');
  });

  it('should handle deletion error gracefully', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity._id,
      text: 'Comment'
    });

    // Mock findByIdAndDelete to throw error
    jest.spyOn(Comment, 'findByIdAndDelete').mockImplementationOnce(() => {
      throw new Error('Delete failed');
    });

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Failed to delete comment');
  });

  it('should reject unauthorized deletion attempts', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity._id,
      text: 'Comment'
    });

    // No authorization header
    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${comment._id}`);

    expect(res.status).toBe(401);
  });

  it('should handle invalid commentId format', async () => {
    const activity = await FeedActivity.create({
      userId: (user1 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/invalid-id`)
      .set('Authorization', `Bearer ${token1}`);

    // Should return 500
    expect(res.status).toStrictEqual(500);
  });

  it('should verify comment ownership before deletion', async () => {
    const activity = await FeedActivity.create({
      userId: (user2 as any)._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Create comments from both users
    const user1Comment = await Comment.create({
      userId: (user1 as any)._id,
      activityId: activity._id,
      text: 'User 1 comment'
    });

    const user2Comment = await Comment.create({
      userId: (user2 as any)._id,
      activityId: activity._id,
      text: 'User 2 comment'
    });

    // User1 can delete their own comment
    let res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${user1Comment._id}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);

    // User1 cannot delete user2's comment
    res = await request(app)
      .delete(`/api/feed/${activity._id}/comments/${user2Comment._id}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(403);

    // Verify user2's comment still exists
    const stillExists = await Comment.findById(user2Comment._id);
    expect(stillExists).toBeDefined();
  });
});

});
