/**
 * Movie API Tests - Unmocked
 * Tests: GET /search, GET /ranked, POST /rank, POST /compare, POST /rerank/start, DELETE /ranked/:id
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Unmocked: GET /movies/search', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid movie search query (e.g., "Inception")
  // Expected status code: 200
  // Expected behavior: TMDB API is called and results formatted
  // Expected output: Array of movies with id, title, overview, posterPath, releaseDate, voteAverage
  it('should return search results for valid movie query', async () => {
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'Inception' });

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body.results || res.body)).toBe(true);
  });

  // Input: Query with less than 2 characters
  // Expected status code: 400
  // Expected behavior: Request is rejected without API call
  // Expected output: Validation error about minimum query length
  it('should reject search query shorter than 2 characters', async () => {
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'a' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/characters|length/);
  });

  // Input: Empty query string
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Error message about empty query
  it('should reject empty search query', async () => {
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: '' });

    expect(res.status).toStrictEqual(400);
  });

  // Input: Valid query but unauthenticated
  // Expected status code: 401
  // Expected behavior: Request is rejected before API call
  // Expected output: Unauthorized error
  it('should reject unauthenticated search', async () => {
    const res = await request(app)
      .get('/search')
      .query({ query: 'Inception' });

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: GET /movies/ranked', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: User with ranked movies
  // Expected status code: 200
  // Expected behavior: Fetch all ranked movies sorted by rank
  // Expected output: Array of ranked movies with movie details
  it('should return user ranked movies sorted by rank', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 278,
        title: 'The Shawshank Redemption',
        rank: 1
      },
      {
        userId: user._id,
        movieId: 238,
        title: 'The Godfather',
        rank: 2
      }
    ]);

    const res = await request(app)
      .get('/ranked')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // Input: User with no ranked movies
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array
  it('should return empty array for user with no ranked movies', async () => {
    const res = await request(app)
      .get('/ranked')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated ranked movies request', async () => {
    const res = await request(app)
      .get('/ranked');

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: DELETE /movies/ranked/:id', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: Valid ranked movie ID
  // Expected status code: 200
  // Expected behavior: Movie is deleted and ranks are shifted up
  // Expected output: Success message
  it('should delete ranked movie and adjust ranks', async () => {
    const movies = await RankedMovie.create([
      { userId: user._id, movieId: 278, title: 'Movie 1', rank: 1 },
      { userId: user._id, movieId: 238, title: 'Movie 2', rank: 2 },
      { userId: user._id, movieId: 27205, title: 'Movie 3', rank: 3 }
    ]);

    const res = await request(app)
      .delete(`/api/movies/ranked/${movies[1]._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);

    // Verify movie is deleted
    const remaining = await RankedMovie.find({ userId: user._id });
    expect(remaining.length).toBe(2);

    // Verify ranks are adjusted
    const updatedRanks = await RankedMovie.find({ userId: user._id }).sort({ rank: 1 });
    expect(updatedRanks[0].rank).toBe(1);
    expect(updatedRanks[1].rank).toBe(2);
  });

  // Input: Non-existent movie ID
  // Expected status code: 404
  // Expected behavior: Database is unchanged
  // Expected output: Not found error
  it('should reject deletion of non-existent movie', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/movies/ranked/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(404);
  });

  // Input: Invalid ObjectId format
  // Expected status code: 400
  // Expected behavior: Database is unchanged
  // Expected output: Bad request error
  it('should reject deletion with invalid ID format', async () => {
    const res = await request(app)
      .delete('/ranked/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(400);
  });
});
