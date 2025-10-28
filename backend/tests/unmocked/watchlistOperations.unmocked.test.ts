/**
 * Watchlist Operations API Tests - Unmocked
 * Additional tests for watchlist routes to increase coverage
 * Tests: POST /watchlist, DELETE /watchlist/:movieId, GET /watchlist
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import watchlistRoutes from '../../src/routes/watchlistRoutes';
import User from '../../src/models/user/User';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Unmocked: POST /watchlist - Additional Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/watchlist', watchlistRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: Valid movie with all fields
  // Expected status code: 201
  // Expected behavior: Movie added to watchlist
  // Expected output: Success message with watchlist item
  it('should add movie to watchlist with all fields', async () => {
    const res = await request(app)
      .post('/api/watchlist')
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
    expect(res.body.success).toStrictEqual(true);
    expect(res.body.watchlistItem).toBeDefined();
    expect(res.body.watchlistItem.movieId).toStrictEqual(mockMovies.inception.id);

    const watchlistItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.inception.id
    });
    expect(watchlistItem).toBeDefined();
    expect(watchlistItem!.title).toStrictEqual(mockMovies.inception.title);
  });

  // Input: Valid movie with only required fields
  // Expected status code: 201
  // Expected behavior: Movie added to watchlist
  // Expected output: Success message
  it('should add movie with only required fields', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(201);

    const watchlistItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.inception.id
    });
    expect(watchlistItem).toBeDefined();
  });

  // Input: Duplicate movie (already in watchlist)
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Error message about duplicate
  it('should reject duplicate movie in watchlist', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/already|watchlist/i);
  });

  // Input: Missing movieId
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject missing movieId', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: Missing title
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject missing title', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: Missing year
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject missing year', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: Missing posterUrl
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject missing posterUrl', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year
      });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated watchlist addition', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    expect(res.status).toStrictEqual(401);
  });

  // Input: Multiple movies added to watchlist
  // Expected status code: 201 for each
  // Expected behavior: All movies added separately
  // Expected output: Success for all
  it('should add multiple movies to watchlist', async () => {
    const res1 = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        year: mockMovies.inception.year,
        posterUrl: mockMovies.inception.posterUrl
      });

    const res2 = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.darkKnight.id,
        title: mockMovies.darkKnight.title,
        year: mockMovies.darkKnight.year,
        posterUrl: mockMovies.darkKnight.posterUrl
      });

    const res3 = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: mockMovies.interstellar.id,
        title: mockMovies.interstellar.title,
        year: mockMovies.interstellar.year,
        posterUrl: mockMovies.interstellar.posterUrl
      });

    expect(res1.status).toStrictEqual(201);
    expect(res2.status).toStrictEqual(201);
    expect(res3.status).toStrictEqual(201);

    const count = await WatchlistItem.countDocuments({ userId: user._id });
    expect(count).toStrictEqual(3);
  });
});

describe('Unmocked: DELETE /watchlist/:movieId - Additional Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/watchlist', watchlistRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: Delete existing watchlist item
  // Expected status code: 200
  // Expected behavior: Movie removed from watchlist
  // Expected output: Success message
  it('should delete movie from watchlist', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    const res = await request(app)
      .delete(`/api/watchlist/${mockMovies.inception.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toStrictEqual(true);

    const watchlistItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.inception.id
    });
    expect(watchlistItem).toBeNull();
  });

  // Input: Delete non-existent watchlist item
  // Expected status code: 404
  // Expected behavior: Item not found
  // Expected output: Error message
  it('should return 404 for non-existent movie', async () => {
    const res = await request(app)
      .delete('/api/watchlist/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(404);
  });

  // Input: Delete after adding multiple movies
  // Expected status code: 200
  // Expected behavior: Only specified movie removed
  // Expected output: Success message
  it('should delete only specified movie from watchlist', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    await WatchlistItem.create({
      userId: user._id,
      movieId: mockMovies.darkKnight.id,
      title: mockMovies.darkKnight.title,
      year: mockMovies.darkKnight.year,
      posterUrl: mockMovies.darkKnight.posterUrl
    });

    const res = await request(app)
      .delete(`/api/watchlist/${mockMovies.inception.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);

    const deletedItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.inception.id
    });
    expect(deletedItem).toBeNull();

    const remainingItem = await WatchlistItem.findOne({
      userId: user._id,
      movieId: mockMovies.darkKnight.id
    });
    expect(remainingItem).toBeDefined();
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated delete request', async () => {
    const res = await request(app)
      .delete(`/api/watchlist/${mockMovies.inception.id}`);

    expect(res.status).toStrictEqual(401);
  });

  // Input: Invalid movieId format
  // Expected status code: 404 or 400
  // Expected behavior: Validation or not found error
  // Expected output: Error message
  it('should handle invalid movieId format', async () => {
    const res = await request(app)
      .delete('/api/watchlist/invalid-movie-id')
      .set('Authorization', `Bearer ${token}`);

    expect([400, 404]).toContain(res.status);
  });
});

describe('Unmocked: GET /watchlist - Additional Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/watchlist', watchlistRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });
    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: User with multiple watchlist items
  // Expected status code: 200
  // Expected behavior: Return all watchlist items
  // Expected output: Array of watchlist items
  it('should get multiple watchlist items', async () => {
    await WatchlistItem.create({
      userId: user1._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    await WatchlistItem.create({
      userId: user1._id,
      movieId: mockMovies.darkKnight.id,
      title: mockMovies.darkKnight.title,
      year: mockMovies.darkKnight.year,
      posterUrl: mockMovies.darkKnight.posterUrl
    });

    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body.watchlist || res.body)).toBe(true);
    const watchlist = res.body.watchlist || res.body;
    expect(watchlist.length).toStrictEqual(2);
  });

  // Input: User isolation test
  // Expected status code: 200
  // Expected behavior: Only return authenticated user's watchlist
  // Expected output: User1's watchlist only
  it('should return only authenticated user watchlist', async () => {
    await WatchlistItem.create({
      userId: user1._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl
    });

    await WatchlistItem.create({
      userId: user2._id,
      movieId: mockMovies.darkKnight.id,
      title: mockMovies.darkKnight.title,
      year: mockMovies.darkKnight.year,
      posterUrl: mockMovies.darkKnight.posterUrl
    });

    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
    const watchlist = res.body.watchlist || res.body;
    expect(watchlist.length).toStrictEqual(1);
    expect(watchlist[0].movieId).toStrictEqual(mockMovies.inception.id);
  });

  // Input: Empty watchlist
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array
  it('should return empty array for empty watchlist', async () => {
    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
    const watchlist = res.body.watchlist || res.body;
    expect(Array.isArray(watchlist)).toBe(true);
    expect(watchlist.length).toStrictEqual(0);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated get watchlist request', async () => {
    const res = await request(app)
      .get('/api/watchlist');

    expect(res.status).toStrictEqual(401);
  });

  // Input: Watchlist with all movie fields
  // Expected status code: 200
  // Expected behavior: Return all movie details
  // Expected output: Complete movie objects
  it('should return complete movie details in watchlist', async () => {
    await WatchlistItem.create({
      userId: user1._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      year: mockMovies.inception.year,
      posterUrl: mockMovies.inception.posterUrl,
      rating: mockMovies.inception.rating,
      actors: mockMovies.inception.actors,
      overview: mockMovies.inception.overview
    });

    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
    const watchlist = res.body.watchlist || res.body;
    expect(watchlist[0].title).toStrictEqual(mockMovies.inception.title);
    expect(watchlist[0].year).toStrictEqual(mockMovies.inception.year);
    expect(watchlist[0].rating).toStrictEqual(mockMovies.inception.rating);
  });
});
