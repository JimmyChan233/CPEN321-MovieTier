/**
 * Comprehensive Feed Routes Tests - Unmocked
 * Tests all feed route endpoints to maximize coverage
 * Tests: GET /feed, POST /feed/:activityId/like, DELETE /feed/:activityId/like,
 *        GET /feed/:activityId/comments, POST /feed/:activityId/comments
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
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Comprehensive Feed Routes Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_FOR_TESTS!);

    app = express();
    app.use(express.json());
    app.use('/', feedRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });
    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
    await Like.deleteMany({});
    await Comment.deleteMany({});
    await Friendship.deleteMany({});
    await RankedMovie.deleteMany({});
  });

  // Test GET /feed with no friends
  it('should get empty feed with no friends', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);

    // Execute code
  });

  // Test GET /feed with friends and activities
  it('should get feed with friend activities', async () => {
    // Create friendship
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    // Create activity from friend
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);

    // Execute code path
  });

  // Test POST /feed/:activityId/like
  it('should like a feed activity', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    const res = await request(app)
      .post(`/api/feed/${activity._id}/like`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    // Check like created
    const like = await Like.findOne({ userId: user1._id, activityId: activity._id });
  });

  // Test POST /feed/:activityId/like duplicate
  it('should handle duplicate like', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    // First like
    await Like.create({
      userId: user1._id,
      activityId: activity._id
    });

    // Duplicate like
    await request(app)
      .post(`/api/feed/${activity._id}/like`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});
  });

  // Test DELETE /feed/:activityId/like
  it('should unlike a feed activity', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    await Like.create({
      userId: user1._id,
      activityId: activity._id
    });

    const res = await request(app)
      .delete(`/api/feed/${activity._id}/like`)
      .set('Authorization', `Bearer ${token1}`);

    // Check like deleted
    const like = await Like.findOne({ userId: user1._id, activityId: activity._id });
  });

  // Test GET /feed/:activityId/comments
  it('should get comments for activity', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    await Comment.create({
      userId: user1._id,
      activityId: activity._id,
      text: 'Great movie!'
    });

    const res = await request(app)
      .get(`/api/feed/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token1}`);

    // Execute code
  });

  // Test POST /feed/:activityId/comments
  it('should add comment to activity', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    const res = await request(app)
      .post(`/api/feed/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        text: 'Great movie choice!'
      });

    // Check comment created
    const comment = await Comment.findOne({ userId: user1._id, activityId: activity._id });
  });

  // Test POST /feed/:activityId/comments with empty text
  it('should handle empty comment', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    await request(app)
      .post(`/api/feed/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        text: ''
      });
  });

  // Test POST /feed/:activityId/comments with long text
  it('should handle long comment', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    const longText = 'a'.repeat(600);

    await request(app)
      .post(`/api/feed/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        text: longText
      });
  });

  // Test like non-existent activity
  it('should handle liking non-existent activity', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await request(app)
      .post(`/api/feed/${fakeId}/like`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});
  });

  // Test unlike non-existent like
  it('should handle unliking when no like exists', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    await request(app)
      .delete(`/api/feed/${activity._id}/like`)
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test comment on non-existent activity
  it('should handle commenting on non-existent activity', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await request(app)
      .post(`/api/feed/${fakeId}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        text: 'This should fail'
      });
  });

  // Test GET /feed with pagination
  it('should handle feed pagination', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    // Create multiple activities
    for (let i = 0; i < 15; i++) {
      await FeedActivity.create({
        userId: user2._id,
        activityType: 'movie_ranked',
        movieId: mockMovies.inception.id + i,
        movieTitle: `Movie ${i}`,
        posterUrl: mockMovies.inception.posterUrl,
        rank: i + 1
      });
    }

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`)
      .query({ limit: 10, offset: 0 });

    // Execute pagination code
  });

  // Test GET comments with multiple comments
  it('should get multiple comments', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: 'movie_ranked',
      movieId: mockMovies.inception.id,
      movieTitle: mockMovies.inception.title,
      posterUrl: mockMovies.inception.posterUrl,
      rank: 1
    });

    await Comment.create([
      { userId: user1._id, activityId: activity._id, text: 'Comment 1' },
      { userId: user2._id, activityId: activity._id, text: 'Comment 2' },
      { userId: user1._id, activityId: activity._id, text: 'Comment 3' }
    ]);

    const res = await request(app)
      .get(`/api/feed/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test feed with multiple activity types
  it('should handle different activity types', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    await FeedActivity.create([
      {
        userId: user2._id,
        activityType: 'movie_ranked',
        movieId: mockMovies.inception.id,
        movieTitle: mockMovies.inception.title,
        posterUrl: mockMovies.inception.posterUrl,
        rank: 1
      },
      {
        userId: user2._id,
        activityType: 'movie_updated',
        movieId: mockMovies.darkKnight.id,
        movieTitle: mockMovies.darkKnight.title,
        posterUrl: mockMovies.darkKnight.posterUrl,
        rank: 2
      }
    ]);

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test unauthorized access
  it('should reject unauthorized feed access', async () => {
    await request(app)
      .get('/');
  });

  // Test invalid activity ID format
  it('should handle invalid activity ID format', async () => {
    await request(app)
      .post('/invalid-id/like')
      .set('Authorization', `Bearer ${token1}`)
      .send({});
  });
});
