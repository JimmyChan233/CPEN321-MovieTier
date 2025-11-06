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
import RankedMovie from '../../src/models/movie/RankedMovie';
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






    it('should reject missing query parameter', async () => {
      const res = await request(app)
        .get('/search')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
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


  });

  // ==================== POST /fcm-token Tests ====================

  describe('POST /fcm-token', () => {


    it('should trim whitespace from token', async () => {
      const res = await request(app)
        .post('/fcm-token')
        .set('Authorization', `Bearer ${token1}`)
        .send({ token: '  fcm-token-trimmed  ' });

      expect(res.status).toBe(200);
      const updated = await User.findById((user1 as any)._id);
      expect(updated?.fcmToken).toBe('fcm-token-trimmed');
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

  });

  // ==================== GET /:userId Tests ====================

  describe('GET /:userId', () => {

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

  // ==================== GET /:userId/rankings Tests ====================

  describe('GET /:userId/rankings', () => {
    beforeEach(async () => {
      // Create rankings for users
      await RankedMovie.create([
        {
          userId: (user2 as any)._id,
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster1.jpg',
          rank: 1
        },
        {
          userId: (user2 as any)._id,
          movieId: 680,
          title: 'Pulp Fiction',
          posterPath: '/poster2.jpg',
          rank: 2
        },
        {
          userId: (user1 as any)._id,
          movieId: 155,
          title: 'The Dark Knight',
          posterPath: '/poster3.jpg',
          rank: 1
        }
      ]);
    });






    it('should reject invalid user ID format', async () => {
      const res = await request(app)
        .get('/invalid-id/rankings')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid user id');
    });

    it('should allow user to view own rankings without friendship check', async () => {
      const res = await request(app)
        .get(`/${(user1 as any)._id}/rankings`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should reject access to other user rankings without friendship', async () => {
      const res = await request(app)
        .get(`/${(user3 as any)._id}/rankings`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be friends');
    });

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .get(`/${(user2 as any)._id}/rankings`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load rankings');

      await mongoose.connect(mongoServer.getUri());
    });

    it('should return rankings with null posterPath when movie has no posterPath', async () => {
      // Add a ranked movie without posterPath
      await RankedMovie.create({
        userId: (user2 as any)._id,
        movieId: 278,
        title: 'The Shawshank Redemption',
        // No posterPath - will be undefined
        rank: 3
      });

      const res = await request(app)
        .get(`/${(user2 as any)._id}/rankings`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const movieWithoutPoster = res.body.data.find((m: any) => m.movie.title === 'The Shawshank Redemption');
      expect(movieWithoutPoster).toBeDefined();
      expect(movieWithoutPoster.movie.posterPath).toBeNull();
    });
  });
});
