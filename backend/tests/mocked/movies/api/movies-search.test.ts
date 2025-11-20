/**
 * @mocked API tests for movie search with mocked TMDB
 * Tests search functionality, CJK search, and response handling with mocked external APIs
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Express } from 'express';
import movieRoutes from '../../../../src/routes/movieRoutes';
import { authenticate } from '../../../../src/middleware/auth';
import User from '../../../../src/models/user/User';
import { generateTestJWT } from '../../../utils/test-fixtures';

const mockTmdbGet = jest.fn();
jest.mock('../../../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

describe('Movie Search - CJK Search with Detail Fetch', () => {
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
      email: 'cjk@example.com',
      name: 'CJK User',
      googleId: 'google-cjk'
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

  it('should handle CJK search where zh.results is not an array', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: { results: [] } // Empty English
      })
      .mockResolvedValueOnce({
        data: {
          results: "not an array" // Invalid type
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=日本映画')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should handle CJK detail fetch with partial fields from TMDB', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: { results: [] }
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 101,
              title: '日本映画',
              overview: '日本概述',
              poster_path: '/jp-poster.jpg',
              release_date: '2019-01-01',
              vote_average: 7.0
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          // Only some fields from detail fetch
          title: 'Japanese Movie',
          // overview, poster_path, release_date, vote_average missing
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=日本')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Japanese Movie');
    expect(res.body.data[0].overview).toBe('日本概述');
  });

  it('should handle CJK detail fetch where id/title use fallback from original', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: { results: [] }
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 102,
              title: '韓国映画',
              overview: '韓国概述',
              poster_path: '/kr-poster.jpg',
              release_date: '2018-01-01',
              vote_average: 6.5
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          // Missing id and title
          overview: 'Korean overview',
          poster_path: '/kr-poster-en.jpg',
          release_date: '2018-06-01',
          vote_average: 7.5
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=韓国')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(102); // Falls back to original
    expect(res.body.data[0].title).toBe('韓国映画'); // Falls back to original
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

  it('should handle search when cast field is null or missing', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 2,
              title: 'Movie'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          cast: null // Null instead of array
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=test&includeCast=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // When cast is null/missing, it defaults to empty array in the code
    expect(Array.isArray(res.body.data[0].cast) || res.body.data[0].cast === undefined).toBe(true);
  });

  it('should handle search with undefined results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // results is undefined
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
