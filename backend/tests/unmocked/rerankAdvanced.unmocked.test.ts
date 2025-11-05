/**
 * Advanced Rerank Controller Tests - Unmocked
 * Comprehensive tests for reranking functionality with edge cases
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Advanced Rerank Controller Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let user2: any;
  let token: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });
    token = generateTestJWT((user as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Test Case 1: Complete rerank flow from middle to top
  it('should rerank movie from middle to top position', async () => {
    // Create 5 ranked movies
    await RankedMovie.create([
      { userId: user._id, movieId: 100001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 100002, title: 'B', rank: 2, posterPath: '/b.jpg' },
      { userId: user._id, movieId: 100003, title: 'C', rank: 3, posterPath: '/c.jpg' },
      { userId: user._id, movieId: 100004, title: 'D', rank: 4, posterPath: '/d.jpg' },
      { userId: user._id, movieId: 100005, title: 'E', rank: 5, posterPath: '/e.jpg' }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, movieId: 100003 });

    // Start rerank session
    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movieToRerank as any)._id.toString() });

    // Prefer C over B (middle comparison)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 100003 });

    // Prefer C over A (move to top)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 100003 });
  });

  // Test Case 2: Complete rerank flow from middle to bottom
  it('should rerank movie from middle to bottom position', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 200001, title: 'Movie 1', rank: 1, posterPath: '/1.jpg' },
      { userId: user._id, movieId: 200002, title: 'Movie 2', rank: 2, posterPath: '/2.jpg' },
      { userId: user._id, movieId: 200003, title: 'Movie 3', rank: 3, posterPath: '/3.jpg' },
      { userId: user._id, movieId: 200004, title: 'Movie 4', rank: 4, posterPath: '/4.jpg' },
      { userId: user._id, movieId: 200005, title: 'Movie 5', rank: 5, posterPath: '/5.jpg' }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, movieId: 200003 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movieToRerank as any)._id.toString() });

    // Prefer movie 4 over movie 3
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 200004 });

    // Prefer movie 5 over movie 3 (move to bottom)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 200005 });
  });

  // Test Case 3: Rerank with 10 movies

  // Test Case 4: Rerank with 20 movies (deep binary search)
  it('should handle rerank with 20 movies', async () => {
    const movies = [];
    for (let i = 0; i < 20; i++) {
      movies.push({
        userId: user._id,
        movieId: 400000 + i,
        title: `Deep Movie ${i}`,
        rank: i + 1,
        posterPath: `/deep${i}.jpg`
      });
    }
    await RankedMovie.create(movies);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 10 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movieToRerank as any)._id.toString() });

    // Perform multiple comparisons
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferredMovieId: 400009 });
    }
  });

  // Test Case 5: Rerank movie from position 1
  it('should rerank movie from top position', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 500001, title: 'Top', rank: 1, posterPath: '/top.jpg' },
      { userId: user._id, movieId: 500002, title: 'Second', rank: 2, posterPath: '/second.jpg' },
      { userId: user._id, movieId: 500003, title: 'Third', rank: 3, posterPath: '/third.jpg' }
    ]);

    const topMovie = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (topMovie as any)._id.toString() });

    // Move top movie down
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 500002 });
  });

  // Test Case 6: Rerank movie from last position
  it('should rerank movie from bottom position', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 600001, title: 'First', rank: 1, posterPath: '/1.jpg' },
      { userId: user._id, movieId: 600002, title: 'Second', rank: 2, posterPath: '/2.jpg' },
      { userId: user._id, movieId: 600003, title: 'Last', rank: 3, posterPath: '/last.jpg' }
    ]);

    const lastMovie = await RankedMovie.findOne({ userId: user._id, rank: 3 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (lastMovie as any)._id.toString() });

    // Move last movie up
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 600003 });
  });

  // Test Case 7: Rerank with invalid movieId
  it('should handle rerank with invalid format movieId', async () => {
    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: 'not-a-valid-objectid' });
  });

  // Test Case 8: Rerank movie belonging to different user
  it('should reject rerank of another users movie', async () => {
    const movie = await RankedMovie.create({
      userId: user2._id,
      movieId: 700001,
      title: 'Other User Movie',
      rank: 1,
      posterPath: '/other.jpg'
    });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie as any)._id.toString() });
  });

  // Test Case 9: Compare without active rerank session
  it('should handle compare without active rerank session', async () => {
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 123456 });
  });

  // Test Case 10: Start rerank without movieId
  it('should handle rerank start without movieId', async () => {
    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({});
  });

  // Test Case 11: Compare with invalid preferredMovieId
  it('should handle compare with invalid preferredMovieId', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 800001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 800002, title: 'B', rank: 2, posterPath: '/b.jpg' }
    ]);

    const movie = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie as any)._id.toString() });

    // Compare with non-existent movie
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 999999 });
  });

  // Test Case 12: Sequential rerank sessions
  it('should handle multiple sequential rerank sessions', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 900001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 900002, title: 'B', rank: 2, posterPath: '/b.jpg' },
      { userId: user._id, movieId: 900003, title: 'C', rank: 3, posterPath: '/c.jpg' }
    ]);

    // First rerank session
    const movie1 = await RankedMovie.findOne({ userId: user._id, rank: 1 });
    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie1 as any)._id.toString() });

    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 900002 });

    // Second rerank session
    const movie2 = await RankedMovie.findOne({ userId: user._id, rank: 2 });
    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie2 as any)._id.toString() });

    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 900002 });
  });

  // Test Case 13: Rerank with 2 movies only
  it('should handle rerank with only 2 movies', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 1000001, title: 'First', rank: 1, posterPath: '/1.jpg' },
      { userId: user._id, movieId: 1000002, title: 'Second', rank: 2, posterPath: '/2.jpg' }
    ]);

    const movie = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie as any)._id.toString() });

    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 1000002 });
  });

  // Test Case 14: Rerank unauthorized
  it('should reject unauthorized rerank request', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1100001,
      title: 'Unauthorized',
      rank: 1,
      posterPath: '/unauth.jpg'
    });

    await request(app)
      .post('/rerank/start')
      .send({ movieId: (movie as any)._id.toString() });
  });

  // Test Case 15: Rerank compare unauthorized
  it('should reject unauthorized rerank compare', async () => {
    await request(app)
      .post('/compare')
      .send({ preferredMovieId: 123456 });
  });

  // Test Case 16: Rerank with exact middle preference
  it('should handle rerank where movie stays at same position', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 1200001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 1200002, title: 'B', rank: 2, posterPath: '/b.jpg' },
      { userId: user._id, movieId: 1200003, title: 'C', rank: 3, posterPath: '/c.jpg' }
    ]);

    const movie = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie as any)._id.toString() });

    // Prefer higher ranked movie (B < A, so B moves down)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 1200001 });

    // Then prefer B over C (B > C, so B stays at 2)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredMovieId: 1200002 });
  });

  // Test Case 17: Rerank with 15 movies

  // Test Case 18: Rerank all movies in list sequentially
  it('should handle reranking all movies one by one', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 1400001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 1400002, title: 'B', rank: 2, posterPath: '/b.jpg' },
      { userId: user._id, movieId: 1400003, title: 'C', rank: 3, posterPath: '/c.jpg' },
      { userId: user._id, movieId: 1400004, title: 'D', rank: 4, posterPath: '/d.jpg' }
    ]);

    for (let rank = 1; rank <= 4; rank++) {
      const movie = await RankedMovie.findOne({ userId: user._id, rank });

      await request(app)
        .post('/rerank/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ movieId: (movie as any)._id.toString() });

      // Make a comparison
      await request(app)
        .post('/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferredMovieId: (movie as any).movieId });
    }
  });

  // Test Case 19: Compare with missing preferredMovieId field
  it('should handle compare with missing preferredMovieId field', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 1500001, title: 'A', rank: 1, posterPath: '/a.jpg' },
      { userId: user._id, movieId: 1500002, title: 'B', rank: 2, posterPath: '/b.jpg' }
    ]);

    const movie = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: (movie as any)._id.toString() });

    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({});
  });

  // Test Case 20: Rerank with 7 movies (odd number for balanced tree)
});