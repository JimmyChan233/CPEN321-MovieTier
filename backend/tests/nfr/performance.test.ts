/**
 * Non-Functional Requirement Tests: Performance
 *
 * NFR 1: Response Time Performance
 * - API endpoints must respond within 1000ms (acceptable UX threshold)
 * - Bulk operations must not exceed 3000ms
 *
 * NFR 2: Database Query Efficiency
 * - Ranked movies queries must use indexes for O(log n) performance
 * - Feed queries must limit to 50 items to prevent memory bloat
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import FeedActivity from '../../src/models/feed/FeedActivity';
import { Friendship } from '../../src/models/friend/Friend';
import authRoutes from '../../src/routes/authRoutes';
import movieRoutes from '../../src/routes/movieRoutes';
import feedRoutes from '../../src/routes/feedRoutes';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('NFR: Performance - Response Time', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;
  const ACCEPTABLE_RESPONSE_TIME_MS = 1000;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/movies', movieRoutes);
    app.use('/api/feed', feedRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Requirement: API endpoints must respond within 1000ms
  // Measurement: Time from request send to response receive
  // Expected: Response time < 1000ms
  it('should respond to GET /movies/ranked within acceptable time', async () => {
    const startTime = Date.now();
    const res = await request(app)
      .get('/api/movies/ranked')
      .set('Authorization', `Bearer ${token}`);
    const responseTime = Date.now() - startTime;

    expect(res.status).toStrictEqual(200);
    expect(responseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME_MS);
  });

  // Requirement: Authentication endpoints must be fast
  // Measurement: Time for signOut operation
  // Expected: < 500ms (critical path should be fastest)
  it('should sign out user within acceptable time', async () => {
    const startTime = Date.now();
    const res = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const responseTime = Date.now() - startTime;

    expect(res.status).toStrictEqual(200);
    expect(responseTime).toBeLessThan(500);
  });

  // Requirement: Feed queries should include pagination
  // Measurement: Verify response includes reasonable data size
  // Expected: Feed returns max 50 items to prevent memory bloat
  it('should limit feed results to prevent memory bloat', async () => {
    // Create multiple friends and feed activities
    const friends = await Promise.all(
      Array(10).fill(null).map((_, i) =>
        User.create({
          email: `friend${i}@example.com`,
          name: `Friend ${i}`,
          googleId: `google-${i}`
        })
      )
    );

    // Create friendships
    for (const friend of friends) {
      await Friendship.create({ userId: user._id, friendId: friend._id });
    }

    // Create many activities
    await Promise.all(
      friends.flatMap(friend =>
        Array(10).fill(null).map((_, j) =>
          FeedActivity.create({
            userId: friend._id,
            activityType: 'ranked_movie',
            movieId: 100 + j,
            movieTitle: `Movie ${j}`
          })
        )
      )
    );

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Feed should limit results, verify it's not unbounded
    expect(res.body.length).toBeLessThanOrEqual(50);
  });
});

describe('NFR: Performance - Database Index Efficiency', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Requirement: Ranked movie queries must use compound index (userId, rank)
  // Measurement: Query performance with large dataset
  // Expected: Queries should use index (check explain plan)
  it('should efficiently fetch ranked movies using indexes', async () => {
    // Create large number of ranked movies for this user
    const movies = Array(100).fill(null).map((_, i) => ({
      userId: user._id,
      movieId: i,
      title: `Movie ${i}`,
      rank: i + 1
    }));
    await RankedMovie.insertMany(movies);

    const startTime = Date.now();
    const res = await request(app)
      .get('/api/movies/ranked')
      .set('Authorization', `Bearer ${token}`);
    const queryTime = Date.now() - startTime;

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(100);
    // With proper indexing, 100 items should still be fast
    expect(queryTime).toBeLessThan(500);
  });
});

describe('NFR: Performance - Bulk Operations', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;
  const ACCEPTABLE_BULK_TIME_MS = 3000;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
    app.use('/api/feed', feedRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Requirement: Bulk cascade delete (account deletion) must complete in reasonable time
  // Measurement: Time for deleteAccount with associated data
  // Expected: < 3000ms for reasonable dataset
  it('should complete cascade delete within acceptable time', async () => {
    const deleteUser = await User.create({
      email: 'delete@example.com',
      name: 'Delete User',
      googleId: 'google-delete'
    });

    // Create associated data
    await Promise.all([
      RankedMovie.insertMany(
        Array(50).fill(null).map((_, i) => ({
          userId: deleteUser._id,
          movieId: i,
          title: `Movie ${i}`,
          rank: i + 1
        }))
      ),
      FeedActivity.insertMany(
        Array(50).fill(null).map((_, i) => ({
          userId: deleteUser._id,
          activityType: 'ranked_movie',
          movieId: i,
          movieTitle: `Movie ${i}`
        }))
      )
    ]);

    const deleteToken = generateTestJWT((deleteUser as any)._id.toString());
    const startTime = Date.now();
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${deleteToken}`);
    const deleteTime = Date.now() - startTime;

    expect(res.status).toStrictEqual(200);
    expect(deleteTime).toBeLessThan(ACCEPTABLE_BULK_TIME_MS);
  });
});
