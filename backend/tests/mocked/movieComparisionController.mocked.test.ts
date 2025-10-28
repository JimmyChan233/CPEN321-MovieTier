/**
 * Movie Comparison Controller Tests - Mocked
 * Tests for interactive movie ranking with binary search comparison
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import FeedActivity from '../../src/models/feed/FeedActivity';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';
import {
  startSession,
  getSession,
  updateSession,
  endSession,
} from '../../src/utils/comparisonSession';

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

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
  __esModule: true,
  default: {
    sendFeedNotification: jest.fn()
  }
}));

import notificationService from '../../src/services/notification.service';

describe('Movie Comparison Controller - Mocked Tests', () => {
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RankedMovie.deleteMany({});
    await FeedActivity.deleteMany({});
    await WatchlistItem.deleteMany({});
    await Friendship.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
    mockTmdbGet.mockResolvedValue({
      data: {
        overview: 'TMDB overview',
        poster_path: '/tmdb_poster.jpg'
      }
    });
  });

  // ==================== POST /add Tests ====================

  describe('POST /add', () => {
    describe('Case 1: First movie (empty ranking)', () => {
      it('should add first movie without comparison', async () => {
        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg',
            overview: 'A ticking-time-bomb insomniac...'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('added');
        expect(res.body.data.rank).toBe(1);
        expect(res.body.data.movieId).toBe(550);

        // Verify in database
        const saved = await RankedMovie.findOne({ userId: (user as any)._id, movieId: 550 });
        expect(saved).toBeDefined();
        expect(saved?.rank).toBe(1);
      });

      it('should remove from watchlist when adding first movie', async () => {
        // Add to watchlist first
        await WatchlistItem.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club'
        });

        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg'
          });

        const watchlistItem = await WatchlistItem.findOne({ movieId: 550 });
        expect(watchlistItem).toBeNull();
      });

      it('should enrich missing poster and overview from TMDB', async () => {
        mockTmdbGet.mockResolvedValueOnce({
          data: {
            overview: 'Enriched overview from TMDB',
            poster_path: '/enriched_poster.jpg'
          }
        });

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
            // No posterPath or overview provided
          });

        expect(res.status).toBe(200);

        // Check feed activity has enriched data
        const activity = await FeedActivity.findOne({ movieId: 550 });
        expect(activity?.posterPath).toBe('/enriched_poster.jpg');
        expect(activity?.overview).toBe('Enriched overview from TMDB');
      });

      it('should create feed activity when adding first movie', async () => {
        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg',
            overview: 'Overview'
          });

        const activity = await FeedActivity.findOne({
          userId: (user as any)._id.toString(),
          movieId: 550
        });

        expect(activity).toBeDefined();
        expect(activity?.activityType).toBe('ranked_movie');
        expect(activity?.movieTitle).toBe('Fight Club');
        expect(activity?.rank).toBe(1);
      });

      it('should notify friends via SSE when adding first movie', async () => {
        const friend = await User.create({
          googleId: 'friend123',
          email: 'friend@example.com',
          name: 'Test Friend',
          displayName: 'Test Friend'
        });

        await Friendship.create({
          userId: (user as any)._id.toString(),
          friendId: (friend as any)._id
        });

        const sendSpy = jest.spyOn(sseService, 'send');

        await request(app)
          .post('/api/movies/add')
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

      it('should send FCM notification to friends with tokens', async () => {
        const friend = await User.create({
          googleId: 'friend123',
          email: 'friend@example.com',
          name: 'Test Friend',
          displayName: 'Test Friend',
          fcmToken: 'test_fcm_token_123'
        });

        await Friendship.create({
          userId: (user as any)._id.toString(),
          friendId: (friend as any)._id
        });

        (notificationService.sendFeedNotification as jest.Mock).mockResolvedValueOnce(undefined);

        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg'
          });

        expect(notificationService.sendFeedNotification).toHaveBeenCalledWith(
          'test_fcm_token_123',
          mockUsers.validUser.name,
          'Fight Club',
          expect.any(String)
        );
      });

      it('should handle TMDB enrichment failure gracefully', async () => {
        mockTmdbGet.mockRejectedValueOnce(new Error('TMDB error'));

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should handle FCM notification failure gracefully', async () => {
        const friend = await User.create({
          googleId: 'friend123',
          email: 'friend@example.com',
          name: 'Test Friend',
          displayName: 'Test Friend',
          fcmToken: 'test_fcm_token_123'
        });

        await Friendship.create({
          userId: (user as any)._id.toString(),
          friendId: (friend as any)._id
        });

        (notificationService.sendFeedNotification as jest.Mock).mockRejectedValueOnce(new Error('FCM error'));

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('Case 2: Duplicate movie', () => {
      it('should reject duplicate movie', async () => {
        // Add first movie
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg',
          rank: 1
        });

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg'
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('already ranked');
      });

      it('should remove from watchlist even when rejecting duplicate', async () => {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          rank: 1
        });

        await WatchlistItem.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club'
        });

        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
          });

        const watchlistItem = await WatchlistItem.findOne({ movieId: 550 });
        expect(watchlistItem).toBeNull();
      });
    });

    describe('Case 3: Begin comparison', () => {
      it('should start comparison session for second movie', async () => {
        // Add first movie
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster1.jpg',
          rank: 1
        });

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 680,
            title: 'Pulp Fiction',
            posterPath: '/poster2.jpg'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('compare');
        expect(res.body.data.compareWith).toBeDefined();
        expect(res.body.data.compareWith.movieId).toBe(550);

        // Verify session exists
        const session = getSession((user as any)._id.toString());
        expect(session).toBeDefined();
        expect(session?.newMovie.movieId).toBe(680);
      });

      it('should remove from watchlist when starting comparison', async () => {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          rank: 1
        });

        await WatchlistItem.create({
          userId: (user as any)._id,
          movieId: 680,
          title: 'Pulp Fiction'
        });

        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 680,
            title: 'Pulp Fiction',
            posterPath: '/poster.jpg'
          });

        const watchlistItem = await WatchlistItem.findOne({ movieId: 680 });
        expect(watchlistItem).toBeNull();
      });

      it('should use middle index for first comparison', async () => {
        // Create 5 ranked movies
        for (let i = 1; i <= 5; i++) {
          await RankedMovie.create({
            userId: (user as any)._id,
            movieId: i,
            title: `Movie ${i}`,
            rank: i
          });
        }

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 999,
            title: 'New Movie',
            posterPath: '/new.jpg'
          });

        // With 5 movies (indices 0-4), high = 4, middle = (0 + 4) / 2 = 2
        expect(res.body.data.compareWith.movieId).toBe(3); // rank 3 at index 2
      });
    });

    describe('Error handling', () => {
      it('should handle database errors gracefully', async () => {
        jest.spyOn(RankedMovie, 'find').mockImplementationOnce(() => {
          throw new Error('Database error');
        });

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
          });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Unable to add movie');
      });
    });
  });

  // ==================== POST /compare Tests ====================

  describe('POST /compare', () => {
    beforeEach(async () => {
      // Create some ranked movies for comparison tests
      for (let i = 1; i <= 5; i++) {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: i * 100,
          title: `Movie ${i}`,
          posterPath: `/poster${i}.jpg`,
          rank: i
        });
      }
    });

    it('should return error when no active session', async () => {
      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 300,
          preferredMovieId: 999
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No active comparison session');
    });

    it('should continue comparison when not finished', async () => {
      // Start a session manually
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 4); // high = 4 (5 movies, 0-indexed)

      // First comparison: prefer new movie (go left)
      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 300, // Movie at middle index (rank 3)
          preferredMovieId: 999 // New movie preferred
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('compare');
      expect(res.body.data.compareWith).toBeDefined();
    });

    it('should insert movie when comparison finishes (prefer new)', async () => {
      // Create session where new movie will be inserted at rank 1
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'Best Movie',
        posterPath: '/best.jpg'
      }, 0); // Only one movie exists, will insert at top

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999 // Prefer new movie
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('added');
      expect(res.body.data.movieId).toBe(999);
      expect(res.body.data.rank).toBe(1);

      // Verify old rank 1 movie moved to rank 2
      const oldFirst = await RankedMovie.findOne({ movieId: 100 });
      expect(oldFirst?.rank).toBe(2);

      // Verify session ended
      const session = getSession((user as any)._id.toString());
      expect(session).toBeUndefined();
    });

    it('should insert movie at correct position (prefer existing)', async () => {
      // Start session
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 4);

      // Always prefer existing movies to push new movie to bottom
      let res;
      let count = 0;
      do {
        res = await request(app)
          .post('/api/movies/compare')
          .set('Authorization', `Bearer ${token}`)
          .send({
            comparedMovieId: res?.body?.data?.compareWith?.movieId || 300,
            preferredMovieId: res?.body?.data?.compareWith?.movieId || 300 // Always prefer existing
          });
        count++;
      } while (res.body.status === 'compare' && count < 10);

      expect(res.body.status).toBe('added');
      expect(res.body.data.rank).toBe(6); // Should be last (after 5 existing movies)
    });

    it('should remove from watchlist when finalizing insert', async () => {
      await WatchlistItem.create({
        userId: (user as any)._id,
        movieId: 999,
        title: 'New Movie'
      });

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      const watchlistItem = await WatchlistItem.findOne({ movieId: 999 });
      expect(watchlistItem).toBeNull();
    });

    it('should enrich with TMDB data when finalizing', async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          overview: 'Final overview from TMDB',
          poster_path: '/final_poster.jpg'
        }
      });

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: undefined
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      const activity = await FeedActivity.findOne({ movieId: 999 });
      expect(activity?.overview).toBe('Final overview from TMDB');
    });

    it('should create feed activity when finalizing', async () => {
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      const activity = await FeedActivity.findOne({
        userId: (user as any)._id.toString(),
        movieId: 999
      });

      expect(activity).toBeDefined();
      expect(activity?.activityType).toBe('ranked_movie');
      expect(activity?.movieTitle).toBe('New Movie');
    });

    it('should notify friends when finalizing', async () => {
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        name: 'Test Friend',
        displayName: 'Test Friend'
      });

      await Friendship.create({
        userId: (user as any)._id.toString(),
        friendId: (friend as any)._id
      });

      const sendSpy = jest.spyOn(sseService, 'send');

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(sendSpy).toHaveBeenCalledWith(
        String((friend as any)._id),
        'feed_activity',
        expect.objectContaining({
          activityId: expect.anything()
        })
      );
    });

    it('should send FCM notification when finalizing', async () => {
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        name: 'Test Friend',
        displayName: 'Test Friend',
        fcmToken: 'test_fcm_token_123'
      });

      await Friendship.create({
        userId: (user as any)._id.toString(),
        friendId: (friend as any)._id
      });

      (notificationService.sendFeedNotification as jest.Mock).mockResolvedValueOnce(undefined);

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(notificationService.sendFeedNotification).toHaveBeenCalledWith(
        'test_fcm_token_123',
        mockUsers.validUser.name,
        'New Movie',
        expect.any(String)
      );
    });

    it('should handle TMDB enrichment failure when finalizing', async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error('TMDB error'));

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle FCM notification failure when finalizing', async () => {
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        name: 'Test Friend',
        displayName: 'Test Friend',
        fcmToken: 'test_fcm_token_123'
      });

      await Friendship.create({
        userId: (user as any)._id.toString(),
        friendId: (friend as any)._id
      });

      (notificationService.sendFeedNotification as jest.Mock).mockRejectedValueOnce(new Error('FCM error'));

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      jest.spyOn(RankedMovie, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to save comparison');
    });
  });
});
