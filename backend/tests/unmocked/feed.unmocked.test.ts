/**
 * Feed API Tests - Unmocked
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
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: GET /feed', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    // Create friendship
    await Friendship.create({ userId: user._id, friendId: friend._id });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
    await Like.deleteMany({});
  });

  // Input: User with friends who have ranked movies
  // Expected status code: 200
  // Expected behavior: Return friend activities with like/comment counts
  // Expected output: Array of activities with enriched data
  it('should return feed activities from friends', async () => {
    await FeedActivity.create({
      userId: friend._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption',
      rank: 1
    });

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Input: User with no friends
  // Expected status code: 200
  // Expected behavior: Return empty feed
  // Expected output: Empty array
  it('should return empty feed for user with no friends', async () => {
    const newUser = await User.create({
      email: 'isolated@example.com',
      name: 'Isolated User',
      googleId: 'google-isolated'
    });
    const newToken = generateTestJWT((newUser as any)._id.toString());

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${newToken}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Input: Unauthenticated request
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated feed request', async () => {
    const res = await request(app)
      .get('/');

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: POST /feed/:activityId/like', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Like.deleteMany({});
  });

  // Input: Valid activity ID
  // Expected status code: 201
  // Expected behavior: Like is created in database
  // Expected output: Success message with like count
  it('should successfully like an activity', async () => {
    const res = await request(app)
      .post(`/${activity._id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(201);

    // Verify like was created
    const likeCount = await Like.countDocuments({ activityId: activity._id });
    expect(likeCount).toBe(1);
  });

  // Input: Invalid activity ID
  // Expected status code: 404
  // Expected behavior: Database is unchanged
  // Expected output: Not found error
  it('should reject like on non-existent activity', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/${fakeId}/like`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(404);
  });

  // Input: Duplicate like on same activity
  // Expected status code: 400
  // Expected behavior: Database constraint prevents duplicate
  // Expected output: Error about duplicate like
  it('should reject duplicate like on same activity', async () => {
    // Create first like
    await Like.create({
      userId: user._id,
      activityId: activity._id
    });

    // Try to like again
    const res = await request(app)
      .post(`/${activity._id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
  });
});

describe('Unmocked: GET /feed/:activityId/comments', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  // Input: Activity with comments
  // Expected status code: 200
  // Expected behavior: Return all comments for activity
  // Expected output: Array of comments with user info
  it('should return comments for activity', async () => {
    await Comment.create({
      userId: friend._id,
      activityId: activity._id,
      text: 'Great movie!'
    });

    const res = await request(app)
      .get(`/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Input: Activity with no comments
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array
  it('should return empty array for activity with no comments', async () => {
    const res = await request(app)
      .get(`/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

describe('Unmocked: POST /feed/:activityId/comments', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: 'ranked_movie',
      movieId: 278,
      movieTitle: 'The Shawshank Redemption'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  // Input: Valid comment text within 500 character limit
  // Expected status code: 201
  // Expected behavior: Comment is created in database
  // Expected output: Created comment object
  it('should successfully post a comment', async () => {
    const commentText = 'This is a great movie!';
    const res = await request(app)
      .post(`/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: commentText });

    expect(res.status).toStrictEqual(201);

    // Verify comment was created
    const comment = await Comment.findOne({ activityId: activity._id });
    expect(comment?.text).toStrictEqual(commentText);
  });

  // Input: Empty comment text
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Validation error
  it('should reject empty comment', async () => {
    const res = await request(app)
      .post(`/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '' });

    expect(res.status).toStrictEqual(400);
  });

  // Input: Comment text exceeding 500 characters
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Length validation error
  it('should reject comment exceeding 500 characters', async () => {
    const longText = 'a'.repeat(501);
    const res = await request(app)
      .post(`/${activity._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: longText });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/characters|length/);
  });
});
