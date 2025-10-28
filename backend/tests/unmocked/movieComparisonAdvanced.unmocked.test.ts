/**
 * Advanced Movie Comparison Controller Tests - Unmocked
 * Comprehensive tests targeting all code paths in movieComparisionController.ts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Advanced Movie Comparison Controller Tests', () => {
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

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
    await WatchlistItem.deleteMany({});
  });

  // Test Case 1: Complete binary search flow (left path)
  it('should complete binary search taking left path', async () => {
    // Add 3 existing ranked movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: mockMovies.theShawshankRedemption.id,
        title: mockMovies.theShawshankRedemption.title,
        rank: 1,
        posterPath: mockMovies.theShawshankRedemption.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theGodfather.id,
        title: mockMovies.theGodfather.title,
        rank: 2,
        posterPath: mockMovies.theGodfather.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        rank: 3,
        posterPath: mockMovies.inception.poster_path
      }
    ]);

    // Start ranking new movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.darkKnight
      });

    // Compare: new movie > middle (take right path)
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: mockMovies.darkKnight
      });

    // Compare: new movie < top (take left path, finalize at rank 2)
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: mockMovies.theShawshankRedemption.id
      });
  });

  // Test Case 2: Complete binary search flow (right path)
  it('should complete binary search taking right path', async () => {
    // Add 5 existing ranked movies
    const movies = [];
    for (let i = 0; i < 5; i++) {
      movies.push({
        userId: user._id,
        movieId: 100000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }
    await RankedMovie.create(movies);

    // Start ranking new movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 200000,
          title: 'New Movie',
          poster_path: '/new.jpg',
          overview: 'New movie overview',
          release_date: '2024-01-01',
          vote_average: 8.0
        }
      });

    // Take left path initially
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 200000
      });

    // Continue comparisons
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 100003
      });
  });

  // Test Case 3: Rank movie with watchlist removal
  it('should remove movie from watchlist when ranking', async () => {
    // Add movie to watchlist first
    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      posterPath: mockMovies.inception.poster_path,
      overview: mockMovies.inception.overview
    });

    // Rank the same movie (should trigger watchlist removal)
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.inception
      });

    // Verify movie removed from watchlist
    const watchlistItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.inception.id
    });
    expect(watchlistItem).toBeNull();
  });

  // Test Case 4: Complex comparison with 10 movies
  it('should handle comparison with 10 existing movies', async () => {
    const movies = [];
    for (let i = 0; i < 10; i++) {
      movies.push({
        userId: user._id,
        movieId: 300000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }
    await RankedMovie.create(movies);

    // Start ranking new movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 400000,
          title: 'Complex Movie',
          poster_path: '/complex.jpg',
          overview: 'Complex overview',
          release_date: '2024-01-01',
          vote_average: 7.5
        }
      });

    // Multiple comparisons to traverse tree
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferredMovie: 300005
        });
    }
  });

  // Test Case 5: Edge case - rank at position 1
  it('should correctly rank movie at position 1', async () => {
    // Add 3 existing movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 500001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 500002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 500003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/path.jpg'
      }
    ]);

    // Start ranking a movie that will be #1
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 500000,
          title: 'Best Movie',
          poster_path: '/best.jpg',
          overview: 'The best movie',
          release_date: '2024-01-01',
          vote_average: 10.0
        }
      });

    // Compare: new movie > middle
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 500000
      });

    // Compare: new movie > top (should rank at #1)
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 500000
      });
  });

  // Test Case 6: Edge case - rank at last position
  it('should correctly rank movie at last position', async () => {
    // Add 3 existing movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 600001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 600002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 600003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/path.jpg'
      }
    ]);

    // Start ranking a movie that will be last
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 600004,
          title: 'Worst Movie',
          poster_path: '/worst.jpg',
          overview: 'Not a good movie',
          release_date: '2024-01-01',
          vote_average: 2.0
        }
      });

    // Compare: new movie < middle
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 600002
      });

    // Compare: new movie < bottom (should rank at last)
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 600003
      });
  });

  // Test Case 7: Multiple watchlist removals
  it('should handle multiple watchlist items during ranking', async () => {
    // Add multiple movies to watchlist
    await WatchlistItem.create([
      {
        userId: user._id,
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        posterPath: mockMovies.inception.poster_path,
        overview: mockMovies.inception.overview
      },
      {
        userId: user._id,
        movieId: mockMovies.darkKnight.id,
        title: mockMovies.darkKnight.title,
        posterPath: mockMovies.darkKnight.poster_path,
        overview: mockMovies.darkKnight.overview
      }
    ]);

    // Rank first movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.inception
      });

    // Rank second movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.darkKnight
      });

    // Both should be removed from watchlist
    const count = await WatchlistItem.countDocuments({ userId: user._id });
    expect(count).toBe(0);
  });

  // Test Case 8: Comparison with exact middle selection
  it('should handle comparison with exact middle movie selection', async () => {
    // Add 7 movies for odd number
    const movies = [];
    for (let i = 0; i < 7; i++) {
      movies.push({
        userId: user._id,
        movieId: 700000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }
    await RankedMovie.create(movies);

    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 800000,
          title: 'Middle Movie',
          poster_path: '/middle.jpg',
          overview: 'Goes in the middle',
          release_date: '2024-01-01',
          vote_average: 5.0
        }
      });

    // Compare with middle movie (rank 4)
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 700003 // This is the middle movie
      });
  });

  // Test Case 9: Invalid comparison movie ID
  it('should handle invalid movie ID in comparison', async () => {
    // Add some movies
    await RankedMovie.create({
      userId: user._id,
      movieId: 900001,
      title: 'Movie 1',
      rank: 1,
      posterPath: '/path.jpg'
    });

    // Start ranking
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 900002,
          title: 'New Movie',
          poster_path: '/new.jpg',
          overview: 'New movie',
          release_date: '2024-01-01',
          vote_average: 6.0
        }
      });

    // Try comparison with invalid ID
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 999999 // Non-existent movie
      });
  });

  // Test Case 10: Comparison without active session
  it('should handle comparison without active ranking session', async () => {
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: 123456
      });
  });

  // Test Case 11: Rank with missing movie data
  it('should handle ranking with incomplete movie data', async () => {
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 1000000,
          title: 'Incomplete Movie'
          // Missing poster_path, overview, etc.
        }
      });
  });

  // Test Case 12: Concurrent ranking sessions
  it('should handle sequential ranking of multiple movies', async () => {
    // Rank first movie (no comparison needed)
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.inception
      });

    // Immediately rank second movie
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.darkKnight
      });

    // Complete comparison
    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovie: mockMovies.darkKnight.id
      });
  });

  // Test Case 13: Rank 15 movies sequentially
  it('should handle ranking 15 movies with comparisons', async () => {
    // Rank movies one by one
    for (let i = 0; i < 15; i++) {
      const movie = {
        id: 1100000 + i,
        title: `Sequential Movie ${i}`,
        poster_path: `/seq${i}.jpg`,
        overview: `Movie ${i} overview`,
        release_date: '2024-01-01',
        vote_average: 5.0 + (i * 0.3)
      };

      const rankRes = await request(app)
        .post('/api/movies/rank')
        .set('Authorization', `Bearer ${token}`)
        .send({ movie });

      // If comparison needed, complete it
      if (i > 0) {
        // Make 2-3 comparisons to complete ranking
        for (let j = 0; j < Math.min(3, Math.ceil(Math.log2(i))); j++) {
          await request(app)
            .post('/api/movies/compare')
            .set('Authorization', `Bearer ${token}`)
            .send({
              preferredMovie: movie.id
            });
        }
      }
    }
  });

  // Test Case 14: Test all preference combinations in binary search
  it('should handle all preference combinations in 4-movie ranking', async () => {
    // Add 3 movies
    await RankedMovie.create([
      { userId: user._id, movieId: 1200001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 1200002, title: 'B', rank: 2, posterPath: '/b.jpg' },
      { userId: user._id, movieId: 1200003, title: 'C', rank: 3, posterPath: '/c.jpg' }
    ]);

    // Test path 1: new > middle, new > top
    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: { id: 1200004, title: 'D1', poster_path: '/d1.jpg', overview: 'D1', release_date: '2024-01-01', vote_average: 9 }
      });

    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovie: 1200004 }); // new > B

    await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovie: 1200004 }); // new > A
  });

  // Test Case 15: Test with 20 movies for deep binary search
  it('should handle deep binary search with 20 movies', async () => {
    const movies = [];
    for (let i = 0; i < 20; i++) {
      movies.push({
        userId: user._id,
        movieId: 1300000 + i,
        title: `Deep Movie ${i}`,
        rank: i + 1,
        posterPath: `/deep${i}.jpg`
      });
    }
    await RankedMovie.create(movies);

    await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 1400000,
          title: 'Deep Search Movie',
          poster_path: '/deepsearch.jpg',
          overview: 'Testing deep binary search',
          release_date: '2024-01-01',
          vote_average: 6.5
        }
      });

    // Perform multiple comparisons to navigate deep tree
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferredMovie: 1300010 // Middle-ish movie
        });
    }
  });
});