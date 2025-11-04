/**
 * Watchlist Routes Tests - Mocked
 * Tests for error handling and edge cases in watchlist routes
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import watchlistRoutes from '../../src/routes/watchlistRoutes';
import User from '../../src/models/user/User';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

describe('Watchlist Routes - Mocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/watchlist', watchlistRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await WatchlistItem.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== POST / (Add to Watchlist) Tests ====================

  describe('POST /', () => {
    it('should enrich missing poster and overview from TMDB', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/tmdb-poster.jpg',
          overview: 'TMDB overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBe('/tmdb-poster.jpg');
      expect(res.body.data.overview).toBe('TMDB overview');
    });

    /**
     * Coverage: if (!finalPoster) finalPoster = data?.poster_path || undefined
     * Branch: When posterPath not provided and TMDB returns poster_path
     */
    it('should enrich missing poster from TMDB when poster_path exists', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/tmdb-poster.jpg',
          overview: 'TMDB overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // posterPath not provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBe('/tmdb-poster.jpg');
    });

    /**
     * Coverage: if (!finalOverview) finalOverview = data?.overview || undefined
     * Branch: When overview not provided and TMDB returns overview
     */
    it('should enrich missing overview from TMDB when overview exists', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/poster.jpg',
          overview: 'TMDB overview text'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // overview not provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.overview).toBe('TMDB overview text');
    });

    /**
     * Coverage: if (!finalPoster) finalPoster = data?.poster_path || undefined
     * Branch: When posterPath not provided and TMDB returns null/undefined for poster_path
     */
    it('should set poster to undefined when TMDB has no poster_path', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: null,
          overview: 'Some overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // posterPath not provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBeUndefined();
    });

    /**
     * Coverage: if (!finalOverview) finalOverview = data?.overview || undefined
     * Branch: When overview not provided and TMDB returns null/undefined for overview
     */
    it('should set overview to undefined when TMDB has no overview', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/poster.jpg',
          overview: null
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // overview not provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.overview).toBeUndefined();
    });

    /**
     * Coverage: if (!finalPoster) finalPoster = data?.poster_path || undefined
     * Branch: When posterPath IS provided, TMDB enrichment should NOT override it
     */
    it('should not override provided poster with TMDB data', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/tmdb-poster.jpg',
          overview: 'TMDB overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/provided-poster.jpg'
          // overview not provided - WILL be enriched
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBe('/provided-poster.jpg');
      expect(res.body.data.overview).toBe('TMDB overview');
    });

    /**
     * Coverage: if (!finalOverview) finalOverview = data?.overview || undefined
     * Branch: When overview IS provided, TMDB enrichment should NOT override it
     */
    it('should not override provided overview with TMDB data', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/tmdb-poster.jpg',
          overview: 'TMDB overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          overview: 'Provided overview'
          // posterPath not provided - WILL be enriched
        });

      expect(res.status).toBe(201);
      expect(res.body.data.overview).toBe('Provided overview');
      expect(res.body.data.posterPath).toBe('/tmdb-poster.jpg');
    });

    /**
     * Coverage: if (!finalPoster) finalPoster = data?.poster_path || undefined
     * if (!finalOverview) finalOverview = data?.overview || undefined
     * Branch: Both poster AND overview are missing, both enriched from TMDB
     */
    it('should enrich both missing poster and overview from TMDB', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: '/tmdb-poster.jpg',
          overview: 'TMDB overview'
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // Neither posterPath nor overview provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBe('/tmdb-poster.jpg');
      expect(res.body.data.overview).toBe('TMDB overview');
    });

    /**
     * Coverage: if (!finalPoster) finalPoster = data?.poster_path || undefined
     * if (!finalOverview) finalOverview = data?.overview || undefined
     * Branch: Both are missing and TMDB returns nothing for both
     */
    it('should set both to undefined when TMDB has no poster or overview', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: null,
          overview: null
        }
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBeUndefined();
      expect(res.body.data.overview).toBeUndefined();
    });

    /**
     * Coverage: Handling when TMDB data object is empty
     * Branch: data?.poster_path and data?.overview both undefined
     */
    it('should handle empty TMDB response data', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {}
      });

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBeUndefined();
      expect(res.body.data.overview).toBeUndefined();
    });

    /**
     * Coverage: TMDB enrichment fails (catch block), should still save with original values
     */
    it('should save movie even if TMDB enrichment fails', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.movieId).toBe(550);
      expect(res.body.data.title).toBe('Fight Club');
    });
  });
});
