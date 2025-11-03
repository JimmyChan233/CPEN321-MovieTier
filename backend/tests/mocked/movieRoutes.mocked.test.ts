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

import { sseService } from '../../src/services/sse/sseService';

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
  const originalTmdbKey = process.env.TMDB_API_KEY;

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
    // Restore original key
    if (originalTmdbKey) {
      process.env.TMDB_API_KEY = originalTmdbKey;
    } else {
      delete process.env.TMDB_API_KEY;
    }
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

  afterEach(() => {
    // Always restore TMDB_API_KEY after each test
    if (originalTmdbKey) {
      process.env.TMDB_API_KEY = originalTmdbKey;
    } else {
      delete process.env.TMDB_API_KEY;
    }
    // Clear any TMDB_KEY as well
    delete process.env.TMDB_KEY;
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

    it('should reject when no query is provided', async () => {
      const res = await request(app)
        .get('/api/movies/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Query must be at least 2 characters');
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

    it('should handle CJK search when zh-CN search fails', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      // zh-CN search fails
      mockTmdbGet.mockRejectedValueOnce(new Error('API error'));

      const res = await request(app)
        .get('/api/movies/search?query=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
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

    it('should return 500 when TMDB API key not configured', async () => {
      delete process.env.TMDB_API_KEY;
      delete process.env.TMDB_KEY;

      const res = await request(app)
        .get('/api/movies/search?query=Test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('TMDB API key not configured');
    }, 10000);

    it('should handle cast enrichment API failure', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 550,
            title: 'Fight Club',
            overview: 'Overview',
            poster_path: '/poster.jpg',
            release_date: '1999-10-15',
            vote_average: 8.4
          }]
        }
      });

      // Cast fetch fails
      mockTmdbGet.mockRejectedValueOnce(new Error('Cast API failed'));

      const res = await request(app)
        .get('/api/movies/search?query=Fight&includeCast=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].cast).toEqual([]);
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

    it('should handle database error gracefully', async () => {
      // Force a database error by using an invalid query
      jest.spyOn(RankedMovie, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/movies/ranked')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load rankings');
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

    it('should handle watchlist deletion error gracefully', async () => {
      const WatchlistItem = (await import('../../src/models/watch/WatchlistItem')).default;
      jest.spyOn(WatchlistItem, 'deleteOne').mockRejectedValue(new Error('DB error'));

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

    it('should notify friends via SSE when ranking', async () => {
      // Create a friendship
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        displayName: 'Test Friend',
        name: 'Test Friend'
      });

      await Friendship.create({
        userId: (user as any)._id,
        friendId: (friend as any)._id
      });

      const sendSpy = jest.spyOn(sseService, 'send');

      await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg'
        });

      expect(sendSpy).toHaveBeenCalledWith(
        String((friend as any)._id),
        'feed_activity',
        expect.objectContaining({
          activityId: expect.anything()
        })
      );
    });

    it('should handle database error gracefully', async () => {
      // Force a database error
      jest.spyOn(RankedMovie.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 550,
          title: 'Fight Club'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to rank movie');
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

    it('should handle database error gracefully', async () => {
      const movie = await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 550,
        title: 'Fight Club',
        rank: 1
      });

      // Force a database error
      jest.spyOn(RankedMovie, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .delete(`/api/movies/ranked/${movie._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to remove from rankings');
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

    it('should return 500 when TMDB API key not configured', async () => {
      delete process.env.TMDB_API_KEY;
      delete process.env.TMDB_KEY;

      const res = await request(app)
        .get('/api/movies/550/providers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('TMDB API key not configured');
    }, 10000);

    it('should handle TMDB API error gracefully', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/movies/550/providers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Unable to load watch providers');
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

    it('should return 500 when TMDB API key not configured', async () => {
      delete process.env.TMDB_API_KEY;
      delete process.env.TMDB_KEY;

      const res = await request(app)
        .get('/api/movies/550/details')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('TMDB API key not configured');
    }, 10000);

    it('should handle TMDB API error gracefully', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/movies/550/details')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Unable to load movie details');
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

    it('should fallback to teaser when no trailer available', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            { key: 'xyz789', name: 'Teaser 1', type: 'Teaser', site: 'YouTube', official: false }
          ]
        }
      });

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('xyz789');
      expect(res.body.data.type).toBe('Teaser');
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

    it('should return 500 when TMDB API key not configured', async () => {
      delete process.env.TMDB_API_KEY;
      delete process.env.TMDB_KEY;

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('TMDB API key not configured');
    }, 10000);

    it('should handle TMDB API error gracefully', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/movies/550/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Unable to load movie videos');
    });
  });
  describe('GET /search - Branch coverage', () => {
  it('should handle missing optional fields in search results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 550,
            title: 'Fight Club'
            // Missing: overview, poster_path, release_date, vote_average
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=Fight')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].overview).toBeNull();
    expect(res.body.data[0].posterPath).toBeNull();
    expect(res.body.data[0].releaseDate).toBeNull();
    expect(res.body.data[0].voteAverage).toBeNull();
  });

  it('should handle missing zh results data structure', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: { results: [] }
    });

    // zh-CN search returns malformed data
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: null // Not an array
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=测试')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should handle CJK search with missing optional fields in zh results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: { results: [] }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [{
          id: 123,
          title: '测试'
          // Missing optional fields
        }]
      }
    });

    // Detail fetch returns data with missing fields
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 123
        // Missing: title, overview, poster_path, etc.
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=测试')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].title).toBe('测试'); // Falls back to zh title
  });

  it('should handle CJK search detail fetch with all optional fields missing', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: { results: [] }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [{
          id: 123,
          title: '测试'
          // No optional fields
        }]
      }
    });

    // Detail fetch returns minimal data
    mockTmdbGet.mockResolvedValueOnce({
      data: {} // Empty object
    });

    const res = await request(app)
      .get('/api/movies/search?query=测试')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].overview).toBeNull();
    expect(res.body.data[0].posterPath).toBeNull();
    expect(res.body.data[0].releaseDate).toBeNull();
    expect(res.body.data[0].voteAverage).toBeNull();
  });

  it('should handle undefined data.results in search', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // results is undefined
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=Test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /:movieId/details - Branch coverage', () => {
  it('should handle missing optional fields in movie details', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 550,
        title: 'Fight Club'
        // Missing: overview, poster_path, release_date, vote_average
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        cast: [
          { name: 'Brad Pitt' },
          { name: 'Edward Norton' }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/550/details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overview).toBeNull();
    expect(res.body.data.posterPath).toBeNull();
    expect(res.body.data.releaseDate).toBeNull();
    expect(res.body.data.voteAverage).toBeNull();
  });

  it('should handle undefined detailsResp.data', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      // data is undefined
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        cast: []
      }
    });

    const res = await request(app)
      .get('/api/movies/550/details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBeUndefined();
  });

  it('should handle non-array cast data', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 550,
        title: 'Fight Club'
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        cast: null // Not an array
      }
    });

    const res = await request(app)
      .get('/api/movies/550/details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cast).toEqual([]);
  });

  it('should handle undefined creditsResp.data', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 550,
        title: 'Fight Club'
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      // data is undefined
    });

    const res = await request(app)
      .get('/api/movies/550/details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cast).toEqual([]);
  });

  it('should filter out cast members without names', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 550,
        title: 'Fight Club'
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        cast: [
          { name: 'Brad Pitt' },
          {}, // No name property
          { name: null }, // Null name
          { name: '' }, // Empty name
          { name: 'Edward Norton' }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/550/details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cast).toEqual(['Brad Pitt', 'Edward Norton']);
  });
});
describe('POST /rank - Branch coverage', () => {
  it('should use TMDB_KEY as fallback when TMDB_API_KEY not set', async () => {
    const originalApiKey = process.env.TMDB_API_KEY;
    const originalKey = process.env.TMDB_KEY;
    
    delete process.env.TMDB_API_KEY;
    process.env.TMDB_KEY = 'fallback-key';

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

    process.env.TMDB_API_KEY = originalApiKey;
    process.env.TMDB_KEY = originalKey;
  });

  it('should not enrich when overview exists but poster missing', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        overview: 'From TMDB',
        poster_path: '/from_tmdb.jpg'
      }
    });

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 550,
        title: 'Fight Club',
        overview: 'Provided overview'
        // posterPath missing
      });

    expect(res.status).toBe(200);
    expect(res.body.data.movie.overview).toBe('Provided overview');
    expect(res.body.data.movie.posterPath).toBe('/from_tmdb.jpg');
  });

  it('should not enrich when poster exists but overview missing', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        overview: 'From TMDB',
        poster_path: '/from_tmdb.jpg'
      }
    });

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 550,
        title: 'Fight Club',
        posterPath: '/provided.jpg'
        // overview missing
      });

    expect(res.status).toBe(200);
    expect(res.body.data.movie.posterPath).toBe('/provided.jpg');
    expect(res.body.data.movie.overview).toBe('From TMDB');
  });

  it('should handle TMDB returning undefined for optional fields', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // overview and poster_path are undefined
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
  });

  it('should skip TMDB enrichment when both overview and poster provided', async () => {
    const tmdbSpy = mockTmdbGet;

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 550,
        title: 'Fight Club',
        overview: 'Provided overview',
        posterPath: '/provided.jpg'
      });

    expect(res.status).toBe(200);
    // TMDB should not be called since both are provided
    expect(tmdbSpy).not.toHaveBeenCalled();
  });

  it('should skip TMDB enrichment when no API key available', async () => {
    const originalApiKey = process.env.TMDB_API_KEY;
    const originalKey = process.env.TMDB_KEY;
    
    delete process.env.TMDB_API_KEY;
    delete process.env.TMDB_KEY;

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 550,
        title: 'Fight Club'
      });

    expect(res.status).toBe(200);

    process.env.TMDB_API_KEY = originalApiKey;
    process.env.TMDB_KEY = originalKey;
  });
});

describe('GET /:movieId/providers - Branch coverage', () => {
  it('should handle missing country data in results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: {
          US: {
            link: 'https://example.com',
            flatrate: [{ provider_name: 'Netflix' }]
          }
          // CA is missing
        }
      }
    });

    const res = await request(app)
      .get('/api/movies/550/providers?country=CA')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.link).toContain('themoviedb.org/movie/550/watch');
    expect(res.body.data.providers.flatrate).toEqual([]);
  });

  it('should handle undefined data.results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // results is undefined
      }
    });

    const res = await request(app)
      .get('/api/movies/550/providers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.link).toContain('themoviedb.org');
  });

  it('should handle null data.results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: null
      }
    });

    const res = await request(app)
      .get('/api/movies/550/providers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.link).toContain('themoviedb.org');
  });
});

describe('GET /:movieId/videos - Branch coverage', () => {
  it('should handle non-array video results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: null // Not an array
      }
    });

    const res = await request(app)
      .get('/api/movies/550/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('should handle undefined data.results', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // results is undefined
      }
    });

    const res = await request(app)
      .get('/api/movies/550/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('should fallback to first YouTube video when no trailer or teaser', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            key: 'behind123',
            name: 'Behind the Scenes',
            type: 'Behind the Scenes',
            site: 'YouTube'
          },
          {
            key: 'clip456',
            name: 'Clip',
            type: 'Clip',
            site: 'YouTube'
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/550/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('behind123'); // First YouTube video
  });

  it('should filter out non-YouTube videos', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            key: 'vimeo123',
            name: 'Trailer',
            type: 'Trailer',
            site: 'Vimeo'
          },
          {
            key: 'yt456',
            name: 'Teaser',
            type: 'Teaser',
            site: 'YouTube'
          }
        ]
      }
    });

    const res = await request(app)
      .get('/api/movies/550/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('yt456'); // Should skip Vimeo
  });
});

describe('GET /search - Additional branch coverage', () => {
it('should handle cast array with undefined/null names when filtering', async () => {
  mockTmdbGet.mockResolvedValueOnce({
    data: {
      results: [{
        id: 550,
        title: 'Fight Club',
        overview: 'Overview',
        poster_path: '/poster.jpg',
        release_date: '1999-10-15',
        vote_average: 8.4
      }]
    }
  });

  mockTmdbGet.mockResolvedValueOnce({
    data: {
      cast: [
        { name: 'Brad Pitt' },
        { name: 'Edward Norton' },
        { name: 'Helena Bonham Carter' },
        { name: undefined }, // This will be after the slice
        { name: null }
      ]
    }
  });

  const res = await request(app)
    .get('/api/movies/search?query=Fight&includeCast=true')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  // Should have 3 valid names (first 3 are valid, slice happens before filter)
  expect(res.body.data[0].cast).toEqual(['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter']);
});

it('should filter out invalid names within first 3 cast members', async () => {
  mockTmdbGet.mockResolvedValueOnce({
    data: {
      results: [{
        id: 550,
        title: 'Fight Club',
        overview: 'Overview',
        poster_path: '/poster.jpg',
        release_date: '1999-10-15',
        vote_average: 8.4
      }]
    }
  });

  mockTmdbGet.mockResolvedValueOnce({
    data: {
      cast: [
        { name: 'Brad Pitt' },
        { name: undefined }, // Within first 3, will be filtered
        { name: 'Edward Norton' },
        { name: 'Helena Bonham Carter' }, // After first 3, won't be included
        { name: null }
      ]
    }
  });

  const res = await request(app)
    .get('/api/movies/search?query=Fight&includeCast=true')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  // slice(0,3) gets first 3, then filter removes undefined -> ['Brad Pitt', 'Edward Norton']
  expect(res.body.data[0].cast).toEqual(['Brad Pitt', 'Edward Norton']);
});

  it('should handle non-array credits.cast', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [{
          id: 550,
          title: 'Fight Club',
          overview: 'Overview',
          poster_path: '/poster.jpg',
          release_date: '1999-10-15',
          vote_average: 8.4
        }]
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        cast: null // Not an array
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=Fight&includeCast=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].cast).toEqual([]);
  });

  it('should handle undefined credits.cast', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [{
          id: 550,
          title: 'Fight Club'
        }]
      }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        // cast is undefined
      }
    });

    const res = await request(app)
      .get('/api/movies/search?query=Fight&includeCast=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].cast).toEqual([]);
  });
});
});
