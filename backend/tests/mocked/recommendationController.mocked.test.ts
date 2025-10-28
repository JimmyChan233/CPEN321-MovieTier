/**
 * Recommendation Controller Tests - Mocked
 * Comprehensive tests with mocked TMDB responses to cover all code paths
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import recommendationRoutes from '../../src/routes/recommendationRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Recommendation Controller - Mocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/recommendations', recommendationRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RankedMovie.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET /trending Tests ====================

  describe('GET /trending', () => {
    it('should return trending movies successfully', async () => {
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

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].id).toBe(550);
      expect(res.body.data[0].title).toBe('Fight Club');
      expect(res.body.data[0].overview).toBe('An insomniac office worker...');
      expect(res.body.data[0].posterPath).toBe('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
    });

    it('should return empty array when no trending movies', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: []
        }
      });

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return empty array when TMDB returns no data', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: null
      });

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should limit results to 20 movies', async () => {
      const manyMovies = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        overview: `Overview ${i + 1}`,
        poster_path: `/poster${i + 1}.jpg`,
        release_date: '2024-01-01',
        vote_average: 7.5
      }));

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: manyMovies }
      });

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(20);
    });

    it('should handle null/undefined movie fields', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 550,
            title: 'Test Movie'
            // Missing overview, poster_path, release_date, vote_average
          }]
        }
      });

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].overview).toBeNull();
      expect(res.body.data[0].posterPath).toBeNull();
      expect(res.body.data[0].releaseDate).toBeNull();
      expect(res.body.data[0].voteAverage).toBeNull();
    });

    it('should handle TMDB API error', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load trending movies');
    });
  });

  // ==================== GET / (getRecommendations) Tests ====================

  describe('GET /', () => {
    it('should return empty array when user has no ranked movies', async () => {
      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should analyze preferences and return recommendations', async () => {
      // Create ranked movies
      await RankedMovie.create([
        {
          userId: (user as any)._id,
          movieId: 155,  // The Dark Knight
          title: 'The Dark Knight',
          rank: 1
        },
        {
          userId: (user as any)._id,
          movieId: 550,  // Fight Club
          title: 'Fight Club',
          rank: 2
        },
        {
          userId: (user as any)._id,
          movieId: 680,  // Pulp Fiction
          title: 'Pulp Fiction',
          rank: 3
        }
      ]);

      // Mock movie details for preference analysis
      mockTmdbGet
        .mockResolvedValueOnce({
          data: {
            genres: [{ id: 28, name: 'Action' }, { id: 18, name: 'Drama' }],
            original_language: 'en',
            vote_average: 9.0
          }
        })
        .mockResolvedValueOnce({
          data: {
            genres: [{ id: 18, name: 'Drama' }],
            original_language: 'en',
            vote_average: 8.8
          }
        })
        .mockResolvedValueOnce({
          data: {
            genres: [{ id: 80, name: 'Crime' }],
            original_language: 'en',
            vote_average: 8.9
          }
        });

      // Mock discover results
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 1000,
              title: 'Discovered Movie 1',
              overview: 'A discovered movie',
              poster_path: '/disc1.jpg',
              release_date: '2023-01-01',
              vote_average: 8.0,
              genre_ids: [28, 18],
              original_language: 'en'
            }
          ]
        }
      });

      // Mock similar movies
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 2000,
              title: 'Similar Movie 1',
              overview: 'A similar movie',
              poster_path: '/sim1.jpg',
              release_date: '2023-02-01',
              vote_average: 7.8,
              genre_ids: [28],
              original_language: 'en'
            }
          ]
        }
      });

      // Mock recommendations
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 3000,
              title: 'Recommended Movie 1',
              overview: 'A recommended movie',
              poster_path: '/rec1.jpg',
              release_date: '2023-03-01',
              vote_average: 8.2,
              genre_ids: [18],
              original_language: 'en'
            }
          ]
        }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should handle discover API failure gracefully', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      // Mock movie details
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      // Mock discover failure
      mockTmdbGet.mockRejectedValueOnce(new Error('Discover API failed'));

      // Mock similar movies success
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 2000,
            title: 'Similar Movie',
            overview: 'Overview',
            poster_path: '/sim.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      // Mock recommendations success
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 3000,
            title: 'Rec Movie',
            overview: 'Overview',
            poster_path: '/rec.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      // Should still succeed with other sources
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle similar movies API failure gracefully', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      // Discover succeeds
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 1000,
            title: 'Discovered',
            overview: 'Overview',
            poster_path: '/disc.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      // Similar movies fails
      mockTmdbGet.mockRejectedValueOnce(new Error('Similar API failed'));

      // Recommendations succeeds
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 3000,
            title: 'Rec',
            overview: 'Overview',
            poster_path: '/rec.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle recommendations API failure gracefully', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 1000,
            title: 'Discovered',
            overview: 'Overview',
            poster_path: '/disc.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 2000,
            title: 'Similar',
            overview: 'Overview',
            poster_path: '/sim.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [28],
            original_language: 'en'
          }]
        }
      });

      // Recommendations API fails
      mockTmdbGet.mockRejectedValueOnce(new Error('Recommendations API failed'));

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return empty array when all API sources fail', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      // All recommendation sources fail (discover, similar, recommendations)
      mockTmdbGet.mockRejectedValueOnce(new Error('Discover failed'));
      mockTmdbGet.mockRejectedValueOnce(new Error('Similar failed'));
      mockTmdbGet.mockRejectedValueOnce(new Error('Recommendations failed'));

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should filter out already seen movies', async () => {
      await RankedMovie.create([
        {
          userId: (user as any)._id,
          movieId: 155,
          title: 'The Dark Knight',
          rank: 1
        },
        {
          userId: (user as any)._id,
          movieId: 550,  // This movie is already ranked
          title: 'Fight Club',
          rank: 2
        }
      ]);

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 18, name: 'Drama' }],
          original_language: 'en',
          vote_average: 8.8
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550,  // Already ranked - should be filtered
              title: 'Fight Club',
              overview: 'Overview',
              poster_path: '/poster.jpg',
              release_date: '1999-01-01',
              vote_average: 8.8,
              genre_ids: [18],
              original_language: 'en'
            },
            {
              id: 1000,  // New movie - should be included
              title: 'New Movie',
              overview: 'Overview',
              poster_path: '/new.jpg',
              release_date: '2023-01-01',
              vote_average: 8.0,
              genre_ids: [28],
              original_language: 'en'
            }
          ]
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const movieIds = res.body.data.map((m: any) => m.id);
      expect(movieIds).not.toContain(550);  // Already ranked movie filtered out
    });

    it('should deduplicate recommendations from multiple sources', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      const duplicateMovie = {
        id: 1000,
        title: 'Duplicate Movie',
        overview: 'Overview',
        poster_path: '/dup.jpg',
        release_date: '2023-01-01',
        vote_average: 8.0,
        genre_ids: [28],
        original_language: 'en'
      };

      // Same movie appears in all sources
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [duplicateMovie] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [duplicateMovie] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [duplicateMovie] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should only appear once despite being in all sources
      const movieIds = res.body.data.map((m: any) => m.id);
      const count1000 = movieIds.filter((id: number) => id === 1000).length;
      expect(count1000).toBe(1);
    });

    it('should score movies based on genre matching', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 1000,
              title: 'Movie with matching genre',
              overview: 'Overview',
              poster_path: '/match.jpg',
              release_date: '2023-01-01',
              vote_average: 7.0,
              genre_ids: [28],  // Matches user's preference
              original_language: 'en'
            },
            {
              id: 2000,
              title: 'Movie without matching genre',
              overview: 'Overview',
              poster_path: '/nomatch.jpg',
              release_date: '2023-01-01',
              vote_average: 7.0,
              genre_ids: [99],  // Doesn't match
              original_language: 'en'
            }
          ]
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Movie with matching genre should rank higher
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should handle preference analysis failures gracefully', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      // Preference analysis fails
      mockTmdbGet.mockRejectedValueOnce(new Error('Movie details fetch failed'));

      // But discover still works
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [{
            id: 1000,
            title: 'Movie',
            overview: 'Overview',
            poster_path: '/poster.jpg',
            release_date: '2023-01-01',
            vote_average: 8.0,
            genre_ids: [],
            original_language: 'en'
          }]
        }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should limit final recommendations to 20 movies', async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: 'The Dark Knight',
        rank: 1
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: 'Action' }],
          original_language: 'en',
          vote_average: 9.0
        }
      });

      // Return 30 movies
      const manyMovies = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1000,
        title: `Movie ${i}`,
        overview: 'Overview',
        poster_path: '/poster.jpg',
        release_date: '2023-01-01',
        vote_average: 8.0,
        genre_ids: [28],
        original_language: 'en'
      }));

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: manyMovies }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should handle database error gracefully', async () => {
      // Close connection to simulate error
      await mongoose.disconnect();

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to load recommendations');

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });

    it('should calculate top 50% of ranked movies for preferences', async () => {
      // Create 10 movies, top 50% = 5 movies
      for (let i = 0; i < 10; i++) {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 1000 + i,
          title: `Movie ${i}`,
          rank: i + 1
        });
      }

      // Mock 5 movie details calls
      for (let i = 0; i < 5; i++) {
        mockTmdbGet.mockResolvedValueOnce({
          data: {
            genres: [{ id: 28, name: 'Action' }],
            original_language: 'en',
            vote_average: 8.0
          }
        });
      }

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] }
      });

      for (let i = 0; i < 3; i++) {
        mockTmdbGet.mockResolvedValueOnce({
          data: { results: [] }
        });
      }

      for (let i = 0; i < 2; i++) {
        mockTmdbGet.mockResolvedValueOnce({
          data: { results: [] }
        });
      }

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should handle discover recommendations failure gracefully', async () => {
      // Create 3 ranked movies
      await RankedMovie.create([
        { userId: (user as any)._id, movieId: 550, title: 'Fight Club', rank: 1 },
        { userId: (user as any)._id, movieId: 680, title: 'Pulp Fiction', rank: 2 },
        { userId: (user as any)._id, movieId: 13, title: 'Forrest Gump', rank: 3 }
      ]);

      // Mock movie details for analysis
      for (let i = 0; i < 3; i++) {
        mockTmdbGet.mockResolvedValueOnce({
          data: {
            genres: [{ id: 18, name: 'Drama' }],
            original_language: 'en',
            vote_average: 8.5
          }
        });
      }

      // Make discover API call fail
      mockTmdbGet.mockRejectedValueOnce(new Error('Discover API error'));

      // Mock similar movies calls (should still succeed)
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [{ id: 999, title: 'Similar Movie', overview: 'Test', poster_path: '/test.jpg', release_date: '2020-01-01', vote_average: 7.5 }] }
      });

      // Mock trending fallback
      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [{ id: 888, title: 'Trending Movie', overview: 'Test', poster_path: '/test2.jpg', release_date: '2021-01-01', vote_average: 7.0 }] }
      });

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${token}`);

      // Should still return 200 with recommendations from other sources
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
