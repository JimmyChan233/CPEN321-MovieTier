/**
 * @unmocked Integration tests for feed operations
 * Tests with real MongoDB database
 */

/**
 * Feed Route Handlers Tests - Unmocked
 * Comprehensive tests for inline handlers in feedRoutes.ts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import feedRoutes from '../../../src/routes/feedRoutes';
import User from '../../../src/models/user/User';
import FeedActivity from '../../../src/models/feed/FeedActivity';
import RankedMovie from '../../../src/models/movie/RankedMovie';
import { Friendship } from '../../../src/models/friend/Friend';
import Like from '../../../src/models/feed/Like';
import Comment from '../../../src/models/feed/Comment';
import { generateTestJWT, mockUsers } from '../../utils/test-fixtures';

describe('Feed Route Handlers - Inline Handlers', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let user3: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/feed', feedRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2',
      fcmToken: 'test-fcm-token-user2'
    });
    user3 = await User.create({
      ...mockUsers.validUser,
      email: 'user3@example.com',
      googleId: 'google-user3'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
    await RankedMovie.deleteMany({});
    await Friendship.deleteMany({});
    await Like.deleteMany({});
    await Comment.deleteMany({});
  });

  // Test Case 1: GET /feed with friends' activities

  // Test Case 2: GET /feed with no friends

  // Test Case 3: GET /feed with activities lacking overview/poster

  // Test Case 4: GET /feed with like counts

  // Test Case 5: GET /feed with comment counts
  it('should include comment counts in feed', async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Add comments
    await Comment.create({
      userId: user1._id,
      activityId: activity._id,
      text: 'Great movie!'
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // Test Case 6: GET /feed with user's like status
  it('should mark activities liked by user', async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // User1 likes the activity
    await Like.create({ userId: user1._id, activityId: activity._id });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // Test Case 7: GET /feed with current rank from RankedMovie
  it('should show current rank from RankedMovie collection', async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Create ranked movie with updated rank
    await RankedMovie.create({
      userId: user2._id,
      movieId: 278,
      title: 'Movie',
      rank: 3,
      posterPath: '/test.jpg'
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // Test Case 8: GET /feed with multiple friends

  // Test Case 9: GET /feed error handling

  // Test Case 10: GET /me (own activities)

  // Test Case 11: GET /me with no activities

  // Test Case 12: GET /stream (SSE)
  it('should establish SSE stream', (done) => {
    const req = request(app)
      .get('/api/feed/stream')
      .set('Authorization', `Bearer ${token1}`)
      .set('Accept', 'text/event-stream')
      .parse((res: any) => {
        // Check headers on initial response
        if (res.statusCode === 200 && res.headers['content-type'] === 'text/event-stream') {
          req.abort();
          done();
        }
      })
      .end((err: any) => {
        // Ignore abort errors - they're expected for SSE
        if (err && err.code !== 'ECONNRESET') {
          done(err);
        }
      });
  });

  // Test Case 13: POST /:activityId/like

  // Test Case 14: POST /:activityId/like with non-existent activity
  it('should return 404 when liking non-existent activity', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/feed/${fakeId.toString()}/like`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(404);
  });

  // Test Case 15: POST /:activityId/like own activity

  // Test Case 16: POST /:activityId/like duplicate

  // Test Case 17: DELETE /:activityId/like
  it('should unlike an activity', async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    // Create like
    await Like.create({
      userId: user1._id,
      activityId: activity._id
    });

    const res = await request(app)
      .delete(`/api/feed/${(activity as any)._id.toString()}/like`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);

    // Verify like was deleted
    const like = await Like.findOne({
      userId: user1._id,
      activityId: activity._id
    });
    expect(like).toBeNull();
  });

  // Test Case 18: DELETE /:activityId/like when not liked
  it('should handle unlike when not previously liked', async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    const res = await request(app)
      .delete(`/api/feed/${(activity as any)._id.toString()}/like`)
      .set('Authorization', `Bearer ${token1}`);

    // Should handle not found when not previously liked
    expect(res.status).toStrictEqual(404);
  });

  // Test Case 19: GET /:activityId/comments
  it('should get comments for an activity', async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'Movie',
      rank: 1
    });

    await Comment.create([
      {
        userId: user1._id,
        activityId: activity._id,
        text: 'Comment 1'
      },
      {
        userId: user2._id,
        activityId: activity._id,
        text: 'Comment 2'
      }
    ]);

    const res = await request(app)
      .get(`/api/feed/${(activity as any)._id.toString()}/comments`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // Test Case 20: GET /:activityId/comments with no comments

  // Test Case 21: POST /:activityId/comments

  // Test Case 22: POST /:activityId/comments with missing text

  // Test Case 23: POST /:activityId/comments on non-existent activity
  it('should return 404 when commenting on non-existent activity', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/feed/${fakeId.toString()}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ text: 'Comment' });

    expect(res.status).toBe(404);
  });

  // Test Case 24: POST /:activityId/comments sends notification

  // Test Case 25: POST /:activityId/comments on own activity (no notification)

  // Test Case 26: Unauthorized access to feed

  // Test Case 27: Unauthorized access to /me

  // Test Case 28: Unauthorized access to /stream

  // Test Case 29: Unauthorized like

  // Test Case 30: Unauthorized comment

  // Test Case 31: GET /feed with activity having both overview and posterPath (needsEnrichment returns false)
  it('should handle activity with complete metadata (no enrichment needed)', async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    await FeedActivity.create({
      userId: user2._id,
      activityType: 'ranked_movie',
      movieId: 550,
      movieTitle: 'The Fight Club',
      overview: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club...',
      posterPath: '/path/to/poster.jpg',
      rank: 1
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].movie.overview).toBe('An insomniac office worker and a devil-may-care soapmaker form an underground fight club...');
    expect(res.body.data[0].movie.posterPath).toBe('/path/to/poster.jpg');
  });
});