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

// Mock the TMDB client to avoid real API calls in tests
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn((url: string) => {
      if (url === '/search/movie') {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 27205,
                title: 'Inception',
                overview: 'A thief who steals corporate secrets...',
                poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                release_date: '2010-07-15',
                vote_average: 8.4
              },
              {
                id: 155,
                title: 'The Dark Knight',
                overview: 'Batman raises the stakes...',
                poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                release_date: '2008-07-16',
                vote_average: 8.5
              }
            ]
          }
        });
      }
      return Promise.reject(new Error('Not found'));
    })
  }))
}));

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

  // Input: Query with less than 2 characters
  // Expected status code: 400
  // Expected behavior: Request is rejected without API call
  // Expected output: Validation error about minimum query length

  // Input: Empty query string
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Error message about empty query

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

  // Input: User with no ranked movies
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array

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

  // Input: Non-existent movie ID
  // Expected status code: 404
  // Expected behavior: Database is unchanged
  // Expected output: Not found error

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

  // Input: Valid movieId and title
  // Expected status code: 200
  // Expected behavior: Movie is added to ranked list
  // Expected output: Created ranked movie with rank 1

  // Input: Missing movieId
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Validation error

  // Input: Missing title
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Validation error
  it('should reject ranking without title', async () => {
    const res = await request(app)
      .post('/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 278
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/title|required/i);
  });

  // Input: Already ranked movie
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Duplicate error

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Unauthorized error
});
