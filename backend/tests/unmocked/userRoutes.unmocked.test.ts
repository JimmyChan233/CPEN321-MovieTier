/**
 * User Routes Tests - Unmocked
 * Comprehensive tests for all user route handlers
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import userRoutes from '../../src/routes/userRoutes';
import User from '../../src/models/user/User';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('User Routes - Unmocked Tests', () => {
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
    app.use('/', userRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await WatchlistItem.deleteMany({});
    await Friendship.deleteMany({});

    user1 = await User.create({
      ...mockUsers.validUser,
      name: 'Alice Johnson'
    });
    user2 = await User.create({
      email: 'bob@example.com',
      name: 'Bob Smith',
      googleId: 'google-bob'
    });
    user3 = await User.create({
      email: 'charlie@test.com',
      name: 'Charlie Brown',
      googleId: 'google-charlie'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());

    // Create friendships for watchlist access tests
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user2 as any)._id,
      status: 'accepted'
    });
    await Friendship.create({
      userId: (user2 as any)._id,
      friendId: (user1 as any)._id,
      status: 'accepted'
    });
    await Friendship.create({
      userId: (user1 as any)._id,
      friendId: (user3 as any)._id,
      status: 'accepted'
    });
    await Friendship.create({
      userId: (user3 as any)._id,
      friendId: (user1 as any)._id,
      status: 'accepted'
    });
  });

  // ==================== GET /search Tests ====================

  describe('GET /search', () => {
    it('should search users by name', async () => {
      // user1 searches for user2 (Bob)
      const res = await request(app)
        .get('/search?query=Bob')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain('Bob');
    });

    it('should search users by partial name match', async () => {
      const res = await request(app)
        .get('/search?query=Smith')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain('Smith');
    });

    it('should exclude current user from search results', async () => {
      // Search with a broad query that would match all users
      const res = await request(app)
        .get('/search?query=example')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const userIds = res.body.data.map((u: any) => u._id);
      expect(userIds).not.toContain((user1 as any)._id.toString());
    });

    it('should return empty array when no users match', async () => {
      const res = await request(app)
        .get('/search?query=NonExistentUser123')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should reject query with less than 2 characters', async () => {
      const res = await request(app)
        .get('/search?query=a')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 2 characters');
    });

    it('should reject empty query', async () => {
      const res = await request(app)
        .get('/search?query=')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 2 characters');
    });

    it('should reject missing query parameter', async () => {
      const res = await request(app)
        .get('/search')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle case-insensitive search', async () => {
      // Search for Bob in uppercase
      const res = await request(app)
        .get('/search?query=BOB')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should limit results to 20 users', async () => {
      // Create 25 users
      const users = [];
      for (let i = 1; i <= 25; i++) {
        users.push({
          email: `testuser${i}@example.com`,
          name: `TestUser${i}`,
          googleId: `google-test${i}`
        });
      }
      await User.insertMany(users);

      const res = await request(app)
        .get('/search?query=TestUser')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should trim whitespace from query', async () => {
      // Search for Charlie with extra whitespace
      const res = await request(app)
        .get('/search?query=  Charlie  ')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .get('/search?query=Test')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to search users');

      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ==================== PUT /profile Tests ====================

  describe('PUT /profile', () => {
    it('should update user profile name successfully', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Alice Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice Updated');
      expect(res.body.data._id).toBeDefined();

      // Verify database was updated
      const updated = await User.findById((user1 as any)._id);
      expect(updated?.name).toBe('Alice Updated');
    });

    it('should trim whitespace from name', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: '  Alice Trimmed  ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice Trimmed');
    });

    it('should update user profile image URL successfully', async () => {
      const imageUrl = 'https://example.com/profile-image.jpg';
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ profileImageUrl: imageUrl });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profileImageUrl).toBe(imageUrl);

      // Verify database was updated
      const updated = await User.findById((user1 as any)._id);
      expect(updated?.profileImageUrl).toBe(imageUrl);
    });

    it('should update both name and profileImageUrl', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Alice Updated',
          profileImageUrl: 'https://example.com/new-image.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice Updated');
      expect(res.body.data.profileImageUrl).toBe('https://example.com/new-image.jpg');
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('At least one field');
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Name is required');
    });

    it('should reject whitespace-only name', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Name is required');
    });

    it('should handle user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const fakeToken = generateTestJWT(nonExistentId.toString());

      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should preserve other user fields', async () => {
      const originalEmail = user1.email;
      const originalGoogleId = user1.googleId;

      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(originalEmail);

      const updated = await User.findById((user1 as any)._id);
      expect(updated?.googleId).toBe(originalGoogleId);
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to update profile');

      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ==================== POST /fcm-token Tests ====================

  describe('POST /fcm-token', () => {
    it('should register FCM token successfully', async () => {
      const fcmToken = 'fcm-token-abc123';

      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: fcmToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');

      // Verify token was saved
      const updated = await User.findById((user1 as any)._id);
      expect(updated?.fcmToken).toBe(fcmToken);
    });

    it('should update existing FCM token', async () => {
      await User.findByIdAndUpdate((user1 as any)._id, { fcmToken: 'old-token' });

      const newToken = 'new-fcm-token-xyz789';
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: newToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await User.findById((user1 as any)._id);
      expect(updated?.fcmToken).toBe(newToken);
    });

    it('should trim whitespace from token', async () => {
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: '  fcm-token-trimmed  ' });

      expect(res.status).toBe(200);
      const updated = await User.findById((user1 as any)._id);
      expect(updated?.fcmToken).toBe('fcm-token-trimmed');
    });

    it('should reject missing token', async () => {
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('required');
    });

    it('should reject empty token', async () => {
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject whitespace-only token', async () => {
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const fakeToken = generateTestJWT(nonExistentId.toString());

      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ token: 'fcm-token' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: 'fcm-token' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to register FCM token');

      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ==================== GET /:userId Tests ====================

  describe('GET /:userId', () => {
    it('should get user by ID successfully', async () => {
      const res = await request(app)
        .get(`/${(user2 as any)._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe((user2 as any)._id.toString());
      expect(res.body.data.email).toBe(user2.email);
      expect(res.body.data.name).toBe(user2.name);
    });

    it('should reject invalid user ID format', async () => {
      const res = await request(app)
        .get('/invalid-id-format')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid user id');
    });

    it('should handle user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/${nonExistentId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should return selected fields only', async () => {
      const res = await request(app)
        .get(`/${(user2 as any)._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).not.toHaveProperty('googleId');
      expect(res.body.data).not.toHaveProperty('fcmToken');
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .get(`/${(user2 as any)._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load user');

      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ==================== GET /:userId/watchlist Tests ====================

  describe('GET /:userId/watchlist', () => {
    beforeEach(async () => {
      await WatchlistItem.create([
        {
          userId: (user2 as any)._id,
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster1.jpg'
        },
        {
          userId: (user2 as any)._id,
          movieId: 680,
          title: 'Pulp Fiction',
          posterPath: '/poster2.jpg'
        },
        {
          userId: (user1 as any)._id,
          movieId: 155,
          title: 'The Dark Knight',
          posterPath: '/poster3.jpg'
        }
      ]);
    });

    it('should get own watchlist successfully', async () => {
      const res = await request(app)
        .get(`/${(user1 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('The Dark Knight');
    });

    it('should get friend watchlist successfully', async () => {
      const res = await request(app)
        .get(`/${(user2 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].title).toBeDefined();
    });

    it('should return empty array for user with no watchlist items', async () => {
      const res = await request(app)
        .get(`/${(user3 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should sort watchlist by createdAt descending', async () => {
      const res = await request(app)
        .get(`/${(user2 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const items = res.body.data;
      if (items.length > 1) {
        const dates = items.map((item: any) => new Date(item.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('should reject access to non-friend watchlist', async () => {
      // Create a new user who is not friends with user1
      const user4 = await User.create({
        email: 'notfriend@example.com',
        name: 'Not Friend',
        googleId: 'google-notfriend'
      });

      const res = await request(app)
        .get(`/${(user4 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be friends');
    });

    it('should reject invalid user ID format', async () => {
      const res = await request(app)
        .get('/invalid-id/watchlist')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid user id');
    });

    it('should reject access to non-existent user watchlist (not friends)', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/${nonExistentId}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      // Non-existent users can't be friends, so should get 403
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be friends');
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .get(`/${(user2 as any)._id}/watchlist`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load user watchlist');

      await mongoose.connect(mongoServer.getUri());
    });
  });
});
