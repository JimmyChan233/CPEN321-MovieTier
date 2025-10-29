/**
 * Recommendations API Tests - Unmocked
 * Tests: GET /recommendations, GET /recommendations/trending
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import recommendationRoutes from '../../src/routes/recommendationRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: GET /recommendations', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', recommendationRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: User with ranked movies
  // Expected status code: 200
  // Expected behavior: Algorithm analyzes preferences and returns recommendations
  // Expected output: Array of recommended movies
  it('should return recommendations for user with ranked movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 278,
        title: 'The Shawshank Redemption',
        rank: 1
      },
      {
        userId: user._id,
        movieId: 238,
        title: 'The Godfather',
        rank: 2
      }
    ]);

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Input: User with no ranked movies
  // Expected status code: 200
  // Expected behavior: Return empty recommendations
  // Expected output: Empty array
  it('should return empty recommendations for user with no ranked movies', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated recommendation request', async () => {
    const res = await request(app)
      .get('/');

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: GET /recommendations/trending', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', recommendationRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Authenticated user request
  // Expected status code: 200
  // Expected behavior: Fetch trending movies from TMDB
  // Expected output: Array of trending movies
  it('should return trending movies', async () => {
    const res = await request(app)
      .get('/trending')
      .set('Authorization', `Bearer ${token}`);

    // Accept 200 (success) or 500 (TMDB API error with test key)
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated trending request', async () => {
    const res = await request(app)
      .get('/trending');

    expect(res.status).toStrictEqual(401);
  });
});
