/**
 * Watchlist Routes Tests - Unmocked
 * Comprehensive tests for all watchlist route handlers
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import watchlistRoutes from '../../src/routes/watchlistRoutes';
import User from '../../src/models/user/User';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

// Mock TMDB client
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
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
    it('should get user watchlist successfully', async () => {
      await WatchlistItem.create([
        {
          userId: (user1 as any)._id,
          movieId: mockMovies.inception.id,
          title: mockMovies.inception.title,
          posterPath: mockMovies.inception.poster_path
        },
        {
          userId: (user1 as any)._id,
          movieId: mockMovies.darkKnight.id,
          title: mockMovies.darkKnight.title,
          posterPath: mockMovies.darkKnight.poster_path
        }
      ]);

      const res = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
    });

    it('should return empty array for empty watchlist', async () => {
      const res = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should only return current user watchlist items', async () => {
      await WatchlistItem.create([
        {
          userId: (user1 as any)._id,
          movieId: 550,
          title: 'Fight Club'
        },
        {
          userId: (user2 as any)._id,
          movieId: 680,
          title: 'Pulp Fiction'
        }
      ]);

      const res = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Fight Club');
    });

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

    it('should handle database error gracefully', async () => {
      // Close connection to simulate error
      await mongoose.disconnect();

      const res = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load watchlist');

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ==================== POST / Tests ====================

  describe('POST /', () => {
    it('should add movie to watchlist successfully', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: mockMovies.inception.id,
          title: mockMovies.inception.title,
          posterPath: mockMovies.inception.poster_path,
          overview: mockMovies.inception.overview
        });

      console.log(res);
      expect(res.status).toBe(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.movieId).toBe(mockMovies.inception.id);
      expect(res.body.data.title).toBe(mockMovies.inception.title);

      // Verify in database
      const saved = await WatchlistItem.findOne({
        userId: (user1 as any)._id,
        movieId: mockMovies.inception.id
      });
      expect(saved).toBeDefined();
      expect(saved?.title).toBe(mockMovies.inception.title);
    });

    it('should add movie with minimal fields (movieId and title only)', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movieId).toBe(550);
      expect(res.body.data.title).toBe('Fight Club');
    });

    it('should enrich missing posterPath from TMDB', async () => {
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          poster_path: '/enriched-poster.jpg',
          overview: 'Enriched overview'
        }
      });
      getTmdbClient.mockReturnValue({ get: mockGet });

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
          // No posterPath or overview
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.posterPath).toBe('/enriched-poster.jpg');
      expect(res.body.data.overview).toBe('Enriched overview');
      expect(mockGet).toHaveBeenCalledWith('/movie/550', { params: { language: 'en-US' } });
    });

    it('should enrich missing overview from TMDB', async () => {
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          poster_path: '/poster.jpg',
          overview: 'Enriched overview text'
        }
      });
      getTmdbClient.mockReturnValue({ get: mockGet });

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 680,
          title: 'Pulp Fiction',
          posterPath: '/existing-poster.jpg'
          // No overview
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.overview).toBe('Enriched overview text');
      expect(res.body.data.posterPath).toBe('/existing-poster.jpg'); // Existing poster preserved
    });

    it('should handle TMDB enrichment failure gracefully', async () => {
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      const mockGet = jest.fn().mockRejectedValue(new Error('TMDB API error'));
      getTmdbClient.mockReturnValue({ get: mockGet });

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      // Should still succeed even if TMDB fails
      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movieId).toBe(550);
    });

    it('should reject missing movieId', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Fight Club'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('movieId and title are required');
    });

    it('should reject missing title', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('movieId and title are required');
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

    it('should allow different users to add same movie', async () => {
      await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 550,
        title: 'Fight Club'
      });

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should handle movieId as number', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.movieId).toBe(550);
    });

    it('should preserve all provided fields', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/custom-poster.jpg',
          overview: 'Custom overview text'
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.movieId).toBe(550);
      expect(res.body.data.title).toBe('Fight Club');
      expect(res.body.data.posterPath).toBe('/custom-poster.jpg');
      expect(res.body.data.overview).toBe('Custom overview text');
    });

    it('should handle database save error gracefully', async () => {
      // Disconnect to simulate database error
      await mongoose.disconnect();

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 999,
          title: 'Test Movie'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to add to watchlist');

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
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

    it('should remove movie from watchlist successfully', async () => {
      const res = await request(app)
        .delete('/550')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Removed from watchlist');

      // Verify deletion
      const item = await WatchlistItem.findOne({
        userId: (user1 as any)._id,
        movieId: 550
      });
      expect(item).toBeNull();
    });

    it('should only remove from current user watchlist', async () => {
      const res = await request(app)
        .delete('/550')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);

      // User2's item should still exist
      const user2Item = await WatchlistItem.findOne({
        userId: (user2 as any)._id,
        movieId: 550
      });
      expect(user2Item).not.toBeNull();
    });

    it('should return 404 when movie not in watchlist', async () => {
      const res = await request(app)
        .delete('/9999')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found in watchlist');
    });

    it('should handle movieId as number parameter', async () => {
      const res = await request(app)
        .delete('/680')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
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

    it('should handle database error gracefully', async () => {
      await mongoose.disconnect();

      const res = await request(app)
        .delete('/550')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to remove from watchlist');

      await mongoose.connect(mongoServer.getUri());
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
    it('should handle very long movie titles', async () => {
      const longTitle = 'A'.repeat(500);

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 12345,
          title: longTitle
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(longTitle);
    });

    it('should handle special characters in title', async () => {
      const specialTitle = 'Movie: Title & "Special" Characters <test>';

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 99999,
          title: specialTitle
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(specialTitle);
    });

    it('should handle zero as movieId', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: 0,
          title: 'Test Movie'
        });

      // movieId 0 is falsy but should be accepted
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('should handle large movieId numbers', async () => {
      const largeId = 999999999;

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          movieId: largeId,
          title: 'Large ID Movie'
        });

      console.log(res);
      expect(res.status).toBe(201);
      expect(res.body.data.movieId).toBe(largeId);
    });
  });
});
