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

// Mock the TMDB client to avoid real API calls and timeouts
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn((url: string) => {
      if (url === '/trending/movie/week') {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 550,
                title: 'Fight Club',
                overview: 'A ticking-time-bomb insomniac...',
                poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                release_date: '1999-10-15',
                vote_average: 8.4
              },
              {
                id: 680,
                title: 'Pulp Fiction',
                overview: 'A burger-loving hit man...',
                poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
                release_date: '1994-09-10',
                vote_average: 8.5
              }
            ]
          }
        });
      }
      if (url.includes('/similar') || url.includes('/recommendations')) {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 424,
                title: "Schindler's List",
                overview: 'The true story...',
                poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
                release_date: '1993-11-30',
                vote_average: 8.6
              }
            ]
          }
        });
      }
      if (url.includes('/movie/')) {
        return Promise.resolve({
          data: {
            id: 278,
            genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }]
          }
        });
      }
      return Promise.reject(new Error('Not found'));
    })
  }))
}));

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

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
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
