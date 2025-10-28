/**
 * Movie Routes Tests - Mocked
 * Comprehensive tests for movie routes with mocked TMDB responses
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import FeedActivity from '../../src/models/feed/FeedActivity';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

// Mock SSE service
jest.mock('../../src/services/sse/sseService', () => ({
  sseService: {
    send: jest.fn()
  }
}));

// Mock controllers
jest.mock('../../src/controllers/movieComparisionController', () => ({
  addMovie: jest.fn((req, res) => res.json({ success: true })),
  compareMovies: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../src/controllers/rerankController', () => ({
  startRerank: jest.fn((req, res) => res.json({ success: true }))
}));

describe('Movie Routes - Mocked Tests', () => {
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

    process.env.TMDB_API_KEY = 'test-api-key';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RankedMovie.deleteMany({});
    await FeedActivity.deleteMany({});
    await Friendship.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET /search Tests ====================

  describe('GET /search', () => {
    it('should search movies successfully', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550,
              title: 'Fight Club',
              overview: 'An insomniac office worker...',
              poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
              release_date: '1999-10-15',
              vote_average: 8.4
            }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/search?query=Fight Club')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(550);
      expect(res.body.data[0].title).toBe('Fight Club');
    });

    it('should reject query shorter than 2 characters', async () => {
      const res = await request(app)
        .get('/api/movies/search?query=a')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 2 characters');
    });

    it('should search with includeCast parameter', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550,
              title: 'Fight Club',
              overview: 'Overview',
              poster_path: '/poster.jpg',
              release_date: '1999-10-15',
              vote_average: 8.4
            }
          ]
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          cast: [
            { name: 'Brad Pitt' },
            { name: 'Edward Norton' },
            { name: 'Helena Bonham Carter' }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/search?query=Fight&includeCast=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].cast).toEqual(['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter']);
    });

    it('should handle Chinese characters and fallback to zh-CN', async () => {
      // First search returns empty
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      // zh-CN search returns results
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 5959,
              title: '卧虎藏龙',
              overview: 'Chinese overview',
              poster_path: '/poster.jpg',
              release_date: '2000-07-06',
              vote_average: 7.9
            }
          ]
        }
      });

      // English details fetch
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          id: 5959,
          title: 'Crouching Tiger, Hidden Dragon',
          overview: 'English overview',
          poster_path: '/poster_en.jpg',
          release_date: '2000-07-06',
          vote_average: 7.9
        }
      });

      const res = await request(app)
        .get('/api/movies/search?query=卧虎藏龙')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Crouching Tiger, Hidden Dragon');
    });

    it('should handle CJK search when detail fetch fails', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 123,
            title: '测试',
            overview: 'test',
            poster_path: '/test.jpg',
            release_date: '2020-01-01',
            vote_average: 7.0
          }]
        }
      });

      // Detail fetch fails
      mockTmdbGet.mockRejectedValueOnce(new Error('API error'));

      const res = await request(app)
        .get('/api/movies/search?query=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('测试');
    });

    it('should handle empty results', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/movies/search?query=NonExistentMovie123')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle TMDB API errors', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/movies/search?query=Test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ==================== GET /ranked Tests ====================

  describe('GET /ranked', () => {
    it('should get ranked movies', async () => {
      await RankedMovie.create([
        {
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg',
          rank: 1
        },
        {
          userId: (user as any)._id,
          movieId: 680,
          title: 'Pulp Fiction',
          posterPath: '/poster2.jpg',
          rank: 2
        }
      ]);

      const res = await request(app)
        .get('/api/movies/ranked')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].rank).toBe(1);
      expect(res.body.data[0].movie.title).toBe('Fight Club');
    });

    it('should return empty array when no ranked movies', async () => {
      const res = await request(app)
        .get('/api/movies/ranked')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ==================== POST /rank Tests ====================

  describe('POST /rank', () => {
    it('should rank movie successfully', async () => {
      const res = await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg',
          overview: 'An insomniac office worker...'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rank).toBe(1);
      expect(res.body.data.movie.title).toBe('Fight Club');

      // Verify database
      const saved = await RankedMovie.findOne({ userId: (user as any)._id });
      expect(saved?.movieId).toBe(550);
    });

    it('should enrich missing overview and poster from TMDB', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          overview: 'Enriched overview',
          poster_path: '/enriched.jpg'
        }
      });

      const res = await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.movie.overview).toBe('Enriched overview');
      expect(res.body.data.movie.posterPath).toBe('/enriched.jpg');
    });

    it('should create feed activity when ranking', async () => {
      await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg'
        });

      const activity = await FeedActivity.findOne({ userId: (user as any)._id });
      expect(activity).toBeDefined();
      expect(activity?.activityType).toBe('ranked_movie');
      expect(activity?.movieId).toBe(550);
    });

    it('should handle TMDB enrichment failure gracefully', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB error'));

      const res = await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== DELETE /ranked/:id Tests ====================

  describe('DELETE /ranked/:id', () => {
    it('should delete ranked movie and resequence ranks', async () => {
      const movie1 = await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 550,
        title: 'Fight Club',
        rank: 1
      });

      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 680,
        title: 'Pulp Fiction',
        rank: 2
      });

      const res = await request(app)
        .delete(`/api/movies/ranked/${movie1._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const deleted = await RankedMovie.findById(movie1._id);
      expect(deleted).toBeNull();

      // Verify rank resequencing
      const remaining = await RankedMovie.findOne({ movieId: 680 });
      expect(remaining?.rank).toBe(1);
    });

    it('should reject invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/movies/ranked/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid id');
    });

    it('should return 404 for non-existent movie', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/movies/ranked/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should delete related feed activities', async () => {
      const movie = await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 550,
        title: 'Fight Club',
        rank: 1
      });

      await FeedActivity.create({
        userId: (user as any)._id,
        activityType: 'ranked_movie',
        movieId: 550,
        movieTitle: 'Fight Club'
      });

      await request(app)
        .delete(`/api/movies/ranked/${movie._id}`)
        .set('Authorization', `Bearer ${token}`);

      const activities = await FeedActivity.find({ movieId: 550 });
      expect(activities).toHaveLength(0);
    });
  });

  // ==================== GET /:movieId/providers Tests ====================

  describe('GET /:movieId/providers', () => {
    it('should get watch providers successfully', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: {
            CA: {
              link: 'https://themoviedb.org/movie/550/watch?locale=CA',
              flatrate: [{ provider_name: 'Netflix' }],
              rent: [{ provider_name: 'Apple TV' }],
              buy: [{ provider_name: 'Amazon' }]
            }
          }
        }
      });

      const res = await request(app)
        .get('/api/movies/550/providers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.link).toBeDefined();
      expect(res.body.data.providers.flatrate).toContain('Netflix');
      expect(res.body.data.providers.rent).toContain('Apple TV');
    });

    it('should use fallback link when no provider link', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: {
            CA: {}
          }
        }
      });

      const res = await request(app)
        .get('/api/movies/550/providers?country=CA')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.link).toContain('themoviedb.org/movie/550/watch');
    });

    it('should reject invalid movie ID', async () => {
      const res = await request(app)
        .get('/api/movies/invalid/providers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid movie id');
    });
  });

  // ==================== GET /:movieId/details Tests ====================

  describe('GET /:movieId/details', () => {
    it('should get movie details with cast', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          id: 550,
          title: 'Fight Club',
          overview: 'An insomniac office worker...',
          poster_path: '/poster.jpg',
          release_date: '1999-10-15',
          vote_average: 8.4
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          cast: [
            { name: 'Brad Pitt' },
            { name: 'Edward Norton' },
            { name: 'Helena Bonham Carter' },
            { name: 'Meat Loaf' },
            { name: 'Jared Leto' }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/550/details')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Fight Club');
      expect(res.body.data.cast).toHaveLength(5);
      expect(res.body.data.cast).toContain('Brad Pitt');
    });

    it('should reject invalid movie ID', async () => {
      const res = await request(app)
        .get('/api/movies/invalid/details')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid movie id');
    });
  });

  // ==================== GET /:movieId/videos Tests ====================

  describe('GET /:movieId/videos', () => {
    it('should get official trailer', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              key: 'abc123',
              name: 'Official Trailer',
              type: 'Trailer',
              site: 'YouTube',
              official: true
            },
            {
              key: 'def456',
              name: 'Teaser',
              type: 'Teaser',
              site: 'YouTube',
              official: false
            }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('abc123');
      expect(res.body.data.type).toBe('Trailer');
    });

    it('should fallback to non-official trailer', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              key: 'def456',
              name: 'Trailer',
              type: 'Trailer',
              site: 'YouTube',
              official: false
            }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('def456');
    });

    it('should return null when no videos available', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('should reject invalid movie ID', async () => {
      const res = await request(app)
        .get('/api/movies/invalid/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid movie id');
    });
  });
});
