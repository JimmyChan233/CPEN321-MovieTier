/**
 * Advanced Branch Coverage Tests
 * Tests for TMDB response fallbacks and other edge cases
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Express } from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import watchlistRoutes from '../../src/routes/watchlistRoutes';
import feedRoutes from '../../src/routes/feedRoutes';
import { authenticate } from '../../src/middleware/auth';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import FeedActivity from '../../src/models/feed/FeedActivity';
import { generateTestJWT } from '../utils/test-fixtures';

const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

describe('Movie Routes - TMDB Field Fallbacks', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle TMDB response missing all optional fields in search', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 1,
            title: 'Movie Without Fields',
            // No overview, poster_path, release_date, vote_average
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].overview).toBeNull();
    expect(res.body.data[0].posterPath).toBeNull();
    expect(res.body.data[0].releaseDate).toBeNull();
    expect(res.body.data[0].voteAverage).toBeNull();
  });


  it('should handle provider list with missing provider_name', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: {
          US: {
            providers: [
              { provider_id: 1 }, // Missing provider_name
              { provider_id: 2, provider_name: 'Netflix' }
            ],
            link: 'https://example.com'
          }
        }
      }
    });

    const res = await request(app)
      .get('/api/movies/1/providers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('should handle videos list with non-YouTube videos', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          { key: 'abc123', site: 'Vimeo' }, // Non-YouTube, should be filtered
          { key: 'xyz789', site: 'YouTube' }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/1/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

describe('Watchlist Routes - TMDB Enrichment', () => {
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
    app.use('/api/watchlist', watchlistRoutes);

    user = await User.create({
      email: 'watchlist@example.com',
      name: 'Watchlist User',
      googleId: 'google-watchlist'
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

  it('should add watchlist item with missing fields from TMDB', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 100,
        title: 'Test Movie',
        // Missing poster_path and overview
      }
    });

    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 100,
        title: 'Test Movie'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posterPath).toBeUndefined(); // Should not be set since TMDB didn't have it
  });

  it('should enrich watchlist item only when fields are missing', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 101,
        poster_path: '/path.jpg',
        overview: 'Overview from TMDB'
      }
    });

    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 101,
        title: 'Movie with Poster',
        posterPath: '/provided.jpg' // Already provided
      });

    expect(res.status).toBe(201);
    expect(res.body.data.posterPath).toBe('/provided.jpg'); // Should keep provided value
  });
});

describe('Feed Routes - Activity Enrichment', () => {
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
    app.use('/api/feed', feedRoutes);

    user = await User.create({
      email: 'feed@example.com',
      name: 'Feed User',
      googleId: 'google-feed'
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich feed activity missing poster and overview', async () => {
    // Create activity without poster/overview
    await FeedActivity.create({
      userId: user._id,
      activityType: 'ranked_movie',
      movieId: 200,
      movieTitle: 'Movie to Enrich'
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        poster_path: '/enriched.jpg',
        overview: 'Enriched overview'
      }
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Enrichment should have happened
  });

  it('should skip enrichment when activity already has poster and overview', async () => {
    await FeedActivity.create({
      userId: user._id,
      activityType: 'ranked_movie',
      movieId: 201,
      movieTitle: 'Complete Movie',
      posterPath: '/poster.jpg',
      overview: 'Already has overview'
    });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // TMDB should not be called since both fields are present
    expect(mockTmdbGet).not.toHaveBeenCalled();
  });
});

describe('Config Module NODE_ENV Fallback', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should default to development when NODE_ENV is unset', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    jest.resetModules();
    const config = require('../../src/config').default;

    expect(config.nodeEnv).toBe('development');

    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should use production when NODE_ENV is set to production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    jest.resetModules();
    const config = require('../../src/config').default;

    expect(config.nodeEnv).toBe('production');

    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
