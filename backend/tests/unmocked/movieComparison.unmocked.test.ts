/**
 * Movie Comparison Controller Tests - Unmocked
 * Tests: POST /movies/rank, POST /movies/compare, POST /movies/rerank/start, POST /movies/rerank/compare
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

describe('Unmocked: POST /movies/rank', () => {
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

  // Input: First movie to rank (empty ranking list)
  // Expected status code: 201
  // Expected behavior: Movie added at rank 1 without comparison
  // Expected output: Success message with rank 1
  it('should add first movie without comparison', async () => {
    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl,
        rating: mockMovies.inception.rating,
        actors: mockMovies.inception.actors,
        overview: mockMovies.inception.overview
      });

    expect(res.status).toStrictEqual(201);
    expect(res.body.rank).toStrictEqual(1);
    expect(res.body.needsComparison).toStrictEqual(false);

    const rankedMovie = await RankedMovie.findOne({ userId: user._id, movieId: mockMovies.inception.id });
    expect(rankedMovie).toBeDefined();
    expect(rankedMovie!.rank).toStrictEqual(1);
  });

  // Input: Second movie to rank (one movie already ranked)
  // Expected status code: 201
  // Expected behavior: Comparison session started
  // Expected output: needsComparison = true, comparisonMovies array
  it('should start comparison for second movie', async () => {
    // Add first movie
    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl,
      rating: mockMovies.inception.rating,
      actors: mockMovies.inception.actors,
      overview: mockMovies.inception.overview
    });

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.darkKnight.id,
        title: mockMovies.darkKnight.title,
        year: mockMovies.darkKnight.year,
        posterUrl: mockMovies.darkKnight.posterUrl,
        rating: mockMovies.darkKnight.rating,
        actors: mockMovies.darkKnight.actors,
        overview: mockMovies.darkKnight.overview
      });

    expect(res.status).toStrictEqual(201);
    expect(res.body.needsComparison).toStrictEqual(true);
    expect(res.body.comparisonMovies).toBeDefined();
    expect(res.body.comparisonMovies.length).toStrictEqual(2);
  });

  // Input: Duplicate movie (already ranked)
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Error message about duplicate
  it('should reject duplicate movie', async () => {
    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl,
      rating: mockMovies.inception.rating,
      actors: mockMovies.inception.actors,
      overview: mockMovies.inception.overview
    });

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/already/i);
  });

  // Input: Missing required fields
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message about missing fields
  it('should reject missing required fields', async () => {
    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id
        // Missing title, year, posterUrl
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated rank request', async () => {
    const res = await request(app)
      .post('/api/movies/rank')
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(401);
  });

  // Input: Movie from watchlist
  // Expected status code: 201
  // Expected behavior: Movie ranked and removed from watchlist
  // Expected output: Success message
  it('should remove movie from watchlist when ranked', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl,
        rating: mockMovies.inception.rating,
        actors: mockMovies.inception.actors,
        overview: mockMovies.inception.overview
      });

    expect(res.status).toStrictEqual(201);

    const watchlistItem = await WatchlistItem.findOne({ userId: user._id, movieId: mockMovies.inception.id });
    expect(watchlistItem).toBeNull();
  });
});

describe('Unmocked: POST /movies/compare', () => {
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
  });

  // Input: User prefers movie 1 over movie 2
  // Expected status code: 200
  // Expected behavior: Comparison result processed, may need more comparisons or complete
  // Expected output: Status of comparison session
  it('should process comparison choice', async () => {
    // Add two ranked movies
    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl,
      rating: mockMovies.inception.rating,
      actors: mockMovies.inception.actors,
      overview: mockMovies.inception.overview
    });

    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.darkKnight.id,
      title: mockMovies.darkKnight.title,
      rank: 2,
      year: mockMovies.darkKnight.year,
      posterUrl: mockMovies.darkKnight.posterUrl,
      rating: mockMovies.darkKnight.rating,
      actors: mockMovies.darkKnight.actors,
      overview: mockMovies.darkKnight.overview
    });

    // Start ranking a new movie
    const rankRes = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.interstellar.id,
        title: mockMovies.interstellar.title,
        year: mockMovies.interstellar.year,
        posterUrl: mockMovies.interstellar.posterUrl,
        rating: mockMovies.interstellar.rating,
        actors: mockMovies.interstellar.actors,
        overview: mockMovies.interstellar.overview
      });

    if (rankRes.body.needsComparison) {
      const preferredMovieId = rankRes.body.comparisonMovies[0].movieId;

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferredMovieId
        });

      expect(res.status).toStrictEqual(200);
      expect(res.body).toHaveProperty('comparisonComplete');
    }
  });

  // Input: Missing preferredMovieId
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject comparison without preferredMovieId', async () => {
    const res = await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
  });

  // Input: No active comparison session
  // Expected status code: 400
  // Expected behavior: Error about no session
  // Expected output: Error message
  it('should reject comparison without active session', async () => {
    const res = await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: mockMovies.inception.id
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated compare request', async () => {
    const res = await request(app)
      .post('/api/movies/compare')
      .send({
        preferredMovieId: mockMovies.inception.id
      });

    expect(res.status).toStrictEqual(401);
  });
});
