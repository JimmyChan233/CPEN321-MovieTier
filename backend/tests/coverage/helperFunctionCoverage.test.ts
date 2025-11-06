/**
 * Helper Function Branch Coverage Tests
 * Tests to cover the ?? and || operators in helper functions
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Express } from 'express';
import recommendationRoutes from '../../src/routes/recommendationRoutes';
import movieRoutes from '../../src/routes/movieRoutes';
import { authenticate } from '../../src/middleware/auth';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT } from '../utils/test-fixtures';

const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

describe('Recommendation Controller - Helper Function Coverage', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let token: string;
  let user: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use('/api/recommendations', recommendationRoutes);

    user = await User.create({
      email: 'rec@example.com',
      name: 'Rec User',
      googleId: 'google-rec'
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should handle recommendations with movies having partial fields', async () => {
    // Create a ranked movie to base recommendations on
    await RankedMovie.create({
      userId: user._id,
      movieId: 100,
      title: 'Base Movie',
      rank: 1
    });

    mockTmdbGet
      .mockResolvedValueOnce({
        data: {
          results: [
            { id: 100, title: 'Base', genres: [] }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 201,
              title: 'Similar Movie 1',
              genre_ids: [28],
              original_language: 'en'
              // Missing: overview, poster_path, release_date, vote_average
            },
            {
              id: 202,
              title: 'Similar Movie 2',
              overview: 'Has overview',
              genre_ids: [18],
              // Missing: poster_path, release_date, vote_average, original_language
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 301,
              title: 'Recommended',
              poster_path: '/rec.jpg',
              vote_average: 8.0
              // Missing: overview, release_date, original_language
            }
          ]
        }
      });

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

describe('Movie Routes - Helper Function Coverage', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let token: string;
  let user: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use('/api/movies', movieRoutes);

    user = await User.create({
      email: 'movie@example.com',
      name: 'Movie User',
      googleId: 'google-movie'
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should handle CJK search with fallback to detail fetch', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: { results: [] } // Empty English results
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 101,
              title: '中文电影'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 101,
          title: 'Chinese Movie English',
          overview: 'Detailed overview',
          poster_path: '/chinese.jpg',
          release_date: '2020-01-01',
          vote_average: 7.5
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=中文')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });



});
