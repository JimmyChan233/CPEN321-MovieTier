/**
 * Tests for the remaining 5.4% uncovered branches
 * Targeting specific edge cases that are hard to reach
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Express } from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import { authenticate } from '../../src/middleware/auth';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT } from '../utils/test-fixtures';
import { Friendship } from '../../src/models/friend/Friend';

const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

jest.mock('../../src/services/sse/sseService', () => ({
  sseService: {
    send: jest.fn()
  }
}));

jest.mock('../../src/services/notification.service', () => ({
  __esModule: true,
  default: {
    sendFeedNotification: jest.fn()
  }
}));

import notificationService from '../../src/services/notification.service';

describe('Remaining 5.4% Branch Coverage - User Name Fallback', () => {
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

    // Create user WITH a name
    user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123'
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
    jest.clearAllMocks();
  });

  it('should handle movieComparisionController addMovie when user has no name property', async () => {
    // Mock User.findById to return a user document without name
    jest.spyOn(User, 'findById').mockImplementationOnce(function(this: any) {
      return {
        select: jest.fn().mockResolvedValueOnce({
          _id: user._id,
          // name is undefined
        })
      } as any;
    });

    // Mock Friendship.find to return empty
    jest.spyOn(Friendship, 'find').mockResolvedValueOnce([]);

    // Mock TMDB
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        poster_path: '/test.jpg',
        overview: 'Test overview'
      }
    });

    const res = await request(app)
      .post('/api/movies/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 100,
        title: 'Test Movie',
        posterPath: '/poster.jpg'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    jest.restoreAllMocks();
  });
});

describe('Remaining 5.4% Branch Coverage - Config Module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should handle NODE_ENV being explicitly set to staging', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'staging';

    jest.resetModules();
    const config = require('../../src/config').default;

    expect(config.nodeEnv).toBe('staging');

    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe('Remaining 5.4% Branch Coverage - TMDB Client Interceptors', () => {
  it('should create TMDB client successfully', () => {
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    const client = getTmdbClient();
    expect(client).toBeDefined();
  });

  it('should handle TMDB client with both API keys undefined', () => {
    const originalApiKey = process.env.TMDB_API_KEY;
    const originalKey = process.env.TMDB_KEY;

    delete process.env.TMDB_API_KEY;
    delete process.env.TMDB_KEY;

    jest.resetModules();
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    const client = getTmdbClient();

    expect(client).toBeDefined();

    if (originalApiKey) process.env.TMDB_API_KEY = originalApiKey;
    if (originalKey) process.env.TMDB_KEY = originalKey;
  });
});

describe('Remaining 5.4% Branch Coverage - Movie Routes Edge Cases', () => {
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
      email: 'search@example.com',
      name: 'Search User',
      googleId: 'google-search'
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

  it('should handle search when NO cast results from TMDB', async () => {
    mockTmdbGet
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 1,
              title: 'Movie Without Cast'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          cast: [] // Empty cast array
        }
      });

    const res = await request(app)
      .get('/api/movies/search?query=test&includeCast=true')
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

  it('should handle search when NO results returned at all', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: null
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=xyznotexist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
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

  it('should skip cast enrichment when baseResults is empty', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: []
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=test&includeCast=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    // TMDB should only be called once (for search, not for cast since no results)
    expect(mockTmdbGet).toHaveBeenCalledTimes(1);
  });

  it('should skip cast enrichment when includeCast is false', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 3,
            title: 'Movie'
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=test&includeCast=false')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockTmdbGet).toHaveBeenCalledTimes(1); // Only search, no cast fetch
  });

  it('should handle search when includeCast param is missing', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 4,
            title: 'Movie'
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockTmdbGet).toHaveBeenCalledTimes(1); // Only search
  });
});
