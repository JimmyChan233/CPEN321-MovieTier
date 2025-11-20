/**
 * @unmocked Integration tests for watchlist operations
 * Tests with real MongoDB database
 */

/**
 * Watchlist Routes Tests - Unmocked
 * Comprehensive tests for all watchlist route handlers
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import watchlistRoutes from '../../../src/routes/watchlistRoutes';
import User from '../../../src/models/user/User';
import WatchlistItem from '../../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers, mockMovies } from '../../utils/test-fixtures';

// Mock TMDB client
jest.mock('../../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      data: {
        poster_path: '/mocked-poster.jpg',
        overview: 'Mocked overview from TMDB'
      }
    })
  }))
}));

describe('Watchlist Routes - Unmocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', watchlistRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await WatchlistItem.deleteMany({});

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      email: 'user2@example.com',
      name: 'User Two',
      googleId: 'google-user2'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  // ==================== GET / Tests ====================

  describe('GET /', () => {



    it('should sort watchlist by createdAt descending', async () => {
      const item1 = await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 550,
        title: 'Fight Club',
        createdAt: new Date('2024-01-01')
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const item2 = await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 680,
        title: 'Pulp Fiction',
        createdAt: new Date('2024-01-02')
      });

      const res = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      // Most recent first
      expect(res.body.data[0].movieId).toBe(680);
      expect(res.body.data[1].movieId).toBe(550);
    });

  });

  // ==================== POST / Tests ====================

  describe('POST /', () => {


    describe('TMDB Enrichment', () => {
      const enrichmentTests = [
        {
          name: 'should enrich missing posterPath from TMDB',
          request: { movieId: 550, title: 'Fight Club' },
          mockResponse: {
            data: { poster_path: '/enriched-poster.jpg', overview: 'Enriched overview' }
          },
          expectations: {
            posterPath: '/enriched-poster.jpg',
            overview: 'Enriched overview'
          }
        },
        {
          name: 'should enrich missing overview from TMDB',
          request: { movieId: 680, title: 'Pulp Fiction', posterPath: '/existing-poster.jpg' },
          mockResponse: {
            data: { poster_path: '/poster.jpg', overview: 'Enriched overview text' }
          },
          expectations: {
            posterPath: '/existing-poster.jpg',
            overview: 'Enriched overview text'
          }
        },
        {
          name: 'should handle TMDB enrichment failure gracefully',
          request: { movieId: 550, title: 'Fight Club' },
          mockError: new Error('TMDB API error'),
          expectations: {
            status: 201,
            success: true,
            movieId: 550
          }
        }
      ];

      enrichmentTests.forEach(test => {
        it(test.name, async () => {
          const { getTmdbClient } = require('../../../src/services/tmdb/tmdbClient');
          if (test.mockError) {
            const mockGet = jest.fn().mockRejectedValue(test.mockError);
            getTmdbClient.mockReturnValue({ get: mockGet });
          } else {
            const mockGet = jest.fn().mockResolvedValue(test.mockResponse);
            getTmdbClient.mockReturnValue({ get: mockGet });
          }

          const res = await request(app)
            .post('/')
            .set('Authorization', `Bearer ${token1}`)
            .send(test.request);

          console.log(res);
          expect(res.status).toBe(201);
          if (!test.mockError) {
            expect(res.body.data.posterPath).toBe(test.expectations.posterPath);
            expect(res.body.data.overview).toBe(test.expectations.overview);
          } else {
            expect(res.body.success).toBe(test.expectations.success);
            expect(res.body.data.movieId).toBe(test.expectations.movieId);
          }
        });
      });
    });

    describe('Validation', () => {
      const validationTests = [
        {
          name: 'should reject missing movieId',
          request: { title: 'Fight Club' }
        },
        {
          name: 'should reject missing title',
          request: { movieId: 550 }
        }
      ];

      validationTests.forEach(test => {
        it(test.name, async () => {
          const res = await request(app)
            .post('/')
            .set('Authorization', `Bearer ${token1}`)
            .send(test.request);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('movieId and title are required');
        });
      });
    });

    it('should reject duplicate movie', async () => {
      await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 550,
        title: 'Fight Club'
      });

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already in watchlist');
    });




  });

  // ==================== DELETE /:movieId Tests ====================

  describe('DELETE /:movieId', () => {
    beforeEach(async () => {
      await WatchlistItem.create([
        {
          userId: (user1 as any)._id,
          movieId: 550,
          title: 'Fight Club'
        },
        {
          userId: (user1 as any)._id,
          movieId: 680,
          title: 'Pulp Fiction'
        },
        {
          userId: (user2 as any)._id,
          movieId: 550,
          title: 'Fight Club'
        }
      ]);
    });



    it('should return 404 when movie not in watchlist', async () => {
      const res = await request(app)
        .delete('/9999')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found in watchlist');
    });


    it('should handle invalid movieId format gracefully', async () => {
      const res = await request(app)
        .delete('/invalid')
        .set('Authorization', `Bearer ${token1}`);

      // Invalid movieId format returns 400 Bad Request
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid movie id');
    });


    it('should not affect other watchlist items', async () => {
      await request(app)
        .delete('/550')
        .set('Authorization', `Bearer ${token1}`);

      const remaining = await WatchlistItem.find({ userId: (user1 as any)._id });
      expect(remaining.length).toBe(1);
      expect(remaining[0].movieId).toBe(680);
    });
  });

  // ==================== Edge Cases and Error Handling ====================

  describe('Edge Cases', () => {



  });
});
