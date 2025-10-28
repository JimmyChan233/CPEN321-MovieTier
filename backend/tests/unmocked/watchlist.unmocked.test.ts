/**
 * Watchlist API Tests - Unmocked
 * Tests: GET /watchlist, POST /watchlist, DELETE /watchlist/:movieId
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import watchlistRoutes from '../../src/routes/watchlistRoutes';
import User from '../../src/models/user/User';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: GET /watchlist', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', watchlistRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: User with watchlist items
  // Expected status code: 200
  // Expected behavior: Return all watchlist items
  // Expected output: Array of watchlist items
  it('should return user watchlist', async () => {
    await WatchlistItem.create([
      {
        userId: user._id,
        movieId: 278,
        title: 'The Shawshank Redemption',
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 238,
        title: 'The Godfather',
        posterPath: '/path2.jpg'
      }
    ]);

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // Input: User with empty watchlist
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array
  it('should return empty watchlist', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated watchlist request', async () => {
    const res = await request(app)
      .get('/');

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: POST /watchlist', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', watchlistRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: Valid movie data
  // Expected status code: 201
  // Expected behavior: Movie is added to watchlist
  // Expected output: Created watchlist item
  it('should successfully add movie to watchlist', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 278,
        title: 'The Shawshank Redemption',
        posterPath: '/path.jpg',
        overview: 'A great movie'
      });

    expect(res.status).toStrictEqual(201);

    // Verify item was added
    const item = await WatchlistItem.findOne({ movieId: 278, userId: user._id });
    expect(item).toBeDefined();
  });

  // Input: Duplicate movie (already in watchlist)
  // Expected status code: 409
  // Expected behavior: Database unchanged
  // Expected output: Duplicate error
  it('should reject duplicate watchlist item', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: 278,
      title: 'The Shawshank Redemption',
      posterPath: '/path.jpg'
    });

    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 278,
        title: 'The Shawshank Redemption'
      });

    expect(res.status).toStrictEqual(409);
  });

  // Input: Missing required fields
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Validation error
  it('should reject incomplete watchlist entry', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'The Shawshank Redemption' });

    expect(res.status).toStrictEqual(400);
  });
});

describe('Unmocked: DELETE /watchlist/:movieId', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', watchlistRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WatchlistItem.deleteMany({});
  });

  // Input: Valid movie ID in watchlist
  // Expected status code: 200
  // Expected behavior: Item is removed
  // Expected output: Success message
  it('should successfully remove movie from watchlist', async () => {
    await WatchlistItem.create({
      userId: user._id,
      movieId: 278,
      title: 'The Shawshank Redemption'
    });

    const res = await request(app)
      .delete('/278')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);

    // Verify item was deleted
    const item = await WatchlistItem.findOne({ movieId: 278, userId: user._id });
    expect(item).toBeNull();
  });

  // Input: Non-existent movie ID
  // Expected status code: 404
  // Expected behavior: Database unchanged
  // Expected output: Not found error
  it('should reject removal of non-existent watchlist item', async () => {
    const res = await request(app)
      .delete('/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(404);
  });
});
