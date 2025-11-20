/**
 * @mocked Mocked tests for movie routes and controllers
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Movie Routes Tests - Mocked
 * Comprehensive tests for movie routes with mocked TMDB responses
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../../src/routes/movieRoutes';
import User from '../../../src/models/user/User';
import RankedMovie from '../../../src/models/movie/RankedMovie';
import FeedActivity from '../../../src/models/feed/FeedActivity';
import { Friendship } from '../../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../../utils/test-fixtures';

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock('../../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

// Mock SSE service
jest.mock('../../../src/services/sse/sseService', () => ({
  sseService: {
    send: jest.fn()
  }
}));

import { sseService } from '../../../src/services/sse/sseService';

// Mock controllers
jest.mock('../../../src/controllers/movieComparisionController', () => ({
  addMovie: jest.fn((req, res) => res.json({ success: true })),
  compareMovies: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../../src/controllers/rerankController', () => ({
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


    it('should reject when no query is provided', async () => {
      const res = await request(app)
        .get('/api/movies/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Query must be at least 2 characters');
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

    it('should enrich first 10 results with cast and return remaining without cast', async () => {
      // Return 15 movie results
      const mockResults = Array.from({ length: 15 }, (_, i) => ({
        id: 1000 + i,
        title: `Movie ${i + 1}`,
        overview: `Overview ${i + 1}`,
        poster_path: `/poster${i + 1}.jpg`,
        release_date: '2020-01-01',
        vote_average: 7.0
      }));

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: mockResults }
      });

      // Mock cast fetches for first 10 movies
      for (let i = 0; i < 10; i++) {
        mockTmdbGet.mockResolvedValueOnce({
          data: {
            cast: [{ name: `Actor ${i + 1}` }]
          }
        });
      }

      const res = await request(app)
        .get('/api/movies/search?query=Movie&includeCast=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(15);

      // First 10 should have cast
      expect(res.body.data[0].cast).toEqual(['Actor 1']);
      expect(res.body.data[9].cast).toEqual(['Actor 10']);

      // Remaining 5 should have empty cast array
      expect(res.body.data[10].cast).toEqual([]);
      expect(res.body.data[14].cast).toEqual([]);
    });
  });

  // ==================== GET /ranked Tests ====================

  describe('GET /ranked', () => {


  });

  // ==================== POST /rank Tests ====================

  describe('POST /rank', () => {





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


    it('should return 404 for non-existent movie', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/movies/ranked/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });


    it('should send SSE notifications to friends when deleting ranked movie (coverage for line 314)', async () => {
      // Create a friend
      const friend = await User.create({
        name: 'Friend User',
        email: 'friend@test.com',
        googleId: 'friend-google-123'
      });

      // Create friendship
      await Friendship.create({
        userId: (user as any)._id,
        friendId: (friend as any)._id
      });

      const movie = await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 550,
        title: 'Fight Club',
        rank: 1
      });

      const { sseService } = require('../../../src/services/sse/sseService');

      await request(app)
        .delete(`/api/movies/ranked/${movie._id}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify SSE notification was sent to friend
      expect(sseService.send).toHaveBeenCalledWith(
        String((friend as any)._id),
        'ranking_changed',
        { userId: String((user as any)._id) }
      );
    });

  });

  // ==================== GET /:movieId/providers Tests ====================

  describe('GET /:movieId/providers', () => {


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




});

describe('GET /:movieId/details - Branch coverage', () => {




});
describe('POST /rank - Branch coverage', () => {



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

});

describe('GET /:movieId/providers - Branch coverage', () => {



  it('should filter out providers with missing provider_name', async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: {
          CA: {
            link: 'https://example.com',
            flatrate: [
              { provider_name: 'Netflix' },
              { provider_name: undefined },
              { provider_name: null },
              { provider_name: '' },
              { provider_name: 'Disney+' }
            ],
            rent: [
              {},
              { provider_name: 'Apple TV' }
            ],
            buy: [
              { provider_name: 'Amazon' },
              { provider_name: undefined }
            ]
          }
        }
      }
    });

    const res = await request(app)
      .get('/api/movies/550/providers?country=CA')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Only valid provider names should be included
    expect(res.body.data.providers.flatrate).toEqual(['Netflix', 'Disney+']);
    expect(res.body.data.providers.rent).toEqual(['Apple TV']);
    expect(res.body.data.providers.buy).toEqual(['Amazon']);
  });
});

describe('GET /:movieId/videos - Branch coverage', () => {



});

describe('GET /search - Additional branch coverage', () => {



});

describe('GET /search - Fallback catch block coverage (Lines 90-93)', () => {
  /**
   * This test specifically covers lines 90-93 - the fallback catch block
   * when detail fetch fails for a zh-CN result
   * 
   * Coverage:
   * Line 90: overview: movie.overview ?? null,
   * Line 91: posterPath: movie.poster_path ?? null,
   * Line 92: releaseDate: movie.release_date ?? null,
   * Line 93: voteAverage: movie.vote_average ?? null
   */

  /**
   * Edge case: zh result has missing optional fields
   * Tests the ?? null operator chains
   */

  /**
   * Multiple results - test catch block is hit for all failed fetches
   */

  /**
   * Test: Some detail fetches succeed, some fail
   * Tests the mixed scenario
   */
  it('should handle mixed success/failure in detail fetches', async () => {
    jest.clearAllMocks();
    
    mockTmdbGet.mockResolvedValueOnce({
      data: { results: [] }
    });

    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 1,
            title: '电影1',
            overview: 'Chinese overview 1',
            poster_path: '/cn_poster1.jpg',
            release_date: '2020-01-01',
            vote_average: 7.0
          },
          {
            id: 2,
            title: '电影2',
            overview: 'Chinese overview 2',
            poster_path: '/cn_poster2.jpg',
            release_date: '2020-02-01',
            vote_average: 8.0
          }
        ]
      }
    });

    // First detail fetch succeeds
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 1,
        title: 'Movie 1 English',
        overview: 'English overview 1',
        poster_path: '/en_poster1.jpg',
        release_date: '2020-01-01',
        vote_average: 7.5
      }
    });

    // Second detail fetch FAILS - triggers catch block (lines 90-93)
    mockTmdbGet.mockRejectedValueOnce(new Error('API error'));

    const res = await request(app)
      .get('/api/movies/search?query=电影')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    
    // First result uses detail data
    expect(res.body.data[0].title).toBe('Movie 1 English');
    expect(res.body.data[0].overview).toBe('English overview 1');
    
    // Second result uses fallback (lines 90-93 operators)
    expect(res.body.data[1].title).toBe('电影2');
    expect(res.body.data[1].overview).toBe('Chinese overview 2');
  });

  /**
   * Edge case: zh result with null values (not undefined)
   * Tests the ?? null chains
   */

  /**
   * Verify detail fetch succeeds - does NOT enter catch block
   * This ensures we're testing the right scenario
   */
});
});
