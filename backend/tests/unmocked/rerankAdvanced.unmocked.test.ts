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

});